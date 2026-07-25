"""
Agent Graph — The core LangGraph state machine that orchestrates the
autonomous agent's reasoning loop.

Graph Topology:
    ParseInput → LoadMemory → PlanTask → ExecuteStep →
    EvaluateProgress ─┬→ ExecuteStep (more steps)
                      ├→ Replan → PlanTask
                      ├→ WaitForHuman → EvaluateProgress
                      └→ Summarize → SaveMemory → END
"""

from __future__ import annotations

import json
import logging
from typing import Any

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from src.agent.state import AgentState, PlanStep, StepResult
from src.agent.prompts import (
    PLANNER_SYSTEM_PROMPT,
    EXECUTOR_SYSTEM_PROMPT,
    EVALUATOR_SYSTEM_PROMPT,
    REPLANNER_SYSTEM_PROMPT,
    SUMMARIZER_SYSTEM_PROMPT,
)
from src.agent.llm_router import chat_completion
from src.agent.tools import get_all_tools, get_tool_by_name

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────
# Node Functions
# ─────────────────────────────────────────────────────────────────────


async def parse_input(state: AgentState) -> dict[str, Any]:
    """Parse the user's prompt to extract intent and constraints."""
    logger.info("Node: parse_input — Extracting intent and constraints")

    messages = [
        {
            "role": "system",
            "content": (
                "You are a goal parser. Extract the user's intent and any explicit "
                "constraints (budget, time, location, count, preferences) from their "
                "request. Return a JSON object with keys: 'intent' (string), "
                "'constraints' (object with any relevant key-value pairs)."
            ),
        },
        {"role": "user", "content": state["original_prompt"]},
    ]

    response = await chat_completion(messages=messages)
    content = response.choices[0].message.content

    try:
        parsed = json.loads(content)
        constraints = parsed.get("constraints", {})
    except (json.JSONDecodeError, AttributeError):
        constraints = {}

    return {
        "constraints": constraints,
        "status": "loading_memory",
        "messages": [{"role": "user", "content": state["original_prompt"]}],
    }


async def load_memory(state: AgentState) -> dict[str, Any]:
    """Load user preferences and relevant episodic memory."""
    logger.info("Node: load_memory — Retrieving user preferences")

    # TODO: Integrate Mem0 for semantic memory retrieval
    # For now, return empty preferences
    return {
        "user_preferences": [],
        "status": "planning",
    }


async def plan_task(state: AgentState) -> dict[str, Any]:
    """Decompose the user's goal into an executable plan."""
    logger.info("Node: plan_task — Generating execution plan")

    tools = get_all_tools()
    tool_descriptions = "\n".join(
        f"- **{t.name}**: {t.description}" for t in tools
    )

    context_parts = [f"User request: {state['original_prompt']}"]

    if state.get("constraints"):
        context_parts.append(f"Constraints: {json.dumps(state['constraints'])}")

    if state.get("user_preferences"):
        prefs = "; ".join(
            p.get("fact", str(p)) for p in state["user_preferences"]
        )
        context_parts.append(f"Known user preferences: {prefs}")

    if state.get("step_results"):
        completed = [
            f"Step {r['step_number']}: {r.get('reasoning', 'completed')}"
            for r in state["step_results"]
        ]
        context_parts.append(f"Previously completed steps:\n" + "\n".join(completed))

    messages = [
        {"role": "system", "content": PLANNER_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"{chr(10).join(context_parts)}\n\n"
                f"Available tools:\n{tool_descriptions}\n\n"
                "Generate the execution plan as a JSON array of steps."
            ),
        },
    ]

    response = await chat_completion(messages=messages)
    content = response.choices[0].message.content

    try:
        # Try to parse JSON from the response (handle markdown code blocks)
        clean = content.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1].rsplit("```", 1)[0]
        plan_data = json.loads(clean)
    except (json.JSONDecodeError, AttributeError):
        logger.warning("Failed to parse plan JSON, creating single-step plan")
        plan_data = [
            {
                "step_number": 1,
                "description": state["original_prompt"],
                "tool_name": None,
                "tool_input": None,
                "depends_on": [],
                "status": "pending",
            }
        ]

    plan: list[PlanStep] = []
    for i, step in enumerate(plan_data):
        plan.append(
            PlanStep(
                step_number=step.get("step_number", i + 1),
                description=step.get("description", ""),
                tool_name=step.get("tool_name"),
                tool_input=step.get("tool_input"),
                depends_on=step.get("depends_on", []),
                status="pending",
            )
        )

    return {
        "plan": plan,
        "current_step_index": 0,
        "status": "executing",
    }


