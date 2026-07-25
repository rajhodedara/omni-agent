import asyncio
from src.agent.graph import plan_task
from src.agent.state import AgentState

async def main():
    state = AgentState(
        messages=[],
        original_prompt="what is my fav color?",
        user_id="user_123",
        execution_id="exec_123",
        plan=[],
        current_step_index=0,
        max_steps=20,
        step_results=[],
        current_tool_call=None,
        retry_count=0,
        constraints={},
        user_preferences=[{"fact": "favorite color is blue"}],
        status="parsing"
    )
    result = await plan_task(state)
    print(result)

asyncio.run(main())
