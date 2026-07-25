import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Enum, Index
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
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=True)
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

    __table_args__ = (
        Index("ix_executions_user_id", "user_id"),
        Index("ix_executions_conversation_id", "conversation_id"),
    )

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

    __table_args__ = (
        Index("ix_execution_steps_execution_id", "execution_id"),
    )
