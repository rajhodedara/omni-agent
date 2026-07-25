import uuid
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