async def _llm_construct_tool_args(
    tool: Any,
    step_description: str,
    previous_results: list[dict],
    original_prompt: str,
) -> dict:
    """
    Use the executor LLM to intelligently construct tool arguments
    from the step description and prior context when the planner's
    tool_input is missing or invalid.
    """
    schema_info = json.dumps(
        tool.input_schema.model_json_schema(), indent=2
    )

    context_summary = ""
    if previous_results:
        context_parts = []
        for r in previous_results:
            output_preview = str(r.get("tool_output", ""))[:300]
            context_parts.append(
                f"  Step {r['step_number']} ({r['tool_name']}): {output_preview}"
            )
        context_summary = "Results from previous steps:\n" + "\n".join(context_parts)

    messages = [
        {
            "role": "system",
            "content": (
                "You are a tool argument constructor. Given a step description, "
                "a tool's input schema, and context from previous steps, you must "
                "produce ONLY a valid JSON object matching the schema. "
                "Do NOT include any markdown formatting, code blocks, or explanation. "
                "Return ONLY the raw JSON object."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Original user request: {original_prompt}\n\n"
                f"Current step: {step_description}\n\n"
                f"Tool: {tool.name} — {tool.description}\n\n"
                f"Required input schema:\n{schema_info}\n\n"
                f"{context_summary}\n\n"
                "Produce the JSON arguments for this tool call."
            ),
        },
    ]

    response = await chat_completion(messages=messages)
    content = response.choices[0].message.content.strip()

    # Strip markdown code fences if present
    if content.startswith("```"):
        content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    return json.loads(content)


