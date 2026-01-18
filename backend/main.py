"""FastAPI backend for PRISM Council."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid
import json
import asyncio
import logging

from . import storage
from . import context_storage
from . import role_storage
from . import settings_storage
from . import config
from . import clarification
from . import openrouter
from . import model_picker
from .council import run_full_council, generate_conversation_title, stage1_collect_responses, stage2_collect_rankings, stage3_synthesize_final, calculate_aggregate_rankings


def build_conversation_history(conversation: Dict[str, Any]) -> List[Dict[str, str]]:
    """
    Build conversation history from stored conversation.
    Uses stage3 final responses for assistant messages to keep context manageable.

    Args:
        conversation: Conversation dict with messages

    Returns:
        List of message dicts with 'role' and 'content' keys
    """
    history = []
    for msg in conversation.get("messages", []):
        if msg["role"] == "user":
            history.append({
                "role": "user",
                "content": msg["content"]
            })
        elif msg["role"] == "assistant" and msg.get("stage3"):
            # Use the final synthesized response from the chairman
            history.append({
                "role": "assistant",
                "content": msg["stage3"].get("response", "")
            })
    return history


# Setup logger
logger = logging.getLogger(__name__)

app = FastAPI(title="PRISM Council API")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CreateConversationRequest(BaseModel):
    """Request to create a new conversation."""
    context_id: Optional[str] = None  # Optional context to attach
    role_id: Optional[str] = None  # Optional role to attach


class SendMessageRequest(BaseModel):
    """Request to send a message in a conversation."""
    content: str


class ClarificationAnswerRequest(BaseModel):
    """Request to submit a clarification answer."""
    answer: str


class ConversationMetadata(BaseModel):
    """Conversation metadata for list view."""
    id: str
    created_at: str
    title: str
    message_count: int


class Conversation(BaseModel):
    """Full conversation with all messages."""
    id: str
    created_at: str
    title: str
    messages: List[Dict[str, Any]]
    context_snapshot: Optional[Dict[str, Any]] = None
    role_snapshot: Optional[Dict[str, Any]] = None


class Context(BaseModel):
    """Context definition."""
    id: str
    name: str
    content: str
    created_at: str
    updated_at: str


class CreateContextRequest(BaseModel):
    """Request to create a new context."""
    name: str
    content: str


class UpdateContextRequest(BaseModel):
    """Request to update a context."""
    name: Optional[str] = None
    content: Optional[str] = None


class Role(BaseModel):
    """Role definition (persona)."""
    id: str
    name: str
    description: str
    created_at: str
    updated_at: str


class CreateRoleRequest(BaseModel):
    """Request to create a new role."""
    name: str
    description: str


class UpdateRoleRequest(BaseModel):
    """Request to update a role."""
    name: Optional[str] = None
    description: Optional[str] = None


class Settings(BaseModel):
    """Application settings."""
    council_models: List[str]
    chairman_model: str
    openrouter_api_key: Optional[str] = None
    clarification_first_enabled: bool = False
    analyst_model: str = "anthropic/claude-sonnet-4.5"
    max_clarification_rounds: int = 5
    updated_at: Optional[str] = None


class UpdateSettingsRequest(BaseModel):
    """Request to update settings."""
    council_models: Optional[List[str]] = None
    chairman_model: Optional[str] = None
    openrouter_api_key: Optional[str] = None
    clarification_first_enabled: Optional[bool] = None
    analyst_model: Optional[str] = None
    max_clarification_rounds: Optional[int] = None


class ModelPickingRequest(BaseModel):
    """Request for dynamic model picking."""
    clarified_prompt: str
    context_content: Optional[str] = None
    role_description: Optional[str] = None
    mode: str  # "max_stakes", "max_stakes_optimized", "max_cultural_biases", "cheapest"
    num_models: int


class UpdateModelSelectionRequest(BaseModel):
    """Request to update model selection in a conversation."""
    models: List[str]
    mode: str
    rationales: Dict[str, str]


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "PRISM Council API"}


@app.get("/api/contexts", response_model=List[Context])
async def list_contexts():
    """List all contexts."""
    return context_storage.list_contexts()


@app.post("/api/contexts", response_model=Context)
async def create_context(request: CreateContextRequest):
    """Create a new context."""
    context_id = str(uuid.uuid4())
    context = context_storage.create_context(context_id, request.name, request.content)
    return context


@app.get("/api/contexts/{context_id}", response_model=Context)
async def get_context(context_id: str):
    """Get a specific context."""
    context = context_storage.get_context(context_id)
    if context is None:
        raise HTTPException(status_code=404, detail="Context not found")
    return context


@app.put("/api/contexts/{context_id}", response_model=Context)
async def update_context(context_id: str, request: UpdateContextRequest):
    """Update a context."""
    context = context_storage.update_context(
        context_id,
        name=request.name,
        content=request.content
    )
    if context is None:
        raise HTTPException(status_code=404, detail="Context not found")
    return context


@app.delete("/api/contexts/{context_id}")
async def delete_context(context_id: str):
    """Delete a context."""
    success = context_storage.delete_context(context_id)
    if not success:
        raise HTTPException(status_code=404, detail="Context not found")
    return {"status": "deleted"}


@app.get("/api/roles", response_model=List[Role])
async def list_roles():
    """List all roles."""
    return role_storage.list_roles()


@app.post("/api/roles", response_model=Role)
async def create_role(request: CreateRoleRequest):
    """Create a new role."""
    role_id = str(uuid.uuid4())
    role = role_storage.create_role(role_id, request.name, request.description)
    return role


@app.get("/api/roles/{role_id}", response_model=Role)
async def get_role(role_id: str):
    """Get a specific role."""
    role = role_storage.get_role(role_id)
    if role is None:
        raise HTTPException(status_code=404, detail="Role not found")
    return role


@app.put("/api/roles/{role_id}", response_model=Role)
async def update_role(role_id: str, request: UpdateRoleRequest):
    """Update a role."""
    role = role_storage.update_role(
        role_id,
        name=request.name,
        description=request.description
    )
    if role is None:
        raise HTTPException(status_code=404, detail="Role not found")
    return role


@app.delete("/api/roles/{role_id}")
async def delete_role(role_id: str):
    """Delete a role."""
    success = role_storage.delete_role(role_id)
    if not success:
        raise HTTPException(status_code=404, detail="Role not found")
    return {"status": "deleted"}


@app.get("/api/settings", response_model=Settings)
async def get_settings():
    """Get current application settings."""
    settings = settings_storage.load_settings()
    
    # Mask the API key in the response (only show if it exists)
    if settings.get("openrouter_api_key"):
        # Return a masked version
        return {
            **settings,
            "openrouter_api_key": "********" + settings["openrouter_api_key"][-4:] if len(settings["openrouter_api_key"]) > 4 else "****"
        }
    
    return settings


@app.put("/api/settings", response_model=Settings)
async def update_settings(request: UpdateSettingsRequest):
    """
    Update application settings.
    Changes take effect immediately without requiring restart.
    """
    try:
        # If API key is being updated and it's the masked placeholder, ignore it
        api_key_update = request.openrouter_api_key
        if api_key_update and api_key_update.startswith("********"):
            api_key_update = None  # Don't update if it's the masked version
        
        # Update settings
        settings = settings_storage.update_settings(
            council_models=request.council_models,
            chairman_model=request.chairman_model,
            openrouter_api_key=api_key_update,
            clarification_first_enabled=request.clarification_first_enabled,
            analyst_model=request.analyst_model,
            max_clarification_rounds=request.max_clarification_rounds
        )
        
        # Reload config to apply changes immediately
        config.reload_config()
        
        # Return masked API key
        if settings.get("openrouter_api_key"):
            settings["openrouter_api_key"] = "********" + settings["openrouter_api_key"][-4:] if len(settings["openrouter_api_key"]) > 4 else "****"
        
        return settings
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/models")
async def get_available_models(force_refresh: bool = False):
    """
    Get available models from OpenRouter.
    Results are cached for 1 hour unless force_refresh is True.
    
    Returns:
        List of models with id, name, and provider
    """
    try:
        models = await openrouter.get_available_models(force_refresh=force_refresh)
        return {"models": models}
    except Exception as e:
        logger.error(f"Failed to fetch models: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch available models")


@app.post("/api/pick-models")
async def pick_models(request: ModelPickingRequest):
    """
    Dynamically pick models based on reasoning scope and user-specified mode.
    
    This is an explicit step in the reasoning architecture, not a background optimization.
    """
    try:
        result = await model_picker.pick_models(
            clarified_prompt=request.clarified_prompt,
            context_content=request.context_content,
            role_description=request.role_description,
            mode=request.mode,
            num_models=request.num_models
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to pick models: {e}")
        raise HTTPException(status_code=500, detail="Failed to pick models")


@app.get("/api/conversations", response_model=List[ConversationMetadata])
async def list_conversations():
    """List all conversations (metadata only)."""
    return storage.list_conversations()


@app.post("/api/conversations", response_model=Conversation)
async def create_conversation(request: CreateConversationRequest):
    """Create a new conversation with optional context and role."""
    conversation_id = str(uuid.uuid4())
    
    # If context_id provided, create a snapshot
    context_snapshot = None
    if request.context_id:
        context = context_storage.get_context(request.context_id)
        if context:
            context_snapshot = {
                "id": context["id"],
                "name": context["name"],
                "content": context["content"]
            }
    
    # If role_id provided, create a snapshot
    role_snapshot = None
    if request.role_id:
        role = role_storage.get_role(request.role_id)
        if role:
            role_snapshot = {
                "id": role["id"],
                "name": role["name"],
                "description": role["description"]
            }
    
    conversation = storage.create_conversation(conversation_id, context_snapshot, role_snapshot)
    return conversation


@app.get("/api/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(conversation_id: str):
    """Get a specific conversation with all its messages."""
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@app.put("/api/conversations/{conversation_id}/context")
async def update_conversation_context(conversation_id: str, request: CreateConversationRequest):
    """Update the context of a conversation (only allowed before first message)."""
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Only allow context update if no messages have been sent
    if len(conversation.get("messages", [])) > 0:
        raise HTTPException(status_code=400, detail="Cannot change context after messages have been sent")
    
    # Create context snapshot if context_id provided
    context_snapshot = None
    if request.context_id:
        context = context_storage.get_context(request.context_id)
        if context:
            context_snapshot = {
                "id": context["id"],
                "name": context["name"],
                "content": context["content"]
            }
    
    # Update the conversation
    conversation["context_snapshot"] = context_snapshot
    storage.save_conversation(conversation)
    
    return conversation


@app.put("/api/conversations/{conversation_id}/role")
async def update_conversation_role(conversation_id: str, request: CreateConversationRequest):
    """Update the role of a conversation (only allowed before first message)."""
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Only allow role update if no messages have been sent
    if len(conversation.get("messages", [])) > 0:
        raise HTTPException(status_code=400, detail="Cannot change role after messages have been sent")
    
    # Create role snapshot if role_id provided
    role_snapshot = None
    if request.role_id:
        role = role_storage.get_role(request.role_id)
        if role:
            role_snapshot = {
                "id": role["id"],
                "name": role["name"],
                "description": role["description"]
            }
    
    # Update the conversation
    conversation["role_snapshot"] = role_snapshot
    storage.save_conversation(conversation)
    
    return conversation


@app.put("/api/conversations/{conversation_id}/model-selection")
async def update_conversation_model_selection(conversation_id: str, request: UpdateModelSelectionRequest):
    """Update the model selection for a conversation."""
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Update the model selection
    conversation["model_selection"] = {
        "models": request.models,
        "mode": request.mode,
        "rationales": request.rationales
    }
    storage.save_conversation(conversation)
    
    return {"status": "success", "model_selection": conversation["model_selection"]}


@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a conversation."""
    success = storage.delete_conversation(conversation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "deleted"}


