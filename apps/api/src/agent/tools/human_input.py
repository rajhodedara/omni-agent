from pydantic import BaseModel, Field
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