async def execute_step(state: AgentState) -> dict[str, Any]:
    """Execute the current step from the plan using the appropriate tool."""
    idx = state.get("current_step_index", 0)
    plan = state.get("plan", [])

    if idx >= len(plan):
        return {"status": "summarizing"}

    current_step = plan[idx]
    tool_name = current_step.get("tool_name")
    logger.info(
        f"Node: execute_step — Step {current_step['step_number']}: "
        f"{current_step['description']} (tool: {tool_name})"
    )

    # If step has no tool, it's a reasoning step — use LLM directly
    if not tool_name:
        messages = [
            {"role": "system", "content": EXECUTOR_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Step: {current_step['description']}\n"
                    f"Context from previous steps: {json.dumps(state.get('step_results', []))}"
                ),
            },
        ]
        response = await chat_completion(messages=messages)
        result = StepResult(
            step_number=current_step["step_number"],
            tool_name="reasoning",
            tool_input={},
            tool_output=response.choices[0].message.content,
            reasoning="Direct LLM reasoning step",
            error=None,
            retry_count=0,
            tokens_used=response.usage.total_tokens if response.usage else 0,
            latency_ms=0,
            status="completed",
        )
        plan[idx]["status"] = "completed"
        return {
            "step_results": [result],
            "plan": plan,
            "current_step_index": idx + 1,
        }

    # Check if this tool requires human approval
    tool = get_tool_by_name(tool_name)
    if tool and tool.requires_approval and not state.get("approval_granted"):
        # Extract the question and options from tool_input when available
        raw_input = current_step.get("tool_input", {}) or {}
        if isinstance(raw_input, str):
            try:
                raw_input = json.loads(raw_input)
            except (json.JSONDecodeError, ValueError):
                raw_input = {}

        question = raw_input.get("question", "") if isinstance(raw_input, dict) else ""
        options = raw_input.get("options") if isinstance(raw_input, dict) else None

        # Fall back to step description if no explicit question was provided
        if not question:
            question = f"I need your input to proceed: {current_step['description']}"

        return {
            "status": "waiting_approval",
            "requires_approval": True,
            "approval_request": {
                "action": current_step["description"],
                "tool_name": tool_name,
                "tool_input": raw_input,
                "question": question,
                "reason": question,
                "options": options or ["approve", "reject", "edit"],
            },
            # Append the question as an assistant message so chat UI can display it
            "messages": [{"role": "assistant", "content": question}],
        }

    # Execute the tool
    if not tool:
        result = StepResult(
            step_number=current_step["step_number"],
            tool_name=tool_name,
            tool_input=current_step.get("tool_input", {}),
            tool_output=None,
            reasoning=f"Tool '{tool_name}' not found",
            error=f"Unknown tool: {tool_name}",
            retry_count=0,
            tokens_used=0,
            latency_ms=0,
            status="failed",
        )
        plan[idx]["status"] = "failed"
        return {"step_results": [result], "plan": plan}

    try:
        from pydantic import ValidationError

        raw_input = current_step.get("tool_input", {}) or {}
        if isinstance(raw_input, str):
            try:
                tool_input = json.loads(raw_input)
            except (json.JSONDecodeError, ValueError):
                tool_input = {}
        else:
            tool_input = dict(raw_input)

        # Remove internal context key before passing to tool
        clean_input = {k: v for k, v in tool_input.items() if not k.startswith("_")}

        # Try validating the planner-provided input first
        needs_llm_args = False
        try:
            validated_model = tool.input_schema.model_validate(clean_input)
            validated_input = validated_model.model_dump()
        except ValidationError:
            # Planner gave bad/empty input — try filtering to expected fields
            expected_fields = set(tool.input_schema.model_fields.keys())
            filtered_input = {k: v for k, v in clean_input.items() if k in expected_fields}
            try:
                validated_model = tool.input_schema.model_validate(filtered_input)
                validated_input = validated_model.model_dump()
            except ValidationError:
                # Still failing — need LLM to construct arguments
                needs_llm_args = True

        if needs_llm_args:
            logger.info(
                f"Planner tool_input invalid for '{tool_name}', "
                f"using LLM to construct arguments"
            )
            llm_args = await _llm_construct_tool_args(
                tool=tool,
                step_description=current_step["description"],
                previous_results=state.get("step_results", []),
                original_prompt=state.get("original_prompt", ""),
            )
            validated_model = tool.input_schema.model_validate(llm_args)
            validated_input = validated_model.model_dump()

        tool_output = await tool.execute(**validated_input)

        result = StepResult(
            step_number=current_step["step_number"],
            tool_name=tool_name,
            tool_input=validated_input,
            tool_output=tool_output,
            reasoning=f"Executed {tool_name} successfully",
            error=None,
            retry_count=state.get("retry_count", 0),
            tokens_used=0,
            latency_ms=0,
            status="completed",
        )
        plan[idx]["status"] = "completed"
        plan[idx]["result"] = tool_output

    except Exception as e:
        logger.error(f"Tool execution failed: {e}")
        result = StepResult(
            step_number=current_step["step_number"],
            tool_name=tool_name,
            tool_input=current_step.get("tool_input", {}),
            tool_output=None,
            reasoning=f"Tool execution failed: {str(e)}",
            error=str(e),
            retry_count=state.get("retry_count", 0),
            tokens_used=0,
            latency_ms=0,
            status="failed",
        )
        plan[idx]["status"] = "failed"

    return_dict = {
        "step_results": [result],
        "plan": plan,
        "current_step_index": idx + 1,
        "approval_granted": False,
    }
    
    if result["status"] == "completed":
        return_dict["retry_count"] = 0
        
    return return_dict