@app.post("/api/conversations/{conversation_id}/message")
async def send_message(conversation_id: str, request: SendMessageRequest):
    """
    Send a message and run the 3-stage council process.
    Returns the complete response with all stages.
    """
    # Check if conversation exists
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check if this is the first message
    is_first_message = len(conversation["messages"]) == 0

    # Build conversation history (before adding new message)
    conversation_history = build_conversation_history(conversation)

    # Extract context from conversation snapshot
    context_content = None
    if conversation.get("context_snapshot"):
        context_content = conversation["context_snapshot"].get("content")

    # Extract role from conversation snapshot
    role_description = None
    if conversation.get("role_snapshot"):
        role_description = conversation["role_snapshot"].get("description")

    # Add user message
    storage.add_user_message(conversation_id, request.content)

    # If this is the first message, generate a title
    if is_first_message:
        title = await generate_conversation_title(request.content)
        storage.update_conversation_title(conversation_id, title)

    # Run the 3-stage council process with conversation history, context, and role
    stage1_results, stage2_results, stage3_result, metadata = await run_full_council(
        request.content,
        conversation_history,
        context_content,
        role_description
    )

    # Add assistant message with all stages
    storage.add_assistant_message(
        conversation_id,
        stage1_results,
        stage2_results,
        stage3_result
    )

    # Return the complete response with metadata
    return {
        "stage1": stage1_results,
        "stage2": stage2_results,
        "stage3": stage3_result,
        "metadata": metadata
    }


