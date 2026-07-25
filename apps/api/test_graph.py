import asyncio
import uuid
import json
from src.agent.graph import agent_graph
from src.agent.state import AgentState

async def main():
    thread_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}
    
    initial_state = AgentState(
        original_prompt="Plan a 5 day trip to Japan with a $2000 budget.",
        messages=[{"role": "user", "content": "Plan a 5 day trip to Japan with a $2000 budget."}],
        status="parsing",
        constraints={},
        user_preferences=[],
        plan=[],
        step_results=[],
        current_step_index=0,
        retry_count=0,
        requires_approval=False,
        approval_request=None,
        final_summary=None,
        total_tokens=0,
    )
    
    print("=== STARTING GRAPH ===")
    async for output in agent_graph.astream(initial_state, config=config):
        for node, state in output.items():
            print(f"\n--- Node completed: {node} ---")
            if node == "plan_task":
                print(f"Generated Plan: {json.dumps(state.get('plan', []), indent=2)}")
            elif node == "execute_step":
                if state.get("step_results"):
                    last_res = state["step_results"][-1]
                    print(f"Step {last_res.get('step_number')} ({last_res.get('tool_name')}): {str(last_res.get('tool_output'))[:300]}...")
            elif node == "summarize":
                print(f"\nFINAL SUMMARY:\n{state.get('final_summary')}\n")

if __name__ == "__main__":
    asyncio.run(main())