async def evaluate_progress(state: AgentState) -> dict[str, Any]:
    """Evaluate the result of the last step and decide next action."""
    logger.info("Node: evaluate_progress — Assessing execution progress")

    plan = state.get("plan", [])
    step_results = state.get("step_results", [])
    current_idx = state.get("current_step_index", 0)
    max_steps = state.get("max_steps", 20)

    # Check hard step limit
    if len(step_results) >= max_steps:
        logger.warning(f"Max steps ({max_steps}) reached, forcing summarization")
        return {"status": "summarizing"}

    # If the previous node explicitly requested human approval, preserve that state
    if state.get("status") == "waiting_approval":
        return {"status": "waiting_approval"}

    # Check if the last step failed before checking completion, so failures on the final step are retried/replanned!
    if step_results:
        last_result = step_results[-1]
        if last_result.get("status") == "failed":
            retry_count = state.get("retry_count", 0)
            if retry_count < 2:
                logger.info(f"Step failed, retrying (attempt {retry_count + 1})")
                return {
                    "status": "executing",
                    "current_step_index": current_idx - 1,  # Retry current step
                    "retry_count": retry_count + 1,
                }
            else:
                logger.info("Step failed after retries, replanning")
                return {"status": "replanning"}

    # Check if all steps are done
    if current_idx >= len(plan):
        return {"status": "summarizing"}

    # All good, continue to next step
    return {"status": "executing"}


async def replan(state: AgentState) -> dict[str, Any]:
    """Modify the plan when a step fails or produces unexpected results."""
    logger.info("Node: replan — Adjusting execution plan")

    messages = [
        {"role": "system", "content": REPLANNER_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Original goal: {state['original_prompt']}\n\n"
                f"Current plan: {json.dumps(state.get('plan', []))}\n\n"
                f"Completed results: {json.dumps(state.get('step_results', []))}\n\n"
                f"The plan needs adjustment. Generate a revised plan as a JSON array."
            ),
        },
    ]

    response = await chat_completion(messages=messages)
    content = response.choices[0].message.content

    try:
        clean = content.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1].rsplit("```", 1)[0]
        new_plan_data = json.loads(clean)
    except (json.JSONDecodeError, AttributeError):
        # If replanning fails, move to summarization with partial results
        return {"status": "summarizing"}

    new_plan: list[PlanStep] = []
    for i, step in enumerate(new_plan_data):
        new_plan.append(
            PlanStep(
                step_number=step.get("step_number", i + 1),
                description=step.get("description", ""),
                tool_name=step.get("tool_name"),
                tool_input=step.get("tool_input"),
                depends_on=step.get("depends_on", []),
                status="pending",
            )
        )

    return {
        "plan": new_plan,
        "current_step_index": 0,
        "status": "planning",
        "retry_count": 0,
    }


async def wait_for_human(state: AgentState) -> dict[str, Any]:
    """
    Pause execution and wait for human input/approval.

    Uses LangGraph's interrupt() to pause the graph. When the frontend
    sends Command(resume={"response": "..."}), interrupt() returns the
    user's response and execution continues.
    """
    from langgraph.types import interrupt

    logger.info("Node: wait_for_human — Pausing for human input")

    approval_request = state.get("approval_request", {})

    # interrupt() pauses the graph here. When resumed via
    # Command(resume={"response": "user's answer"}), it returns that value.
    user_response = interrupt(approval_request)

    logger.info(f"Node: wait_for_human — Received human response: {user_response}")

    # Extract the user's text response
    response_text = ""
    if isinstance(user_response, dict):
        response_text = user_response.get("response", str(user_response))
    elif isinstance(user_response, str):
        response_text = user_response

    return {
        "status": "evaluating",
        "requires_approval": False,
        "approval_request": None,
        "approval_granted": True,
        "messages": [{"role": "user", "content": response_text}],
    }


