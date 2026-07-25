# PersonalAI: Comprehensive Project Context & Architecture Guide

This document provides a comprehensive deep-dive into the architectural context, system design, data flow, and functional breakdown of every core module and file within the **PersonalAI** ecosystem.

---

## 🌟 1. Project Overview & Vision

**PersonalAI** is an autonomous, goal-oriented personal assistant agent capable of turning high-level natural language instructions into concrete, multi-step execution plans. Unlike traditional chat completion models, PersonalAI operates as a **durable, tool-calling state machine** that:
- **Decomposes Complex Tasks**: Breaks amorphous user intentions into structured, step-by-step action graphs.
- **Orchestrates Tools**: Interacts natively with live external APIs (Web Search, Yelp, SerpApi Flights/Hotels, Weather, News, Maps, and targeted Web Scraping).
- **Self-Corrects & Adapts**: Evaluates failed tool calls or parsing errors autonomously and attempts recovery routes.
- **Enforces Safety & Control**: Pauses execution dynamically to request human approval before committing high-risk actions (e.g., booking, external mutations).
- **Maintains Dual Memory**: Leverages conversational semantic memory (Mem0) alongside episodic vector storage (Supabase PostgreSQL + `pgvector`) for long-term personalized context.

---

## 🏗️ 2. System Architecture & Tech Stack

```
               ┌───────────────────────────────┐
               │    Next.js 15 Frontend        │
               │ (Chat UI & xyflow Graph View) │
               └──────────────┬────────────────┘
                              │ Real-time Streaming (SSE) / REST
               ┌──────────────▼────────────────┐
               │     FastAPI Backend Router     │
               │         (Python 3.12)         │
               └──────────────┬────────────────┘
                              │ Dispatches Tasks
               ┌──────────────▼────────────────┐
               │      Temporal.io Engine       │
               │    (Durable State & Workers)  │
               └──────────────┬────────────────┘
                              │ Drives Workflow
               ┌──────────────▼────────────────┐
               │    LangGraph + PydanticAI     │
               │  (Agent State & Node Execution)│
               └──────┬───────────────┬────────┘
                      │               │
         ┌────────────▼───────┐ ┌─────▼──────────────┐
         │ LiteLLM Router     │ │ External API Tools │
         │ (6-Tier LLM Cascade)│ │ (Yelp, SerpApi, etc)│
         └────────────────────┘ └────────────────────┘
```

| Component | Technology | Role / Benefit |
|---|---|---|
| **Frontend** | **Next.js 15 (React 19)** + **Shadcn/ui** + **xyflow** | Delivers responsive chat interface and renders real-time execution node graphs as the agent reasons and executes tool calls. |
| **Backend API** | **FastAPI** (Python 3.12) + **Pydantic** | Asynchronous high-performance web API providing REST endpoints and Server-Sent Events (SSE) streaming. |
| **Agent Core** | **LangGraph** + **PydanticAI** | Manages cyclic agent execution graphs, validation of tool outputs, and conditional branching. |
| **LLM Gateway** | **LiteLLM** | Implements robust failover routing across 6 free-tier provider cascades (Cerebras → Gemini → GitHub Models → Groq → OpenRouter). |
| **Orchestration** | **Temporal.io** | Guarantees durable execution; prevents loss of state during network disconnects, server restarts, or long human-in-the-loop pauses. |
| **Storage & Memory**| **Supabase (PostgreSQL + pgvector)** + **Mem0** | Handles relational database state, user sessions, and semantic embeddings for short/long-term context retention. |

---

## 🔄 3. End-to-End Execution Workflow

When a user submits a goal in the UI (e.g., *"Find me a good sushi place in downtown Seattle and check the evening weather"*):

1. **Submission & Ingestion**:
   - The React UI invokes an API call via **`apps/web/src/stores/execution-store.ts`**.
   - The request hits **`apps/api/src/api/executions.py`**, where FastAPI validates the payload and authenticates the user via middleware (**`apps/api/src/api/middleware.py`**).

2. **Durable Task Scheduling**:
   - Instead of blocking HTTP requests, the API calls **`apps/api/src/services/execution_service.py`** which initiates a **Temporal Workflow** defined in **`apps/api/src/workflows/agent_execution.py`**.
   - The backend immediately returns a workflow execution ID to the frontend.
   - The frontend connects to an SSE streaming endpoint (**`apps/api/src/services/streaming_service.py`**) to receive real-time execution events.

3. **Graph Execution & Reasoning**:
   - A dedicated Temporal Worker process (**`apps/api/src/workflows/worker.py`**) executes the core **LangGraph state machine** defined in **`apps/api/src/agent/graph.py`**.
   - **State Initialization**: Initializes agent memory and variables using **`apps/api/src/agent/state.py`**.
   - **Prompt Framing**: Injects operational instructions and user context from **`apps/api/src/agent/prompts.py`**.
   - **LLM Selection**: Queries **`apps/api/src/agent/llm_router.py`**, automatically attempting fast providers (like Cerebras or Gemini) with automatic fallback.