@app.post("/api/conversations/{conversation_id}/message/stream")
async def send_message_stream(conversation_id: str, request: SendMessageRequest):
    """
    Send a message and stream the 3-stage council process.
    Returns Server-Sent Events as each stage completes.
    """
    # Check if conversation exists
    conv = storage.get_conversation(conversation_id)
    if conv is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check if this is the first message
    is_first_message = len(conv["messages"]) == 0
    
    # Load settings to check if clarification is enabled
    settings = settings_storage.load_settings()
    clarification_enabled = settings.get("clarification_first_enabled", False)
    
    # Check clarification state
    clarification_state = conv.get("clarification_state")
    clarification_active = clarification_state and clarification_state.get("active", False)
    clarification_complete = clarification_state and not clarification_state.get("active", False)

    async def event_generator():
        try:
            # Reload conversation for the generator scope
            conversation = storage.get_conversation(conversation_id)
            if not conversation:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Conversation not found'})}\n\n"
                return
            
            # Build conversation history (before adding new message)
            conversation_history = build_conversation_history(conversation)

            # Extract context from conversation snapshot
            context_content = None
            if conversation.get("context_snapshot"):
                context_content = conversation["context_snapshot"].get("content")

            # Extract role from conversation snapshot
            role_description = None
            if conversation.get("role_snapshot"):
                role_description = conversation["role_snapshot"].get("description")

            # Add user message
            storage.add_user_message(conversation_id, request.content)

            # Check if we need to start or handle clarification
            if clarification_enabled and is_first_message and not clarification_state:
                # Auto-start clarification for the first message
                yield f"data: {json.dumps({'type': 'clarification_auto_start'})}\n\n"
                
                try:
                    # Start clarification with the user's first message
                    result = await clarification.start_clarification(
                        user_query=request.content,
                        context_content=context_content,
                        role_description=role_description
                    )
                    
                    # Reload and update conversation with clarification state
                    conv_updated = storage.get_conversation(conversation_id)
                    conv_updated["clarification_state"] = {
                        "active": True,
                        "history": [],
                        "current_question": result
                    }
                    storage.save_conversation(conv_updated)
                    
                    yield f"data: {json.dumps({'type': 'clarification_question', 'data': result})}\n\n"
                    return
                except Exception as e:
                    logger.error(f"Failed to start clarification: {e}")
                    import traceback
                    logger.error(traceback.format_exc())
                    yield f"data: {json.dumps({'type': 'error', 'message': 'Failed to start clarification'})}\n\n"
                    return
            
            # If clarification is active but not complete, don't run council
            if clarification_active:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Clarification in progress. Please use clarification endpoints.'})}\n\n"
                return

            # Start title generation in parallel (don't await yet)
            title_task = None
            if is_first_message:
                title_task = asyncio.create_task(generate_conversation_title(request.content))

            # Check if dynamic model selection was used
            selected_models = None
            if conversation.get("model_selection") and conversation["model_selection"].get("models"):
                selected_models = conversation["model_selection"]["models"]
                logger.info(f"Using dynamically selected models: {selected_models}")

            # Stage 1: Collect responses
            yield f"data: {json.dumps({'type': 'stage1_start'})}\n\n"
            stage1_results = await stage1_collect_responses(
                request.content, conversation_history, context_content, role_description, council_models=selected_models
            )
            yield f"data: {json.dumps({'type': 'stage1_complete', 'data': stage1_results})}\n\n"

            # Stage 2: Collect rankings
            yield f"data: {json.dumps({'type': 'stage2_start'})}\n\n"
            stage2_results, label_to_model = await stage2_collect_rankings(
                request.content, stage1_results, conversation_history, context_content, role_description, council_models=selected_models
            )
            aggregate_rankings = calculate_aggregate_rankings(stage2_results, label_to_model)
            yield f"data: {json.dumps({'type': 'stage2_complete', 'data': stage2_results, 'metadata': {'label_to_model': label_to_model, 'aggregate_rankings': aggregate_rankings}})}\n\n"

            # Stage 3: Synthesize final answer
            yield f"data: {json.dumps({'type': 'stage3_start'})}\n\n"
            stage3_result = await stage3_synthesize_final(
                request.content, stage1_results, stage2_results, conversation_history, context_content, role_description
            )
            yield f"data: {json.dumps({'type': 'stage3_complete', 'data': stage3_result})}\n\n"

            # Wait for title generation if it was started
            if title_task:
                title = await title_task
                storage.update_conversation_title(conversation_id, title)
                yield f"data: {json.dumps({'type': 'title_complete', 'data': {'title': title}})}\n\n"

            # Save complete assistant message
            storage.add_assistant_message(
                conversation_id,
                stage1_results,
                stage2_results,
                stage3_result
            )

            # Send completion event
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"

        except Exception as e:
            # Send error event
            logger.error(f"Error in send_message_stream: {e}")
            import traceback
            logger.error(traceback.format_exc())
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@app.post("/api/conversations/{conversation_id}/clarification/start")
async def start_clarification_phase(conversation_id: str):
    """
    Start the clarification phase for a conversation.
    Only works if clarification-first mode is enabled in settings.
    """
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Check if clarification-first is enabled
    if not config.CLARIFICATION_FIRST_ENABLED:
        raise HTTPException(
            status_code=400, 
            detail="Clarification-first mode is not enabled in settings"
        )
    
    # Get the user's initial message (first message in conversation)
    if not conversation.get("messages") or len(conversation["messages"]) == 0:
        raise HTTPException(status_code=400, detail="No initial message found")
    
    first_message = conversation["messages"][0]
    if first_message.get("role") != "user":
        raise HTTPException(status_code=400, detail="First message must be from user")
    
    user_query = first_message.get("content", "")
    
    # Extract context and role
    context_content = None
    if conversation.get("context_snapshot"):
        context_content = conversation["context_snapshot"].get("content")
    
    role_description = None
    if conversation.get("role_snapshot"):
        role_description = conversation["role_snapshot"].get("description")
    
    # Start clarification
    result = await clarification.start_clarification(
        user_query=user_query,
        context_content=context_content,
        role_description=role_description
    )
    
    # Store clarification state in conversation
    if "clarification_state" not in conversation:
        conversation["clarification_state"] = {
            "active": True,
            "history": [],
            "current_question": result
        }
    storage.save_conversation(conversation)
    
    return result