async def summarize(state: AgentState) -> dict[str, Any]:
    """Generate a comprehensive summary of the execution."""
    logger.info("Node: summarize — Generating execution summary")

    step_summaries = []
    for r in state.get("step_results", []):
        output_preview = str(r.get("tool_output", ""))[:200]
        step_summaries.append(
            f"Step {r['step_number']} ({r['tool_name']}): "
            f"{r.get('reasoning', 'No reasoning')} → {output_preview}"
        )

    messages = [
        {"role": "system", "content": SUMMARIZER_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Original request: {state['original_prompt']}\n\n"
                f"Steps executed:\n" + "\n".join(step_summaries) + "\n\n"
                f"Total steps: {len(state.get('step_results', []))}\n"
                f"Constraints: {json.dumps(state.get('constraints', {}))}\n\n"
                "Generate the execution summary."
            ),
        },
    ]

    response = await chat_completion(messages=messages)
    summary = response.choices[0].message.content

    total_tokens = sum(r.get("tokens_used", 0) for r in state.get("step_results", []))

    return {
        "final_summary": summary,
        "total_tokens": total_tokens,
        "status": "saving_memory",
    }


async def save_memory(state: AgentState) -> dict[str, Any]:
    """Save learned facts and preferences to long-term memory."""
    logger.info("Node: save_memory — Persisting learned information")

    # TODO: Integrate Mem0 to extract and store new user facts
    # from the execution results and summary

    return {"status": "completed"}


# ─────────────────────────────────────────────────────────────────────
# Routing Functions
# ─────────────────────────────────────────────────────────────────────


def route_after_evaluation(state: AgentState) -> str:
    """Route based on the evaluation result."""
    status = state.get("status", "")
    if status == "executing":
        return "execute_step"
    elif status == "replanning":
        return "replan"
    elif status == "waiting_approval":
        return "wait_for_human"
    elif status == "summarizing":
        return "summarize"
    else:
        return "summarize"  # Default: summarize and finish


def route_after_plan(state: AgentState) -> str:
    """Route based on planning result."""
    if state.get("plan"):
        return "execute_step"
    else:
        return "summarize"


def route_after_approval(state: AgentState) -> str:
    """Route after human approval decision."""
    if state.get("status") == "evaluating":
        return "evaluate_progress"
    elif state.get("status") == "replanning":
        return "replan"
    else:
        return "evaluate_progress"


# ─────────────────────────────────────────────────────────────────────
# Graph Construction
# ─────────────────────────────────────────────────────────────────────


def build_agent_graph() -> StateGraph:
    """
    Build and compile the LangGraph agent state machine.

    Returns a compiled graph ready for invocation.
    """
    graph = StateGraph(AgentState)

    # Add nodes
    graph.add_node("parse_input", parse_input)
    graph.add_node("load_memory", load_memory)
    graph.add_node("plan_task", plan_task)
    graph.add_node("execute_step", execute_step)
    graph.add_node("evaluate_progress", evaluate_progress)
    graph.add_node("replan", replan)
    graph.add_node("wait_for_human", wait_for_human)
    graph.add_node("summarize", summarize)
    graph.add_node("save_memory", save_memory)

    # Set entry point
    graph.set_entry_point("parse_input")

    # Add edges
    graph.add_edge("parse_input", "load_memory")
    graph.add_edge("load_memory", "plan_task")

    # Conditional routing after planning
    graph.add_conditional_edges("plan_task", route_after_plan)

    # After executing a step, evaluate progress
    graph.add_edge("execute_step", "evaluate_progress")

    # Conditional routing after evaluation
    graph.add_conditional_edges("evaluate_progress", route_after_evaluation)

    # After replanning, go back to plan_task
    graph.add_edge("replan", "plan_task")

    # After human approval, route accordingly
    graph.add_conditional_edges("wait_for_human", route_after_approval)

    # After summarizing, save memory
    graph.add_edge("summarize", "save_memory")

    # Save memory is the final node
    graph.add_edge("save_memory", END)

    memory = MemorySaver()
    return graph.compile(
        checkpointer=memory,
    )


# Module-level compiled graph (singleton)
agent_graph = build_agent_graph()
