import os

BASE_DIR = r"c:\Users\odeda\Desktop\Projects\PersonalAi\apps\api"

FILES = {
    "pyproject.toml": """[project]
name = "personalai-api"
version = "0.1.0"
description = "FastAPI backend for PersonalAI autonomous agent"
requires-python = ">=3.12"
dependencies = [
    "fastapi[standard]>=0.115.0",
    "uvicorn[standard]",
    "sqlalchemy[asyncio]>=2.0",
    "asyncpg",
    "alembic",
    "pydantic>=2.0",
    "pydantic-settings",
    "python-jose[cryptography]",
    "httpx",
    "redis",
    "litellm",
    "langgraph",
    "langchain-core",
    "temporalio",
    "mem0ai",
    "duckduckgo-search",
    "crawl4ai",
    "feedparser",
    "geopy",
    "trafilatura",
    "langfuse",
    "python-multipart",
    "pgvector"
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
""",
    "src/__init__.py": "",
    "src/config.py": """import os
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
""",
    "src/main.py": """from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from src.api.router import api_router
from src.dependencies import get_settings
from src.models.database import init_db
from typing import AsyncGenerator

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Initialize DB and Redis here
    await init_db()
    yield
    # Cleanup DB and Redis connections here

app = FastAPI(
    title="PersonalAI API",
    description="FastAPI backend for PersonalAI autonomous agent",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok", "environment": settings.ENVIRONMENT}
""",
    "src/dependencies.py": """from typing import AsyncGenerator
from fastapi import Depends
from src.config import Settings, get_settings
from src.models.database import get_db_session
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as redis

# Cache redis client
_redis_client = None

async def get_redis() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        settings = get_settings()
        _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client
""",
    "src/models/__init__.py": """from .database import Base, get_db_session, init_db
from .user import User
from .execution import Execution, ExecutionStep
from .conversation import Conversation
from .memory import UserPreference, MemoryFact, MemoryEpisode
from .tool import ToolDefinition
""",
    "src/models/database.py": """from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from src.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session_factory = async_sessionmaker(engine, expire_on_commit=False)

Base = declarative_base()

async def get_db_session() -> AsyncSession:
    async with async_session_factory() as session:
        yield session

async def init_db():
    # Normally use alembic, but here for testing:
    # async with engine.begin() as conn:
    #     await conn.run_sync(Base.metadata.create_all)
    pass
""",
    "src/models/user.py": """import uuid
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from src.models.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String)
    settings = Column(JSONB, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
""",
    "src/models/execution.py": """import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from src.models.database import Base
import enum

class ExecutionStatus(str, enum.Enum):
    pending = "pending"
    planning = "planning"
    executing = "executing"
    waiting_approval = "waiting_approval"
    replanning = "replanning"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"

class StepType(str, enum.Enum):
    plan = "plan"
    tool_call = "tool_call"
    evaluation = "evaluation"
    replan = "replan"
    approval = "approval"
    summary = "summary"

class StepStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"
    skipped = "skipped"

class Execution(Base):
    __tablename__ = "executions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False)
    original_prompt = Column(String, nullable=False)
    status = Column(Enum(ExecutionStatus), default=ExecutionStatus.pending)
    plan = Column(JSONB, nullable=True)
    result_summary = Column(JSONB, nullable=True)
    total_tokens_used = Column(Integer, default=0)
    total_cost_usd = Column(Float, default=0.0)
    step_count = Column(Integer, default=0)
    temporal_workflow_id = Column(String, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ExecutionStep(Base):
    __tablename__ = "execution_steps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    execution_id = Column(UUID(as_uuid=True), ForeignKey("executions.id"), nullable=False)
    step_number = Column(Integer, nullable=False)
    step_type = Column(Enum(StepType), nullable=False)
    status = Column(Enum(StepStatus), default=StepStatus.pending)
    tool_name = Column(String, nullable=True)
    tool_input = Column(JSONB, nullable=True)
    tool_output = Column(JSONB, nullable=True)
    reasoning = Column(String, nullable=True)
    error_message = Column(String, nullable=True)
    retry_count = Column(Integer, default=0)
    tokens_used = Column(Integer, default=0)
    latency_ms = Column(Integer, default=0)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
""",
    "src/models/conversation.py": """import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from src.models.database import Base

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=True)
    messages = Column(JSONB, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
""",
    "src/models/memory.py": """import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from src.models.database import Base

class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    category = Column(String, nullable=False)
    key = Column(String, nullable=False)
    value = Column(String, nullable=False)
    confidence = Column(Float, default=1.0)
    learned_at = Column(DateTime(timezone=True), server_default=func.now())
    last_confirmed = Column(DateTime(timezone=True), nullable=True)

class MemoryFact(Base):
    __tablename__ = "memory_facts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    fact = Column(String, nullable=False)
    category = Column(String, nullable=True)
    confidence = Column(Float, default=1.0)
    source_execution_id = Column(UUID(as_uuid=True), ForeignKey("executions.id"), nullable=True)
    embedding = Column(Vector(1536), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class MemoryEpisode(Base):
    __tablename__ = "memory_episodes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    content = Column(String, nullable=False)
    embedding = Column(Vector(1536), nullable=True)
    metadata_ = Column("metadata", JSONB, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
""",
    "src/models/tool.py": """import uuid
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from src.models.database import Base

class ToolDefinition(Base):
    __tablename__ = "tool_definitions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, nullable=True)
    input_schema = Column(JSONB, nullable=False)
    output_schema = Column(JSONB, nullable=False)
    mcp_server_url = Column(String, nullable=True)
    requires_approval = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
""",
    "src/api/__init__.py": "",
    "src/api/router.py": """from fastapi import APIRouter
from src.api.auth import router as auth_router
from src.api.executions import router as executions_router
from src.api.conversations import router as conversations_router
from src.api.memory import router as memory_router
from src.api.tools import router as tools_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
api_router.include_router(executions_router, prefix="/executions", tags=["Executions"])
api_router.include_router(conversations_router, prefix="/conversations", tags=["Conversations"])
api_router.include_router(memory_router, prefix="/memory", tags=["Memory"])
api_router.include_router(tools_router, prefix="/tools", tags=["Tools"])
""",
    "src/api/auth.py": """from fastapi import APIRouter

router = APIRouter()

@router.get("/me")
async def get_me():
    return {"message": "Placeholder for current user"}

@router.post("/callback")
async def auth_callback():
    return {"message": "Placeholder for auth callback"}
""",
    "src/api/executions.py": """from fastapi import APIRouter
import uuid

router = APIRouter()

@router.post("/")
async def create_execution():
    return {"message": "Create execution"}

@router.get("/")
async def list_executions():
    return {"executions": []}

@router.get("/{id}")
async def get_execution(id: uuid.UUID):
    return {"id": id, "status": "pending"}

@router.get("/{id}/stream")
async def stream_execution(id: uuid.UUID):
    return {"message": "SSE stream stub"}

@router.post("/{id}/signal")
async def send_signal(id: uuid.UUID):
    return {"message": "Signal sent"}

@router.delete("/{id}")
async def cancel_execution(id: uuid.UUID):
    return {"message": "Execution cancelled"}
""",
    "src/api/conversations.py": """from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def list_conversations():
    return []

@router.post("/")
async def create_conversation():
    return {}

@router.get("/{id}")
async def get_conversation(id: str):
    return {"id": id}
""",
    "src/api/memory.py": """from fastapi import APIRouter

router = APIRouter()

@router.get("/preferences")
async def get_preferences():
    return []

@router.get("/facts")
async def get_facts():
    return []
""",
    "src/api/tools.py": """from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def list_tools():
    return []
""",
    "src/api/middleware.py": """from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import time
import logging

logger = logging.getLogger(__name__)

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        logger.info(f"{request.method} {request.url.path} - {response.status_code} - {process_time:.4f}s")
        return response

class RateLimitingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Stub for rate limiting
        return await call_next(request)
""",
    "src/agent/__init__.py": "",
    "src/agent/llm_router.py": """from litellm import Router
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
""",
    "src/agent/state.py": """from typing import TypedDict, List, Dict, Any, Optional

class AgentState(TypedDict):
    execution_id: str
    conversation_id: str
    original_prompt: str
    messages: List[Dict[str, Any]]
    plan: Optional[List[Dict[str, Any]]]
    current_step: int
    context: Dict[str, Any]
    status: str
    error_message: Optional[str]
""",
    "src/agent/prompts.py": """PLANNER_SYSTEM_PROMPT = \"\"\"You are the Planner agent. Your task is to break down the user's request into a concrete list of logical steps.
Each step should specify what needs to be done and which tools might be required.
Be specific and break complex tasks into smaller, manageable sub-tasks.
\"\"\"

EXECUTOR_SYSTEM_PROMPT = \"\"\"You are the Executor agent. Your task is to select and call the appropriate tool to execute the current step of the plan.
Given the current step and context, output the tool name and input parameters required.
\"\"\"

EVALUATOR_SYSTEM_PROMPT = \"\"\"You are the Evaluator agent. Your task is to review the results of a tool execution and determine if it successfully completed the step.
Provide feedback and determine if a replan is necessary or if we can proceed to the next step.
\"\"\"

SUMMARIZER_SYSTEM_PROMPT = \"\"\"You are the Summarizer agent. Your task is to review the entire execution history and provide a concise, user-friendly summary of what was accomplished.
\"\"\"
""",
    "src/agent/tools/__init__.py": """from .base import BaseTool
from .web_search import WebSearchTool
from .weather import WeatherTool
from .news import NewsTool
from .maps import MapsTool
from .human_input import HumanInputTool
""",
    "src/agent/tools/base.py": """from pydantic import BaseModel
from abc import ABC, abstractmethod
from typing import Type, Any, Dict

class BaseTool(ABC):
    name: str
    description: str
    input_schema: Type[BaseModel]
    requires_approval: bool = False

    @abstractmethod
    async def execute(self, **kwargs) -> Any:
        pass

    def to_openai_tool(self) -> Dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.input_schema.model_json_schema()
            }
        }
""",
    "src/agent/tools/web_search.py": """from typing import List, Dict
from pydantic import BaseModel, Field
from duckduckgo_search import DDGS
from .base import BaseTool

class WebSearchInput(BaseModel):
    query: str = Field(..., description="The search query to look up on the web.")
    max_results: int = Field(5, description="Maximum number of results to return.")

class WebSearchTool(BaseTool):
    name = "web_search"
    description = "Searches the web using DuckDuckGo and returns top results with titles, URLs, and snippets."
    input_schema = WebSearchInput

    async def execute(self, query: str, max_results: int = 5) -> List[Dict[str, str]]:
        with DDGS() as ddgs:
            results = ddgs.text(query, max_results=max_results)
            return [{"title": r.get("title"), "url": r.get("href"), "snippet": r.get("body")} for r in results]
""",
    "src/agent/tools/weather.py": """from pydantic import BaseModel, Field
import httpx
from .base import BaseTool

class WeatherInput(BaseModel):
    city: str = Field(..., description="The name of the city to get weather for.")

class WeatherTool(BaseTool):
    name = "weather"
    description = "Gets current weather and forecast for a given city."
    input_schema = WeatherInput

    async def execute(self, city: str) -> dict:
        # 1. Geocoding
        geocode_url = f"https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1"
        async with httpx.AsyncClient() as client:
            geo_res = await client.get(geocode_url)
            geo_data = geo_res.json()
            if not geo_data.get("results"):
                return {"error": f"City {city} not found."}
            
            loc = geo_data["results"][0]
            lat, lon = loc["latitude"], loc["longitude"]
            
            # 2. Weather
            weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto"
            w_res = await client.get(weather_url)
            return w_res.json()
""",
    "src/agent/tools/news.py": """from pydantic import BaseModel, Field
import feedparser
from .base import BaseTool
import urllib.parse

class NewsInput(BaseModel):
    query: str = Field(..., description="The topic to search news for.")
    max_results: int = Field(5, description="Maximum number of news articles to return.")

class NewsTool(BaseTool):
    name = "news"
    description = "Searches Google News for articles on a specific topic."
    input_schema = NewsInput

    async def execute(self, query: str, max_results: int = 5) -> list:
        encoded_query = urllib.parse.quote(query)
        feed_url = f"https://news.google.com/rss/search?q={encoded_query}"
        feed = feedparser.parse(feed_url)
        
        results = []
        for entry in feed.entries[:max_results]:
            results.append({
                "title": entry.title,
                "link": entry.link,
                "published": entry.get("published", "")
            })
        return results
""",
    "src/agent/tools/maps.py": """from pydantic import BaseModel, Field
import httpx
from .base import BaseTool

class GeocodeInput(BaseModel):
    address: str = Field(..., description="The address to geocode.")

class MapsTool(BaseTool):
    name = "maps_geocode"
    description = "Forward geocoding: Converts an address into geographic coordinates using OpenStreetMap Nominatim."
    input_schema = GeocodeInput

    async def execute(self, address: str) -> dict:
        url = "https://nominatim.openstreetmap.org/search"
        params = {"q": address, "format": "json", "limit": 1}
        headers = {"User-Agent": "PersonalAi-Agent/0.1"}
        
        async with httpx.AsyncClient() as client:
            res = await client.get(url, params=params, headers=headers)
            data = res.json()
            if not data:
                return {"error": "Address not found."}
            
            return {
                "lat": float(data[0]["lat"]),
                "lon": float(data[0]["lon"]),
                "display_name": data[0]["display_name"]
            }
""",
    "src/agent/tools/human_input.py": """from pydantic import BaseModel, Field
from typing import List, Optional
from .base import BaseTool

class HumanInput(BaseModel):
    question: str = Field(..., description="The question or prompt for the user.")
    options: Optional[List[str]] = Field(None, description="Optional list of choices for the user.")

class HumanInputTool(BaseTool):
    name = "human_input"
    description = "Signals that the agent needs human input or approval to proceed."
    input_schema = HumanInput
    requires_approval = True

    async def execute(self, question: str, options: Optional[List[str]] = None) -> dict:
        return {
            "status": "waiting_approval",
            "question": question,
            "options": options
        }
"""
}

def main():
    for filepath, content in FILES.items():
        full_path = os.path.join(BASE_DIR, filepath)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Created: {filepath}")

if __name__ == "__main__":
    main()