4. **Tool Orchestration & Human Approval**:
   - As the LangGraph agent determines it needs data, it invokes dedicated tool adapters in **`apps/api/src/agent/tools/`** (e.g., `yelp.py` for restaurant lookup and `weather.py` for evening forecast).
   - If a proposed action triggers safety rules (handled by `human_input.py`), LangGraph halts execution and transitions to a paused status waiting for user validation on the frontend.

5. **Presentation & UI Graph Rendering**:
   - Each state transition, reasoning step, and tool execution is broadcast via SSE to the frontend.
   - The Next.js UI updates **`execution-store.ts`** and visually constructs an interactive execution map using **xyflow** within **`apps/web/src/components/graph/`**.

---

## 📁 4. Comprehensive File-by-File Breakdown

### Backend (`apps/api/src/`)

#### Core Application & Configurations
- **[config.py](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/api/src/config.py)**: Loads and exposes global environment settings, LLM endpoint keys, database URLs, and Temporal connection parameters using Pydantic settings.
- **[dependencies.py](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/api/src/dependencies.py)**: Defines shared FastAPI dependency injection providers (e.g., database session handles, active user auth context, Langfuse monitoring tracers).
- **[main.py](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/api/src/main.py)**: The core entry point for the backend server; initializes FastAPI, registers CORS policies, mounts middlewares, and attaches all REST routers.

#### Agent Core (`apps/api/src/agent/`)
- **[graph.py](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/api/src/agent/graph.py)**: *The engine of PersonalAI.* Houses the LangGraph directional state machine, defining nodes for planning, reasoning, tool executing, self-correcting, and final synthesis.
- **[state.py](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/api/src/agent/state.py)**: Specifies the strict typed state schemas (via Pydantic) passed between nodes across the lifetime of a task execution.
- **[prompts.py](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/api/src/agent/prompts.py)**: Stores system prompts, reasoning heuristics, formatting constraints, and reflection templates used to steer LLM accuracy.
- **[llm_router.py](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/api/src/agent/llm_router.py)**: Implements LiteLLM wrapper routing to achieve maximum uptime and zero cost by falling back gracefully across provider tiers when rate-limits occur.

#### External Integration Tools (`apps/api/src/agent/tools/`)
- **[base.py](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/api/src/agent/tools/base.py)**: Abstract base class enforcing standard interfaces, execution error handling, and timeout policies for all agent tools.
- **[human_input.py](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/api/src/agent/tools/human_input.py)**: Interrupts workflow processing to explicitly prompt the end-user for confirmation on sensitive or ambiguous operations.
- **[web_search.py](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/api/src/agent/tools/web_search.py)**: Executes real-time general internet searches to retrieve live current-event context.
- **[web_scrape.py](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/api/src/agent/tools/web_scrape.py)**: Fetches and cleans plain-text content from target URLs for deep reading and extraction by the LLM.
- **[yelp.py](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/api/src/agent/tools/yelp.py)**: Integrates with the Yelp Fusion API to search restaurants, retrieve pricing, ratings, and customer reviews.
- **[weather.py](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/api/src/agent/tools/weather.py)**: Connects to free meteorology APIs to pull current atmospheric conditions and localized forecasts.
- **[maps.py](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/api/src/agent/tools/maps.py)**: Handles location geocoding, distance calculation, and routing logic.
- **[news.py](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/api/src/agent/tools/news.py)**: Retrieves latest breaking headlines and filtered topic articles from news aggregator feeds.

#### REST Endpoints & API Routing (`apps/api/src/api/`)
- **[executions.py](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/api/src/api/executions.py)**: Manages endpoints to trigger new agent runs, inspect execution logs, abort running tasks, and resume paused workflows.
- **[chat.py](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/api/src/api/chat.py)**: Handles real-time conversational interactions and SSE websocket/HTTP chunk streaming connections.
- **[middleware.py](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/api/src/api/middleware.py)**: Enforces global HTTP headers, request timing metrics, structured logging, and authentication validation.
- **[router.py](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/api/src/api/router.py)**: Aggregates sub-routers (`auth.py`, `conversations.py`, `executions.py`, `memory.py`, `tools.py`) into a single cleanly versioned API path hierarchy.

#### Workflows & Async Orchestration (`apps/api/src/workflows/`)
- **[agent_execution.py](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/api/src/workflows/agent_execution.py)**: Encapsulates LangGraph execution inside a resilient Temporal workflow, guaranteeing retries on transient network disconnects and state preservation across system rebuilds.
- **[worker.py](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/api/src/workflows/worker.py)**: Dedicated polling background daemon that binds to Temporal queues and performs actual compute tasks asynchronously from web serving.

