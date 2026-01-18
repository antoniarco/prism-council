"""JSON-based storage for conversations."""

import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
from .config import DATA_DIR


def ensure_data_dir():
    """Ensure the data directory exists."""
    Path(DATA_DIR).mkdir(parents=True, exist_ok=True)


def get_conversation_path(conversation_id: str) -> str:
    """Get the file path for a conversation."""
    return os.path.join(DATA_DIR, f"{conversation_id}.json")


def create_conversation(
    conversation_id: str,
    context_snapshot: Dict[str, Any] = None,
    role_snapshot: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Create a new conversation.

    Args:
        conversation_id: Unique identifier for the conversation
        context_snapshot: Optional context snapshot (id, name, content)
        role_snapshot: Optional role snapshot (id, name, description)

    Returns:
        New conversation dict
    """
    ensure_data_dir()

    conversation = {
        "id": conversation_id,
        "created_at": datetime.utcnow().isoformat(),
        "title": "New reasoning",
        "messages": [],
        "context_snapshot": context_snapshot,  # Stores context at creation time
        "role_snapshot": role_snapshot  # Stores role at creation time
    }

    # Save to file
    path = get_conversation_path(conversation_id)
    with open(path, 'w') as f:
        json.dump(conversation, f, indent=2)

    return conversation


def get_conversation(conversation_id: str) -> Optional[Dict[str, Any]]:
    """
    Load a conversation from storage.

    Args:
        conversation_id: Unique identifier for the conversation

    Returns:
        Conversation dict or None if not found
    """
    path = get_conversation_path(conversation_id)

    if not os.path.exists(path):
        return None

    with open(path, 'r') as f:
        return json.load(f)


def save_conversation(conversation: Dict[str, Any]):
    """
    Save a conversation to storage.

    Args:
        conversation: Conversation dict to save
    """
    ensure_data_dir()

    path = get_conversation_path(conversation['id'])
    with open(path, 'w') as f:
        json.dump(conversation, f, indent=2)


def list_conversations() -> List[Dict[str, Any]]:
    """
    List all conversations (metadata only).

    Returns:
        List of conversation metadata dicts
    """
    ensure_data_dir()

    conversations = []
    for filename in os.listdir(DATA_DIR):
        if filename.endswith('.json'):
            path = os.path.join(DATA_DIR, filename)
            with open(path, 'r') as f:
                data = json.load(f)
                # Return metadata only
                title = (data.get("title") or "").strip()
                if title in ("New Conversation", "New reasoning", ""):
                    # Derive a stable fallback title from the first user prompt (if any)
                    first_user = ""
                    for msg in data.get("messages", []):
                        if msg.get("role") == "user":
                            first_user = (msg.get("content") or "").strip()
                            break

                    if first_user:
                        # Use first non-empty line, strip common filler, cap length.
                        line = next((ln.strip() for ln in first_user.splitlines() if ln.strip()), "")
                        for prefix in ("help me", "i want", "please", "can you", "could you", "i need"):
                            if line.lower().startswith(prefix):
                                line = line[len(prefix):].lstrip(" :,-")
                                break
                        title = line[:60].rstrip()
                        if len(line) > 60:
                            title += "…"
                    else:
                        title = "Untitled reasoning"

                # Updated time from file mtime (document-archive semantics)
                try:
                    mtime = os.path.getmtime(path)
                    updated_at = datetime.utcfromtimestamp(mtime).isoformat()
                except Exception:
                    updated_at = data.get("created_at")
                conversations.append({
                    "id": data["id"],
                    "created_at": data["created_at"],
                    "updated_at": updated_at,
                    "title": title,
                    "message_count": len(data["messages"])
                })

    # Sort by most recently updated, newest first
    conversations.sort(key=lambda x: x.get("updated_at") or x["created_at"], reverse=True)

    return conversations


def add_user_message(conversation_id: str, content: str):
    """
    Add a user message to a conversation.

    Args:
        conversation_id: Conversation identifier
        content: User message content
    """
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise ValueError(f"Conversation {conversation_id} not found")

    conversation["messages"].append({
        "role": "user",
        "content": content
    })

    save_conversation(conversation)


def add_assistant_message(
    conversation_id: str,
    stage1: List[Dict[str, Any]],
    stage2: List[Dict[str, Any]],
    stage3: Dict[str, Any]
):
    """
    Add an assistant message with all 3 stages to a conversation.

    Args:
        conversation_id: Conversation identifier
        stage1: List of individual model responses
        stage2: List of model rankings
        stage3: Final synthesized response
    """
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise ValueError(f"Conversation {conversation_id} not found")

    conversation["messages"].append({
        "role": "assistant",
        "stage1": stage1,
        "stage2": stage2,
        "stage3": stage3
    })

    save_conversation(conversation)


def update_conversation_title(conversation_id: str, title: str):
    """
    Update the title of a conversation.

    Args:
        conversation_id: Conversation identifier
        title: New title for the conversation
    """
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise ValueError(f"Conversation {conversation_id} not found")

    conversation["title"] = title
    save_conversation(conversation)


def delete_conversation(conversation_id: str) -> bool:
    """
    Delete a conversation.

    Args:
        conversation_id: Conversation identifier

    Returns:
        True if deleted, False if not found
    """
    path = get_conversation_path(conversation_id)
    
    if not os.path.exists(path):
        return False
    
    os.remove(path)
    return True