@app.post("/api/conversations/{conversation_id}/clarification/answer")
async def submit_clarification_answer(
    conversation_id: str, 
    request: ClarificationAnswerRequest
):
    """
    Submit an answer to a clarification question.
    Returns either the next question or a briefing summary.
    """
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Check clarification state
    clarification_state = conversation.get("clarification_state")
    if not clarification_state or not clarification_state.get("active"):
        raise HTTPException(status_code=400, detail="Clarification phase not active")
    
    # Get user's initial message
    first_message = conversation["messages"][0]
    user_query = first_message.get("content", "")
    
    # Extract context and role
    context_content = None
    if conversation.get("context_snapshot"):
        context_content = conversation["context_snapshot"].get("content")
    
    role_description = None
    if conversation.get("role_snapshot"):
        role_description = conversation["role_snapshot"].get("description")
    
    # Process the answer (it will add to history internally)
    result = await clarification.process_clarification_answer(
        user_query=user_query,
        clarification_history=clarification_state["history"],
        new_answer=request.answer,
        context_content=context_content,
        role_description=role_description,
        max_rounds=config.MAX_CLARIFICATION_ROUNDS
    )
    
    # Update history with the new answer
    clarification_state["history"].append(request.answer)
    
    # Update state
    if result.get("type") == "briefing":
        # Clarification complete - store briefing
        clarification_state["active"] = False
        clarification_state["briefing"] = result
        clarification_state["completed_at"] = datetime.utcnow().isoformat()
    else:
        # Another question
        clarification_state["current_question"] = result
    
    storage.save_conversation(conversation)
    
    return result


