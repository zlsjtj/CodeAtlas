FROM node:20-bookworm-slim AS node-runtime
FROM python:3.12-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*
COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
COPY --from=node-runtime /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/npm
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx
WORKDIR /app/backend
COPY LICENSE THIRD_PARTY_NOTICES.md /app/licenses/
COPY backend/ ./
RUN python -m pip install --no-cache-dir -e ".[dev]" \
    && useradd --uid 10001 --create-home codeatlas \
    && mkdir -p /app/data /app/repos \
    && chown -R codeatlas:codeatlas /app/data /app/repos
ENV CODE_AGENT_DATA_DIR=/app/data \
    CODE_AGENT_DATABASE_PATH=/app/data/code_repo_agent.db \
    CODE_AGENT_REPOS_DIR=/app/repos \
    CODE_AGENT_DEBUG=false \
    PYTHONUNBUFFERED=1
USER codeatlas
EXPOSE 8000
HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=12 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=2)"
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
