# PersonalAI — Autonomous Goal-Oriented Personal Assistant Agent

An autonomous AI agent that ingests high-level natural language instructions, decomposes them into multi-step action plans, orchestrates tool calls across external APIs, self-corrects on failures, pauses for human approval on high-risk actions, and delivers transparent execution summaries.

## 🏗️ Architecture

- **Frontend:** Next.js 15 (React 19) + Shadcn/ui + xyflow
- **Backend:** FastAPI (Python 3.12)
- **Agent Core:** LangGraph + PydanticAI
- **LLM Gateway:** LiteLLM (6-tier free provider cascade)
- **Orchestration:** Temporal.io (durable execution)
- **Database:** Supabase (PostgreSQL + pgvector)
- **Memory:** Mem0 (semantic) + pgvector (episodic)
- **Observability:** Langfuse

## 📁 Project Structure

```
PersonalAi/
├── apps/
│   ├── web/          # Next.js 15 Frontend
│   └── api/          # FastAPI Backend + Agent Core
├── packages/
│   └── shared-types/ # Shared TypeScript types
└── infra/            # Docker & deployment configs
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Python 3.12+
- Docker & Docker Compose
- [uv](https://docs.astral.sh/uv/) (Python package manager)

### 1. Clone & Install

```bash
git clone <repo-url>
cd PersonalAi

# Frontend
cd apps/web
npm install

# Backend
cd ../api
uv sync
```

### 2. Environment Variables

```bash
cp .env.example .env
# Fill in your free API keys (see .env.example for instructions)
```

### 3. Start Infrastructure

```bash
docker-compose up -d  # Starts Temporal, Redis, PostgreSQL
```

### 4. Run Development Servers

```bash
# Terminal 1 — Backend
cd apps/api
uv run uvicorn src.main:app --reload --port 8000

# Terminal 2 — Temporal Worker
cd apps/api
uv run python -m src.workflows.worker

# Terminal 3 — Frontend
cd apps/web
npm run dev
```

### 5. Open the App

Navigate to [http://localhost:3000](http://localhost:3000)

## 🔑 Free API Keys

All LLM providers and tool APIs use **free tiers**. See [.env.example](.env.example) for signup links.

| Provider | Purpose | Signup |
|---|---|---|
| Groq | Primary LLM (Ultrafast LLaMA 3.3 70B) | [console.groq.com](https://console.groq.com) |
| Cerebras | Secondary LLM (1M tokens/day) | [inference.cerebras.ai](https://inference.cerebras.ai) |
| Google Gemini | Tertiary LLM | [aistudio.google.com](https://aistudio.google.com) |
| GitHub Models | Fallback LLM (GPT-4o-mini) | Any GitHub account |
| OpenRouter | Fallback LLM pool | [openrouter.ai](https://openrouter.ai) |
| Supabase | Database + Auth | [supabase.com](https://supabase.com) |
| Yelp Fusion | Restaurant search | [fusion.yelp.com](https://fusion.yelp.com) |
| SerpApi | Flight/hotel search | [serpapi.com](https://serpapi.com) |

## 📜 License

MIT
