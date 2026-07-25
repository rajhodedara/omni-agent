from litellm import Router
from src.config import get_settings
import logging

logger = logging.getLogger(__name__)

_router = None

def get_llm_router() -> Router:
    global _router
    if _router is not None:
        return _router
        
    settings = get_settings()
    
    all_possible_models = []
    
    # 1. Gemini (Primary because GitHub hit daily quota)
    if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip():
        all_possible_models.append({
            "model_name": "gemini-flash",
            "litellm_params": {
                "model": "gemini/gemini-flash-latest",
                "api_key": settings.GEMINI_API_KEY.strip(),
            },
            "tpm": 15 * 1000,
            "rpm": 15,
        })
        
    # 2. GitHub Models (GPT-4o-mini, 150 RPD free)
    if settings.GITHUB_TOKEN and settings.GITHUB_TOKEN.strip():
        all_possible_models.append({
            "model_name": "github-gpt4o-mini",
            "litellm_params": {
                "model": "openai/gpt-4o-mini",
                "api_base": "https://models.inference.ai.azure.com",
                "api_key": settings.GITHUB_TOKEN.strip(),
            },
            "rpm": 15,
        })
        
    # 3. Cerebras (1M tokens/day)
    if settings.CEREBRAS_API_KEY and settings.CEREBRAS_API_KEY.strip():
        all_possible_models.append({
            "model_name": "cerebras-llama3-70b",
            "litellm_params": {
                "model": "openai/llama3.1-70b",
                "api_base": "https://api.cerebras.ai/v1",
                "api_key": settings.CEREBRAS_API_KEY.strip(),
            },
            "tpm": 30 * 1000,
            "rpm": 30,
        })

    # 4. Groq (100k tokens/day - currently rate limited)
    if settings.GROQ_API_KEY and settings.GROQ_API_KEY.strip():
        all_possible_models.append({
            "model_name": "groq-llama3-70b",
            "litellm_params": {
                "model": "groq/llama-3.3-70b-versatile",
                "api_key": settings.GROQ_API_KEY.strip(),
            },
            "rpm": 30,
        })

    # 5. OpenRouter
    if settings.OPENROUTER_API_KEY and settings.OPENROUTER_API_KEY.strip():
        all_possible_models.append({
            "model_name": "openrouter-free",
            "litellm_params": {
                "model": "openrouter/auto",
                "api_key": settings.OPENROUTER_API_KEY.strip(),
            },
            "rpm": 20,
        })

    # 6. Ollama Local (only if explicitly enabled via OLLAMA_ENABLED=true in .env)
    if settings.OLLAMA_BASE_URL and settings.OLLAMA_BASE_URL != "http://localhost:11434":
        all_possible_models.append({
            "model_name": "ollama-local",
            "litellm_params": {
                "model": "ollama/llama3",
                "api_base": settings.OLLAMA_BASE_URL,
            },
        })

    if not all_possible_models:
        logger.warning("No LLM API keys provided in environment! Defaulting to groq placeholder.")
        all_possible_models.append({
            "model_name": "groq-llama3-70b",
            "litellm_params": {
                "model": "groq/llama-3.3-70b-versatile",
                "api_key": settings.GROQ_API_KEY.strip(),
            },
        })

    # Generate fallback list dynamically from available models
    available_model_names = [m["model_name"] for m in all_possible_models]
    fallbacks = []
    for i, name in enumerate(available_model_names):
        if i < len(available_model_names) - 1:
            fallbacks.append({name: available_model_names[i+1:]})

    _router = Router(
        model_list=all_possible_models,
        fallbacks=fallbacks,
        num_retries=2,
        timeout=30.0,
        retry_after=5,
    )
    return _router

async def chat_completion(messages: list, tools: list = None, **kwargs):
    router = get_llm_router()
    primary_model_name = router.model_list[0]["model_name"] if router.model_list else "groq-llama3-70b"
    
    params = {
        "model": primary_model_name,
        "messages": messages,
        **kwargs
    }
    if tools:
        params["tools"] = tools
        
    return await router.acompletion(**params)
