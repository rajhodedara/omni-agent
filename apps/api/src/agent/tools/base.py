from pydantic import BaseModel
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
