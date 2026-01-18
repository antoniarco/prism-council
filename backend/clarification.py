"""Clarification-first mode orchestration."""

import json
import re
from typing import Dict, Any, List, Optional
from . import config
from .openrouter import query_model


def _extract_json_from_markdown(text: str) -> str:
    """
    Extract JSON from markdown code blocks if present.
    Handles formats like:
    ```json
    {...}
    ```
    or just
    ```
    {...}
    ```
    """
    # Try to extract JSON from markdown code blocks
    patterns = [
        r'```json\s*\n(.*?)\n```',  # ```json ... ```
        r'```\s*\n(.*?)\n```',       # ``` ... ```
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            return match.group(1).strip()
    
    # No markdown blocks found, return as-is
    return text.strip()


async def start_clarification(
    user_query: str,
    context_content: Optional[str] = None,
    role_description: Optional[str] = None
) -> Dict[str, Any]:
    """
    Start the clarification phase by generating the first question.
    
    Args:
        user_query: The user's initial question/request
        context_content: Optional context background
        role_description: Optional role/persona
        
    Returns:
        Dict with question and metadata
    """
    
    # Build the analyst prompt
    prompt = _build_clarification_prompt(
        user_query=user_query,
        context_content=context_content,
        role_description=role_description,
        clarification_history=[],
        is_first_question=True
    )
    
    # Call the analyst model
    response = await query_model(
        model=config.ANALYST_MODEL,
        messages=[{"role": "user", "content": prompt}]
    )
    
    if not response or not response.get('content'):
        raise Exception("Failed to get response from analyst model")
    
    response_text = response['content']
    
    # Extract JSON from markdown if present
    json_text = _extract_json_from_markdown(response_text)
    
    # Parse the response
    try:
        parsed = json.loads(json_text)
        return {
            "question": parsed.get("question", response_text),
            "required": parsed.get("required", True),
            "rationale": parsed.get("rationale"),
            "question_number": 1
        }
    except json.JSONDecodeError:
        # Fallback if not JSON
        return {
            "question": response_text,
            "required": True,
            "rationale": None,
            "question_number": 1
        }


async def process_clarification_answer(
    user_query: str,
    clarification_history: List[Dict[str, Any]],
    new_answer: str,
    context_content: Optional[str] = None,
    role_description: Optional[str] = None,
    max_rounds: int = 5
) -> Dict[str, Any]:
    """
    Process a clarification answer and generate next question or briefing.
    
    Args:
        user_query: The original user question
        clarification_history: List of previous Q&A pairs
        new_answer: The user's answer to the last question
        context_content: Optional context background
        role_description: Optional role/persona
        max_rounds: Maximum number of clarification rounds
        
    Returns:
        Dict with either next question or briefing summary
    """
    
    # Add the new answer to history
    updated_history = clarification_history + [new_answer]
    
    # Check if we've reached the limit
    should_complete = len(updated_history) >= max_rounds
    
    # Build the prompt
    prompt = _build_clarification_prompt(
        user_query=user_query,
        context_content=context_content,
        role_description=role_description,
        clarification_history=updated_history,
        is_first_question=False,
        should_complete=should_complete
    )
    
    # Call the analyst model
    response = await query_model(
        model=config.ANALYST_MODEL,
        messages=[{"role": "user", "content": prompt}]
    )
    
    if not response or not response.get('content'):
        raise Exception("Failed to get response from analyst model")
    
    response_text = response['content']
    
    # Extract JSON from markdown if present
    json_text = _extract_json_from_markdown(response_text)
    
    # Parse the response
    try:
        parsed = json.loads(json_text)
        
        if parsed.get("type") == "briefing" or should_complete:
            # We have a briefing summary
            return {
                "type": "briefing",
                "briefing": parsed.get("briefing", response_text),
                "objective": parsed.get("objective"),
                "key_facts": parsed.get("key_facts", []),
                "constraints": parsed.get("constraints", []),
                "unknowns": parsed.get("unknowns", []),
                "assumptions": parsed.get("assumptions", [])
            }
        else:
            # We have another question
            return {
                "type": "question",
                "question": parsed.get("question", response_text),
                "required": parsed.get("required", False),
                "rationale": parsed.get("rationale"),
                "question_number": len(updated_history) + 1
            }
    except json.JSONDecodeError:
        # Fallback: treat as briefing if we should complete
        if should_complete:
            return {
                "type": "briefing",
                "briefing": response_text,
                "objective": None,
                "key_facts": [],
                "constraints": [],
                "unknowns": [],
                "assumptions": []
            }
        else:
            return {
                "type": "question",
                "question": response_text,
                "required": False,
                "rationale": None,
                "question_number": len(updated_history) + 1
            }


def _build_clarification_prompt(
    user_query: str,
    context_content: Optional[str],
    role_description: Optional[str],
    clarification_history: List[str],
    is_first_question: bool,
    should_complete: bool = False
) -> str:
    """Build the prompt for the analyst model."""
    
    prompt = "You are the Analyst in a Clarification-First system. Your job is to clarify the user's request before any analysis begins.\n\n"
    
    # Add role if present
    if role_description:
        prompt += f"ROLE TO ADOPT:\n{role_description}\n\n"
    
    # Add context if present
    if context_content:
        prompt += f"BACKGROUND CONTEXT:\n{context_content}\n\n"
    
    # Add user's original query
    prompt += f"USER'S ORIGINAL REQUEST:\n{user_query}\n\n"
    
    # Add clarification history
    if clarification_history:
        prompt += "CLARIFICATION HISTORY:\n"
        for i, answer in enumerate(clarification_history, 1):
            prompt += f"Q{i} Answer: {answer}\n"
        prompt += "\n"
    
    if is_first_question:
        prompt += """YOUR TASK:
Generate ONE focused clarifying question that will materially affect the outcome.

RULES:
- Ask only about information that significantly impacts the solution
- Do NOT propose solutions or strategies
- Do NOT ask generic or obvious questions
- Keep the question clear and concise
- Indicate if the question is required or optional

RESPONSE FORMAT (JSON):
{
  "question": "Your clarifying question here",
  "required": true/false,
  "rationale": "Brief explanation of why this matters (optional)"
}
"""
    elif should_complete:
        prompt += """YOUR TASK:
You have reached the maximum number of clarification rounds. Generate a comprehensive BRIEFING SUMMARY.

The briefing must include:
1. The objective or goal
2. Key facts provided by the user
3. Constraints and boundaries
4. Open unknowns
5. Assumptions being made (if any)

RESPONSE FORMAT (JSON):
{
  "type": "briefing",
  "briefing": "Complete briefing summary as formatted text",
  "objective": "Clear statement of the goal",
  "key_facts": ["fact 1", "fact 2", ...],
  "constraints": ["constraint 1", "constraint 2", ...],
  "unknowns": ["unknown 1", "unknown 2", ...],
  "assumptions": ["assumption 1", "assumption 2", ...]
}
"""
    else:
        prompt += f"""YOUR TASK:
Based on the clarification history, decide:
1. If you need ONE more clarifying question, OR
2. If you have enough information to create a briefing summary

You have asked {len(clarification_history)} question(s) so far. Maximum is {config.MAX_CLARIFICATION_ROUNDS}.

RESPONSE FORMAT (JSON):
If asking another question:
{{
  "type": "question",
  "question": "Your next clarifying question",
  "required": true/false,
  "rationale": "Why this matters (optional)"
}}

If ready for briefing:
{{
  "type": "briefing",
  "briefing": "Complete briefing summary as formatted text",
  "objective": "Clear statement of the goal",
  "key_facts": ["fact 1", "fact 2", ...],
  "constraints": ["constraint 1", "constraint 2", ...],
  "unknowns": ["unknown 1", "unknown 2", ...],
  "assumptions": ["assumption 1", "assumption 2", ...]
}}
"""
    
    return prompt

