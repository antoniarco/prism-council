"""JSON-based storage for application settings."""

import json
import os
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path

SETTINGS_FILE = "data/settings.json"

# Default settings
DEFAULT_SETTINGS = {
    "council_models": [
        "openai/gpt-5.1",
        "google/gemini-3-pro-preview",
        "anthropic/claude-sonnet-4.5",
        "x-ai/grok-4"
    ],
    "chairman_model": "anthropic/claude-sonnet-4.5",
    "analyst_model": "anthropic/claude-sonnet-4.5",
    "clarification_first_enabled": False,
    "max_clarification_rounds": 5,
    "openrouter_api_key": ""
}


def ensure_data_dir():
    """Ensure the data directory exists."""
    Path("data").mkdir(parents=True, exist_ok=True)


def load_settings() -> Dict[str, Any]:
    """
    Load settings from storage.
    
    Returns:
        Settings dict with current configuration
    """
    ensure_data_dir()
    
    if not os.path.exists(SETTINGS_FILE):
        # Create default settings file if it doesn't exist
        with open(SETTINGS_FILE, 'w') as f:
            json.dump(DEFAULT_SETTINGS, f, indent=2)
        return DEFAULT_SETTINGS.copy()
    
    try:
        with open(SETTINGS_FILE, 'r') as f:
            settings = json.load(f)
            
        # Merge with defaults to ensure all keys are present
        merged = DEFAULT_SETTINGS.copy()
        merged.update(settings)
        return merged
        
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error loading settings: {e}")
        return DEFAULT_SETTINGS.copy()


def update_settings(
    council_models: Optional[list] = None,
    chairman_model: Optional[str] = None,
    analyst_model: Optional[str] = None,
    clarification_first_enabled: Optional[bool] = None,
    max_clarification_rounds: Optional[int] = None,
    openrouter_api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Update application settings.
    
    Args:
        council_models: List of model identifiers for reasoning models
        chairman_model: Model identifier for chairman
        analyst_model: Model identifier for analyst
        clarification_first_enabled: Whether to enable clarification-first mode
        max_clarification_rounds: Maximum clarification rounds
        openrouter_api_key: OpenRouter API key
    
    Returns:
        Updated settings dict
    """
    ensure_data_dir()
    
    # Load current settings
    settings = load_settings()
    
    # Update provided fields
    if council_models is not None:
        settings["council_models"] = council_models
    if chairman_model is not None:
        settings["chairman_model"] = chairman_model
    if analyst_model is not None:
        settings["analyst_model"] = analyst_model
    if clarification_first_enabled is not None:
        settings["clarification_first_enabled"] = clarification_first_enabled
    if max_clarification_rounds is not None:
        settings["max_clarification_rounds"] = max_clarification_rounds
    if openrouter_api_key is not None:
        settings["openrouter_api_key"] = openrouter_api_key
    
    # Update timestamp
    settings["updated_at"] = datetime.utcnow().isoformat()
    
    # Save to file
    with open(SETTINGS_FILE, 'w') as f:
        json.dump(settings, f, indent=2)
    
    return settings


def get_effective_api_key() -> str:
    """
    Get the effective OpenRouter API key.
    
    Checks settings first, then falls back to environment variable.
    
    Returns:
        API key string or empty string if not found
    """
    settings = load_settings()
    api_key = settings.get("openrouter_api_key", "")
    
    if api_key:
        return api_key
    
    # Fallback to environment variable
    return os.getenv("OPENROUTER_API_KEY", "")
