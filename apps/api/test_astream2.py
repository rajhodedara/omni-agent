from typing import TypedDict
from langgraph.graph import StateGraph, START, END
import asyncio

class State(TypedDict):
    my_list: list

def node1(state: State):
    return {"my_list": [1]}

async def main():
    graph = StateGraph(State)
    graph.add_node("node1", node1)
    graph.add_edge(START, "node1")
    graph.add_edge("node1", END)
    compiled = graph.compile()

    try:
        async for output in compiled.astream({"my_list": []}, stream_mode="values"):
            print(f"Type of output: {type(output)}, output: {output}")
            print(f"Has get? {hasattr(output, 'get')}")
    except Exception as e:
        print(f"Caught exception: {e}")

asyncio.run(main())
