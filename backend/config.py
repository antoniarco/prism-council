"""Configuration for PRISM Council."""

import os
from dotenv import load_dotenv

load_dotenv()

# Import settings storage for dynamic configuration
try:
    from . import settings_storage
    _settings = settings_storage.load_settings()
except ImportError:
    # Fallback if settings_storage is not available (shouldn't happen)
    _settings = None

# Helper function to get settings with fallback
def _get_setting(key, fallback):
    if _settings:
        return _settings.get(key, fallback)
    return fallback

# OpenRouter API key (prefer settings, fallback to env)
if _settings:
    OPENROUTER_API_KEY = settings_storage.get_effective_api_key()
else:
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# Council members - list of OpenRouter model identifiers
COUNCIL_MODELS = _get_setting("council_models", [
    "openai/gpt-4o",
    "anthropic/claude-3.5-sonnet",
    "google/gemini-2.0-flash-exp",
])

# Chairman model - synthesizes final response
CHAIRMAN_MODEL = _get_setting("chairman_model", "anthropic/claude-3.5-sonnet")

# Clarification-first mode settings
CLARIFICATION_FIRST_ENABLED = _get_setting("clarification_first_enabled", False)
ANALYST_MODEL = _get_setting("analyst_model", "anthropic/claude-3.5-sonnet")
MAX_CLARIFICATION_ROUNDS = _get_setting("max_clarification_rounds", 5)

# OpenRouter API endpoint
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Data directory for conversation storage
DATA_DIR = "data/conversations"


def reload_config():
    """
    Reload configuration from settings storage.
    Call this after settings are updated to refresh in-memory config.
    """
    global OPENROUTER_API_KEY, COUNCIL_MODELS, CHAIRMAN_MODEL, _settings
    global CLARIFICATION_FIRST_ENABLED, ANALYST_MODEL, MAX_CLARIFICATION_ROUNDS
    
    if settings_storage:
        _settings = settings_storage.load_settings()
        OPENROUTER_API_KEY = settings_storage.get_effective_api_key()
        COUNCIL_MODELS = _settings.get("council_models", COUNCIL_MODELS)
        CHAIRMAN_MODEL = _settings.get("chairman_model", CHAIRMAN_MODEL)
        CLARIFICATION_FIRST_ENABLED = _settings.get("clarification_first_enabled", CLARIFICATION_FIRST_ENABLED)
        ANALYST_MODEL = _settings.get("analyst_model", ANALYST_MODEL)
        MAX_CLARIFICATION_ROUNDS = _settings.get("max_clarification_rounds", MAX_CLARIFICATION_ROUNDS)
