"""JSON-based storage for contexts."""

import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path

CONTEXTS_DIR = "data/contexts"


def ensure_contexts_dir():
    """Ensure the contexts directory exists."""
    Path(CONTEXTS_DIR).mkdir(parents=True, exist_ok=True)


def get_context_path(context_id: str) -> str:
    """Get the file path for a context."""
    return os.path.join(CONTEXTS_DIR, f"{context_id}.json")


def create_context(context_id: str, name: str, content: str) -> Dict[str, Any]:
    """
    Create a new context.

    Args:
        context_id: Unique identifier for the context
        name: Short name for the context
        content: The context content (background information)

    Returns:
        New context dict
    """
    ensure_contexts_dir()

    now = datetime.utcnow().isoformat()
    context = {
        "id": context_id,
        "name": name,
        "content": content,
        "created_at": now,
        "updated_at": now
    }

    # Save to file
    path = get_context_path(context_id)
    with open(path, 'w') as f:
        json.dump(context, f, indent=2)

    return context


def get_context(context_id: str) -> Optional[Dict[str, Any]]:
    """
    Load a context from storage.

    Args:
        context_id: Unique identifier for the context

    Returns:
        Context dict or None if not found
    """
    path = get_context_path(context_id)

    if not os.path.exists(path):
        return None

    with open(path, 'r') as f:
        return json.load(f)


def update_context(context_id: str, name: str = None, content: str = None) -> Optional[Dict[str, Any]]:
    """
    Update an existing context.

    Args:
        context_id: Unique identifier for the context
        name: New name (optional)
        content: New content (optional)

    Returns:
        Updated context dict or None if not found
    """
    context = get_context(context_id)
    if context is None:
        return None

    if name is not None:
        context["name"] = name
    if content is not None:
        context["content"] = content
    
    context["updated_at"] = datetime.utcnow().isoformat()

    # Save to file
    path = get_context_path(context_id)
    with open(path, 'w') as f:
        json.dump(context, f, indent=2)

    return context


def delete_context(context_id: str) -> bool:
    """
    Delete a context.

    Args:
        context_id: Unique identifier for the context

    Returns:
        True if deleted, False if not found
    """
    path = get_context_path(context_id)

    if not os.path.exists(path):
        return False

    os.remove(path)
    return True


def list_contexts() -> List[Dict[str, Any]]:
    """
    List all contexts (metadata only).

    Returns:
        List of context dicts
    """
    ensure_contexts_dir()

    contexts = []
    for filename in os.listdir(CONTEXTS_DIR):
        if filename.endswith('.json'):
            path = os.path.join(CONTEXTS_DIR, filename)
            with open(path, 'r') as f:
                data = json.load(f)
                contexts.append(data)

    # Sort by creation time, newest first
    contexts.sort(key=lambda x: x["created_at"], reverse=True)

    return contexts








