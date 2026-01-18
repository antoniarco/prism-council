"""OpenRouter API client for making LLM requests."""

import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from .config import OPENROUTER_API_KEY, OPENROUTER_API_URL

# Cache for models list (avoid hitting API constantly)
_models_cache: Optional[List[Dict[str, Any]]] = None
_models_cache_time: Optional[datetime] = None
_CACHE_DURATION = timedelta(hours=1)


async def query_model(
    model: str,
    messages: List[Dict[str, str]],
    timeout: float = 120.0
) -> Optional[Dict[str, Any]]:
    """
    Query a single model via OpenRouter API.

    Args:
        model: OpenRouter model identifier (e.g., "openai/gpt-4o")
        messages: List of message dicts with 'role' and 'content'
        timeout: Request timeout in seconds

    Returns:
        Response dict with 'content' and optional 'reasoning_details', or None if failed
    """
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": messages,
    }

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                OPENROUTER_API_URL,
                headers=headers,
                json=payload
            )
            response.raise_for_status()

            data = response.json()
            message = data['choices'][0]['message']

            return {
                'content': message.get('content'),
                'reasoning_details': message.get('reasoning_details')
            }

    except Exception as e:
        print(f"Error querying model {model}: {e}")
        return None


async def query_models_parallel(
    models: List[str],
    messages: List[Dict[str, str]]
) -> Dict[str, Optional[Dict[str, Any]]]:
    """
    Query multiple models in parallel.

    Args:
        models: List of OpenRouter model identifiers
        messages: List of message dicts to send to each model

    Returns:
        Dict mapping model identifier to response dict (or None if failed)
    """
    import asyncio

    # Create tasks for all models
    tasks = [query_model(model, messages) for model in models]

    # Wait for all to complete
    responses = await asyncio.gather(*tasks)

    # Map models to their responses
    return {model: response for model, response in zip(models, responses)}


async def get_available_models(force_refresh: bool = False) -> List[Dict[str, Any]]:
    """
    Fetch available models from OpenRouter API.
    Results are cached for 1 hour to avoid excessive API calls.

    Args:
        force_refresh: If True, bypass cache and fetch fresh data

    Returns:
        List of model dicts with keys: id, name, provider
    """
    global _models_cache, _models_cache_time

    # Check cache
    if not force_refresh and _models_cache is not None and _models_cache_time is not None:
        if datetime.now() - _models_cache_time < _CACHE_DURATION:
            return _models_cache

    # Fetch from API
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                "https://openrouter.ai/api/v1/models",
                headers=headers
            )
            response.raise_for_status()

            data = response.json()
            models_raw = data.get('data', [])

            # Extract minimal required metadata
            models = []
            for model in models_raw:
                model_id = model.get('id', '')
                if not model_id:
                    continue

                # Parse provider from id (e.g., "openai/gpt-4" -> "OpenAI")
                provider = model_id.split('/')[0] if '/' in model_id else 'Unknown'
                provider = provider.capitalize()

                models.append({
                    'id': model_id,
                    'name': model.get('name', model_id),
                    'provider': provider
                })

            # Update cache
            _models_cache = models
            _models_cache_time = datetime.now()

            return models

    except Exception as e:
        print(f"Error fetching models from OpenRouter: {e}")
        # Return cache if available, even if stale
        if _models_cache is not None:
            return _models_cache
        return []
