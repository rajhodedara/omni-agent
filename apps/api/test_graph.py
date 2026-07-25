import asyncio
import uuid
import json
from src.agent.graph import agent_graph
from src.agent.state import AgentState
from langgraph.types import Command

async def main():
    thread_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}
    
    initial_state = AgentState(
        original_prompt="Plan a trip to Japan",
        messages=[{"role": "user", "content": "Plan a trip to Japan"}],
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
            print(f"Node completed: {node}")
            
    graph_state = agent_graph.get_state(config)
    if graph_state and graph_state.next:
        print("\n=== GRAPH PAUSED ===")
        print(f"Pending nodes: {graph_state.next}")
        print("Resuming...")
        
        resume_input = Command(resume={"response": "15 days and 2000dollars"})
        async for output in agent_graph.astream(resume_input, config=config):
            for node, state in output.items():
                print(f"Node completed: {node}")
                
        graph_state2 = agent_graph.get_state(config)
        if graph_state2 and graph_state2.next:
            print("\n=== GRAPH PAUSED AGAIN ===")
            print(f"Pending nodes: {graph_state2.next}")
        else:
            print("\n=== GRAPH FINISHED ===")

if __name__ == "__main__":
    asyncio.run(main())
