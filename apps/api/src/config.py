import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # App
    ENVIRONMENT: str = "development"
    FRONTEND_URL: str = "http://localhost:3000"
    SECRET_KEY: str = "dev-secret-key"
    
    # DB & Services
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/personalai"
    REDIS_URL: str = "redis://localhost:6379"
    TEMPORAL_HOST: str = "localhost:7233"
    
    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = "your-super-secret-jwt-token-with-at-least-32-characters-long"
    
    # LLMs
    CEREBRAS_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    GITHUB_TOKEN: str = ""
    GROQ_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    YELP_API_KEY: str = ""
    TAVILY_API_KEY: str = ""
    
    # Observability
    LANGFUSE_PUBLIC_KEY: str = ""
    LANGFUSE_SECRET_KEY: str = ""
    LANGFUSE_HOST: str = "https://cloud.langfuse.com"
    
    # Agent Constraints
    MAX_STEPS: int = 20
    MAX_TOKENS_PER_EXECUTION: int = 100000

    model_config = SettingsConfigDict(
        # Look for .env in current dir, then fallback to parent dir (monorepo root)
        env_file=(".env", "../../.env"), 
        env_file_encoding="utf-8",
        extra="ignore"
    )

def get_settings() -> Settings:
    return Settings()
