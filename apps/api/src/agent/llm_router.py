from litellm import Router
from src.config import get_settings

_router = None

def get_llm_router() -> Router:
    global _router
    if _router is not None:
        return _router
        
    settings = get_settings()
    
    model_list = [
        {
            "model_name": "cerebras-llama3-70b",
            "litellm_params": {
                "model": "cerebras/llama3.1-70b",
                "api_key": settings.CEREBRAS_API_KEY.strip(),
            },
            "tpm": 30 * 1000,
            "rpm": 30,
        },
        {
            "model_name": "gemini-flash",
            "litellm_params": {
                "model": "gemini/gemini-1.5-flash",
                "api_key": settings.GEMINI_API_KEY.strip(),
            },
            "tpm": 15 * 1000,
            "rpm": 15,
        },
        {
            "model_name": "github-gpt4o-mini",
            "litellm_params": {
                "model": "github/gpt-4o-mini",
                "api_key": settings.GITHUB_TOKEN.strip(),
            },
            "rpm": 15,
        },
        {
            "model_name": "groq-llama3-70b",
            "litellm_params": {
                "model": "groq/llama-3.3-70b-versatile",
                "api_key": settings.GROQ_API_KEY.strip(),
            },
            "rpm": 30,
        },
        {
            "model_name": "groq-qwen-vision",
            "litellm_params": {
                "model": "groq/qwen/qwen3.6-27b",
                "api_key": settings.GROQ_API_KEY.strip(),
            },
            "rpm": 15,
        },
        {
            "model_name": "openrouter-free",
            "litellm_params": {
                "model": "openrouter/auto",
                "api_key": settings.OPENROUTER_API_KEY.strip(),
            },
            "rpm": 20,
        },
        {
            "model_name": "ollama-local",
            "litellm_params": {
                "model": "ollama/llama3",
                "api_base": settings.OLLAMA_BASE_URL,
            },
        }
    ]
    
    _router = Router(
        model_list=model_list,
        fallbacks=[
            {"groq-llama3-70b": ["cerebras-llama3-70b", "gemini-flash", "github-gpt4o-mini", "openrouter-free", "ollama-local"]},
            {"groq-qwen-vision": ["gemini-flash", "github-gpt4o-mini", "openrouter-free"]}
        ],
        num_retries=2, # Wait and retry if Groq hits temporary token rate limits
        timeout=25.0 # Max 25 seconds per provider to allow for backoff wait times
    )
    return _router

async def chat_completion(messages: list, tools: list = None, **kwargs):
    import json
    router = get_llm_router()
    
    # Check if there is vision content
    is_vision = False
    for msg in messages:
        if isinstance(msg.get("content"), list):
            for item in msg["content"]:
                if item.get("type") == "image_url":
                    is_vision = True
                    break
    
    target_model = "groq-qwen-vision" if is_vision else "groq-llama3-70b"
    
    return await router.acompletion(
        model=target_model,
        messages=messages,
        tools=tools,
        **kwargs
    )