@app.post("/api/conversations/{conversation_id}/clarification/confirm")
async def confirm_clarification_briefing(conversation_id: str):
    """
    Confirm the briefing and proceed to council phase with streaming.
    """
    # Validate conversation and clarification state
    conv = storage.get_conversation(conversation_id)
    if conv is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    clarification_state = conv.get("clarification_state")
    if not clarification_state:
        raise HTTPException(status_code=400, detail="No clarification phase found")
    
    if clarification_state.get("active"):
        raise HTTPException(status_code=400, detail="Clarification phase still active")
    
    if not clarification_state.get("briefing"):
        raise HTTPException(status_code=400, detail="No briefing available")
    
    # Mark as confirmed and save
    clarification_state["confirmed"] = True
    clarification_state["confirmed_at"] = datetime.utcnow().isoformat()
    storage.save_conversation(conv)
    
    # Now run the council process with the briefing context
    async def event_generator():
        try:
            # Reload conversation to ensure we have the latest state
            conversation = storage.get_conversation(conversation_id)
            if not conversation:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Conversation not found'})}\n\n"
                return
            
            # Get clarification state with the briefing
            clarif_state = conversation.get("clarification_state", {})
            
            # Get the first user message
            if not conversation.get("messages") or len(conversation["messages"]) == 0:
                yield f"data: {json.dumps({'type': 'error', 'message': 'No user message found'})}\n\n"
                return
            
            first_message = conversation["messages"][0]
            user_query = first_message.get("content", "")
            
            # Build conversation history (should be empty at this point)
            conversation_history = build_conversation_history(conversation)
            
            # Extract context and role
            context_content = None
            if conversation.get("context_snapshot"):
                context_content = conversation["context_snapshot"].get("content")
            
            role_description = None
            if conversation.get("role_snapshot"):
                role_description = conversation["role_snapshot"].get("description")
            
            # Get the briefing to include in the prompt
            briefing = clarif_state.get("briefing", {})
            briefing_text = briefing.get("briefing", "") if isinstance(briefing, dict) else str(briefing)
            
            # Prepend the briefing to the context
            enriched_context = f"[CLARIFICATION BRIEFING]\n\n{briefing_text}\n\n"
            if context_content:
                enriched_context += f"[ORIGINAL CONTEXT]\n\n{context_content}"
            
            # Check if dynamic model selection was used
            selected_models = None
            if conversation.get("model_selection") and conversation["model_selection"].get("models"):
                selected_models = conversation["model_selection"]["models"]
                logger.info(f"Using dynamically selected models: {selected_models}")
            
            # Stage 1: Collect responses
            yield f"data: {json.dumps({'type': 'stage1_start'})}\n\n"
            stage1_results = await stage1_collect_responses(
                user_query, conversation_history, enriched_context, role_description, council_models=selected_models
            )
            yield f"data: {json.dumps({'type': 'stage1_complete', 'data': stage1_results})}\n\n"
            
            # Stage 2: Collect rankings
            yield f"data: {json.dumps({'type': 'stage2_start'})}\n\n"
            stage2_results, label_to_model = await stage2_collect_rankings(
                user_query, stage1_results, conversation_history, enriched_context, role_description, council_models=selected_models
            )
            aggregate_rankings = calculate_aggregate_rankings(stage2_results, label_to_model)
            yield f"data: {json.dumps({'type': 'stage2_complete', 'data': stage2_results, 'metadata': {'label_to_model': label_to_model, 'aggregate_rankings': aggregate_rankings}})}\n\n"
            
            # Stage 3: Synthesize final answer
            yield f"data: {json.dumps({'type': 'stage3_start'})}\n\n"
            stage3_result = await stage3_synthesize_final(
                user_query, stage1_results, stage2_results, conversation_history, enriched_context, role_description
            )
            yield f"data: {json.dumps({'type': 'stage3_complete', 'data': stage3_result})}\n\n"
            
            # Save the assistant message
            storage.add_assistant_message(
                conversation_id,
                stage1_results,
                stage2_results,
                stage3_result
            )
            
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"
            
        except Exception as e:
            logger.error(f"Error in council process after clarification: {e}")
            import traceback
            logger.error(traceback.format_exc())
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=True)
