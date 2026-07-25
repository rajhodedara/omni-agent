from fastapi import APIRouter
from src.api.auth import router as auth_router
from src.api.executions import router as executions_router
from src.api.conversations import router as conversations_router
from src.api.memory import router as memory_router
from src.api.tools import router as tools_router
from src.api.chat import router as chat_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
api_router.include_router(executions_router, prefix="/executions", tags=["Executions"])
api_router.include_router(conversations_router, prefix="/conversations", tags=["Conversations"])
api_router.include_router(memory_router, prefix="/memory", tags=["Memory"])
api_router.include_router(tools_router, prefix="/tools", tags=["Tools"])
api_router.include_router(chat_router, tags=["Chat"])
