FROM python:3.12-slim

# Copy uv from official Astral image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Install essential system packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency definition files first for caching
COPY pyproject.toml uv.lock ./

# Install dependencies using uv
RUN uv sync --frozen --no-cache

# Put virtual environment in system PATH for easy command execution
ENV PATH="/app/.venv/bin:$PATH"

# Copy source code and runtime configurations
COPY . .

EXPOSE 8000

# Default start command for FastAPI Web Server (uses $PORT if provided by Railway, defaults to 8000)
CMD ["sh", "-c", "uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
