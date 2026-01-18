"""JSON-based storage for roles (personas)."""

import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path

ROLES_DIR = "data/roles"


def ensure_roles_dir():
    """Ensure the roles directory exists."""
    Path(ROLES_DIR).mkdir(parents=True, exist_ok=True)


def get_role_path(role_id: str) -> str:
    """Get the file path for a role."""
    return os.path.join(ROLES_DIR, f"{role_id}.json")


def create_role(role_id: str, name: str, description: str) -> Dict[str, Any]:
    """
    Create a new role.

    Args:
        role_id: Unique identifier for the role
        name: Short name for the role
        description: The role description (persona definition)

    Returns:
        New role dict
    """
    ensure_roles_dir()

    now = datetime.utcnow().isoformat()
    role = {
        "id": role_id,
        "name": name,
        "description": description,
        "created_at": now,
        "updated_at": now
    }

    # Save to file
    path = get_role_path(role_id)
    with open(path, 'w') as f:
        json.dump(role, f, indent=2)

    return role


def get_role(role_id: str) -> Optional[Dict[str, Any]]:
    """
    Load a role from storage.

    Args:
        role_id: Unique identifier for the role

    Returns:
        Role dict or None if not found
    """
    path = get_role_path(role_id)

    if not os.path.exists(path):
        return None

    with open(path, 'r') as f:
        return json.load(f)


def update_role(role_id: str, name: str = None, description: str = None) -> Optional[Dict[str, Any]]:
    """
    Update an existing role.

    Args:
        role_id: Unique identifier for the role
        name: New name (optional)
        description: New description (optional)

    Returns:
        Updated role dict or None if not found
    """
    role = get_role(role_id)
    if role is None:
        return None

    if name is not None:
        role["name"] = name
    if description is not None:
        role["description"] = description
    
    role["updated_at"] = datetime.utcnow().isoformat()

    # Save to file
    path = get_role_path(role_id)
    with open(path, 'w') as f:
        json.dump(role, f, indent=2)

    return role


def delete_role(role_id: str) -> bool:
    """
    Delete a role.

    Args:
        role_id: Unique identifier for the role

    Returns:
        True if deleted, False if not found
    """
    path = get_role_path(role_id)

    if not os.path.exists(path):
        return False

    os.remove(path)
    return True


def list_roles() -> List[Dict[str, Any]]:
    """
    List all roles.

    Returns:
        List of role dicts
    """
    ensure_roles_dir()

    roles = []
    for filename in os.listdir(ROLES_DIR):
        if filename.endswith('.json'):
            path = os.path.join(ROLES_DIR, filename)
            with open(path, 'r') as f:
                data = json.load(f)
                roles.append(data)

    # Sort by creation time, newest first
    roles.sort(key=lambda x: x["created_at"], reverse=True)

    return roles

