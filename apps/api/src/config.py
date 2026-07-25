import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # App
    SECRET_KEY: str = "default_secret_key"
    FRONTEND_URL: str = "http://localhost:3000"
    ENVIRONMENT: str = "development"
    MAX_STEPS: int = 50
    MAX_TOKENS: int = 8192

    # Databases
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/personalai"
    REDIS_URL: str = "redis://localhost:6379/0"
    TEMPORAL_HOST: str = "localhost:7233"

    # LLM API Keys
    CEREBRAS_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    GITHUB_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    OPENROUTER_API_KEY: Optional[str] = None
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    # Tool APIs
    YELP_API_KEY: Optional[str] = None
    AMADEUS_API_KEY: Optional[str] = None
    TAVILY_API_KEY: Optional[str] = None
    MAPBOX_API_KEY: Optional[str] = None

    # Services
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    LANGFUSE_PUBLIC_KEY: Optional[str] = None
    LANGFUSE_SECRET_KEY: Optional[str] = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()

def get_settings() -> Settings:
    return settings
