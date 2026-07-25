from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
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