#### Business Logic & Domain Models
- **[services/execution_service.py](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/api/src/services/execution_service.py)**: Bridges REST endpoint directives with Temporal job dispatches, tracking execution lifecycle changes in the database.
- **[services/streaming_service.py](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/api/src/services/streaming_service.py)**: Converts internal workflow state emissions and agent token streams into robust SSE format for UI rendering.
- **[models/*.py](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/api/src/models)**: Relational mapping definitions (`execution.py`, `conversation.py`, `memory.py`, `tool.py`, `user.py`, `database.py`) defining table schemas stored in Supabase PostgreSQL.

---

### Frontend (`apps/web/src/`)

#### Application Layout & Pages (`apps/web/src/app/`)
- Implements Next.js 15 App Router conventions with global error boundaries, responsive server layouts, and routing pages for active chats and execution histories.

#### Interactive UI Components (`apps/web/src/components/`)
- **[components/chat/](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/web/src/components/chat)**: Contains user input bars, markdown-rendered message feeds, streaming thinking indicators, and rich human-approval dialogue prompts.
- **[components/graph/](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/web/src/components/graph)**: Implements interactive node charts via **xyflow**, letting users visually navigate how the LLM broke down a prompt into parallel tool invocations and sub-decisions.
- **[components/layout/](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/web/src/components/layout)**: Houses structural navigation bars, sidebar conversation switchers, user profiles, and theme toggles.

#### State & Storage Stores (`apps/web/src/stores/`)
- **[execution-store.ts](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/web/src/stores/execution-store.ts)**: Client-side store (built with Zustand/React state mechanics) that orchestrates ongoing agent executions, aggregates live SSE stream messages, and tracks node state transitions.
- **[ui-store.ts](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/web/src/stores/ui-store.ts)**: Manages general UI behavior, including sidebar visibility, modal dialog triggers, theme preference toggling, and active panel switching.

#### Shared Helpers (`apps/web/src/lib/` & `apps/web/src/hooks/`)
- Consists of customized frontend abstractions for handling authenticated API request headers, date/time formatting, and UI hook lifecycles. For example, **[utils.test.ts](file:///c:/Users/odeda/Desktop/Projects/PersonalAi/apps/web/src/lib/utils.test.ts)** ensures core frontend formatting and parsing utilities maintain strict reliability.

---

## 🛠️ 5. Developing and Running Locally

To work on any subsystem, run the following three processes concurrently across distinct terminals after initiating backend containers via Docker:

1. **Database & Infrastructure Support**:
   ```bash
   docker-compose up -d # Spins up local Temporal server, Redis cache, and Postgres instances
   ```
2. **FastAPI Backend Server** (Terminal 1):
   ```bash
   cd apps/api && uv run uvicorn src.main:app --reload --port 8000
   ```
3. **Temporal Job Orchestration Worker** (Terminal 2):
   ```bash
   cd apps/api && uv run python -m src.workflows.worker
   ```
4. **Next.js 15 Web Application** (Terminal 3):
   ```bash
   cd apps/web && npm run dev
   ```

*(Access the primary web user dashboard at [http://localhost:3000](http://localhost:3000) and API Interactive Swagger Docs at [http://localhost:8000/docs](http://localhost:8000/docs)).*

---

## 📝 6. Recent Architecture & Feature Updates

### Neural Storage / Memory Management
- **Dashboard UI**: Integrated a full `MemoryManager` into the dashboard page (`apps/web/src/app/dashboard/page.tsx`), transitioning it from a read-only viewer to an interactive editor. Added visual confidence progress bars, "Add Memory" functionality, and modal editing flows in `MemoryManager.tsx`.
- **Backend Memory Tools**: Added dedicated agent tools for explicitly saving both conversational facts (`save_memory_fact`) and user preferences (`save_user_preference`) directly into the Supabase PostgreSQL tables.
- **Cross-Chat Memory Integration**: Connected the LangGraph `load_memory` node (`apps/api/src/agent/graph.py`) to query the Supabase client directly, fetching semantic facts and preferences so the AI agent retains memory state across separate chat sessions.

### Core Bug Fixes
- **LangGraph Interrupt Parsing Error**: Resolved a critical crash (`'tuple' object has no attribute 'get'`) in the SSE generator (`apps/api/src/api/chat.py`) that occurred when the agent attempted to request human approval. LangGraph yields interrupted states as a tuple of `Interrupt` objects; the stream handler now properly checks types to prevent parsing exceptions.
- **LLM Rate-Limit Logging**: Augmented backend error logging (`logger.error(..., exc_info=True)`) to properly surface Litellm fallback exhaustion traces, aiding in diagnosing model exhaustion bottlenecks.
