from litellm import Router
from src.config import get_settings

def get_llm_router() -> Router:
    settings = get_settings()
    
    model_list = [
        {
            "model_name": "cerebras-llama3-70b",
            "litellm_params": {
                "model": "cerebras/llama3.3-70b",
                "api_key": settings.CEREBRAS_API_KEY,
            },
            "tpm": 30 * 1000,
            "rpm": 30,
        },
        {
            "model_name": "gemini-flash",
            "litellm_params": {
                "model": "gemini/gemini-2.5-flash",
                "api_key": settings.GEMINI_API_KEY,
            },
            "tpm": 15 * 1000,
            "rpm": 15,
        },
        {
            "model_name": "github-gpt4o-mini",
            "litellm_params": {
                "model": "github/gpt-4o-mini",
                "api_key": settings.GITHUB_API_KEY,
            },
            "rpm": 15,
        },
        {
            "model_name": "groq-llama3-70b",
            "litellm_params": {
                "model": "groq/llama-3.3-70b",
                "api_key": settings.GROQ_API_KEY,
            },
            "rpm": 30,
        },
        {
            "model_name": "openrouter-free",
            "litellm_params": {
                "model": "openrouter/free",
                "api_key": settings.OPENROUTER_API_KEY,
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
    
    router = Router(
        model_list=model_list,
        fallbacks=[
            {"cerebras-llama3-70b": ["gemini-flash", "github-gpt4o-mini", "groq-llama3-70b", "openrouter-free", "ollama-local"]}
        ],
        num_retries=3
    )
    return router

async def chat_completion(messages: list, tools: list = None, **kwargs):
    router = get_llm_router()
    return await router.acompletion(
        model="cerebras-llama3-70b",
        messages=messages,
        tools=tools,
        **kwargs
    )
