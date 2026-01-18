"""
Dynamic Model Picker for PRISM.

Selects appropriate models based on reasoning scope and user-specified mode.
This is an explicit, visible step in the reasoning architecture.
"""

from typing import List, Dict, Any, Optional
from . import openrouter


async def pick_models(
    clarified_prompt: str,
    context_content: Optional[str],
    role_description: Optional[str],
    mode: str,
    num_models: int
) -> Dict[str, Any]:
    """
    Pick models for multi-model reasoning based on clarified prompt and selection mode.
    
    Args:
        clarified_prompt: The clarified user query (post-clarification or raw)
        context_content: Optional context background
        role_description: Optional role persona
        mode: One of: "max_stakes", "max_stakes_optimized", "max_cultural_biases", "cheapest"
        num_models: Number of models to select (minimum 3)
        
    Returns:
        Dict with:
            - models: List of selected model IDs
            - rationales: Dict mapping model ID to selection rationale (1 line)
            - mode_used: The mode that was applied
    """
    # Ensure minimum model count
    if num_models < 3:
        num_models = 3
    
    # Fetch available models
    available_models = await openrouter.get_available_models()
    
    if not available_models or len(available_models) == 0:
        raise ValueError("No models available from OpenRouter")
    
    # Apply selection strategy based on mode
    if mode == "max_stakes":
        return await _pick_max_stakes(available_models, num_models, clarified_prompt)
    elif mode == "max_stakes_optimized":
        return await _pick_max_stakes_optimized(available_models, num_models, clarified_prompt)
    elif mode == "max_cultural_biases":
        return await _pick_max_cultural_biases(available_models, num_models, clarified_prompt)
    elif mode == "cheapest":
        return await _pick_cheapest(available_models, num_models, clarified_prompt)
    else:
        raise ValueError(f"Unknown selection mode: {mode}")


async def _pick_max_stakes(
    available_models: List[Dict[str, Any]],
    num_models: int,
    clarified_prompt: str
) -> Dict[str, Any]:
    """
    Select the strongest available models regardless of cost.
    Prioritizes flagship models from top providers.
    """
    # Define flagship/premium model patterns (highest capability)
    flagship_keywords = [
        'gpt-4-turbo', 'gpt-4o', 'claude-3-opus', 'claude-3.5-sonnet',
        'gemini-1.5-pro', 'gemini-2.0', 'o1-preview', 'o1-mini',
        'llama-3.3-70b', 'mistral-large', 'command-r-plus'
    ]
    
    # Score models based on flagship status
    scored = []
    for model in available_models:
        model_id_lower = model['id'].lower()
        score = 0
        
        # Check for flagship keywords
        for keyword in flagship_keywords:
            if keyword in model_id_lower:
                score += 10
                break
        
        # Prefer known premium providers
        if model['provider'].lower() in ['openai', 'anthropic', 'google']:
            score += 5
        
        scored.append((model, score))
    
    # Sort by score descending
    scored.sort(key=lambda x: x[1], reverse=True)
    
    # Select top N
    selected_models = [item[0] for item in scored[:num_models]]
    
    # Generate rationales
    rationales = {}
    for model in selected_models:
        rationales[model['id']] = f"Flagship model from {model['provider']} for maximum capability"
    
    return {
        'models': [m['id'] for m in selected_models],
        'rationales': rationales,
        'mode_used': 'max_stakes'
    }


async def _pick_max_stakes_optimized(
    available_models: List[Dict[str, Any]],
    num_models: int,
    clarified_prompt: str
) -> Dict[str, Any]:
    """
    Select high-quality models while optimizing for cost.
    Balance capability with efficiency.
    """
    # Define strong but cost-effective model patterns
    optimal_keywords = [
        'gpt-4o-mini', 'claude-3.5-haiku', 'claude-3-haiku',
        'gemini-1.5-flash', 'llama-3.1-70b', 'llama-3.3-70b',
        'mistral-medium', 'command-r'
    ]
    
    scored = []
    for model in available_models:
        model_id_lower = model['id'].lower()
        score = 0
        
        # Check for optimal keywords
        for keyword in optimal_keywords:
            if keyword in model_id_lower:
                score += 10
                break
        
        # Prefer known providers with good cost/performance
        if model['provider'].lower() in ['anthropic', 'google', 'meta']:
            score += 5
        
        scored.append((model, score))
    
    scored.sort(key=lambda x: x[1], reverse=True)
    selected_models = [item[0] for item in scored[:num_models]]
    
    rationales = {}
    for model in selected_models:
        rationales[model['id']] = f"High-quality model from {model['provider']} optimized for cost"
    
    return {
        'models': [m['id'] for m in selected_models],
        'rationales': rationales,
        'mode_used': 'max_stakes_optimized'
    }


async def _pick_max_cultural_biases(
    available_models: List[Dict[str, Any]],
    num_models: int,
    clarified_prompt: str
) -> Dict[str, Any]:
    """
    Select highly differentiated models to surface bias and disagreement.
    Maximize provider, architecture, and training diversity.
    """
    # Group models by provider to ensure diversity
    by_provider = {}
    for model in available_models:
        provider = model['provider']
        if provider not in by_provider:
            by_provider[provider] = []
        by_provider[provider].append(model)
    
    # Select one representative from each provider (round-robin)
    selected_models = []
    providers_list = list(by_provider.keys())
    
    idx = 0
    while len(selected_models) < num_models and providers_list:
        provider = providers_list[idx % len(providers_list)]
        
        if by_provider[provider]:
            # Pick the first available model from this provider
            model = by_provider[provider].pop(0)
            selected_models.append(model)
        else:
            # No more models from this provider
            providers_list.remove(provider)
        
        idx += 1
    
    # If still need more, fill with any remaining
    if len(selected_models) < num_models:
        remaining = [m for models in by_provider.values() for m in models]
        selected_models.extend(remaining[:num_models - len(selected_models)])
    
    rationales = {}
    for model in selected_models:
        rationales[model['id']] = f"Diverse perspective from {model['provider']} to surface bias"
    
    return {
        'models': [m['id'] for m in selected_models],
        'rationales': rationales,
        'mode_used': 'max_cultural_biases'
    }


async def _pick_cheapest(
    available_models: List[Dict[str, Any]],
    num_models: int,
    clarified_prompt: str
) -> Dict[str, Any]:
    """
    Select the lowest-cost models suitable for the task.
    Prioritize efficiency over capability.
    """
    # Define known low-cost model patterns
    budget_keywords = [
        'gpt-3.5', 'gpt-4o-mini', 'claude-3-haiku',
        'gemini-1.5-flash', 'llama-3.1-8b', 'llama-3.2',
        'mistral-7b', 'phi-3'
    ]
    
    scored = []
    for model in available_models:
        model_id_lower = model['id'].lower()
        score = 0
        
        # Check for budget keywords
        for keyword in budget_keywords:
            if keyword in model_id_lower:
                score += 10
                break
        
        # Prefer smaller models (indicated by parameter count in name)
        if any(size in model_id_lower for size in ['7b', '8b', '13b', 'mini', 'small', 'flash']):
            score += 5
        
        scored.append((model, score))
    
    scored.sort(key=lambda x: x[1], reverse=True)
    selected_models = [item[0] for item in scored[:num_models]]
    
    rationales = {}
    for model in selected_models:
        rationales[model['id']] = f"Cost-efficient model from {model['provider']}"
    
    return {
        'models': [m['id'] for m in selected_models],
        'rationales': rationales,
        'mode_used': 'cheapest'
    }








