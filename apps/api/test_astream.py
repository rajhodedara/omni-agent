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

    async for output in compiled.astream({"my_list": []}):
        print(f"Type of output: {type(output)}, output: {output}")
        for k, v in output.items():
            print(f"k: {k}, type of v: {type(v)}")

asyncio.run(main())
