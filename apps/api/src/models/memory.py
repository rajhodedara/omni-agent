import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Float, Index
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

    __table_args__ = (
        Index("ix_user_preferences_user_id", "user_id"),
    )

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

    __table_args__ = (
        Index("ix_memory_facts_user_id", "user_id"),
        Index(
            "ix_memory_facts_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )

class MemoryEpisode(Base):
    __tablename__ = "memory_episodes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    content = Column(String, nullable=False)
    embedding = Column(Vector(1536), nullable=True)
    metadata_ = Column("metadata", JSONB, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_memory_episodes_user_id", "user_id"),
        Index(
            "ix_memory_episodes_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )
