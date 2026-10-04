# CodeAtlas

Codebase Q&A with file references, patch previews, and checks.

[![CI](https://github.com/zlsjtj/CodeAtlas/actions/workflows/ci.yml/badge.svg)](https://github.com/zlsjtj/CodeAtlas/actions/workflows/ci.yml)

[中文](README.md) | English

CodeAtlas is a local web workspace for exploring a repository and reviewing small code changes. Ask a question, inspect file references and tool-call summaries, then review a diff before applying it.

It is intended for exploring unfamiliar code and making changes to one or a few files, in a single-user local setup.

![CodeAtlas checks panel showing a passing pytest run on a local example repository](docs/assets/codeatlas-workspace.png)

The screenshot shows the checks panel. Q&A, patch drafts, and checks share the same workspace. The interface supports Chinese and English.

| Task | What you can inspect |
| --- | --- |
| Find a feature's entry point | File references, excerpts, and a summary of tool calls |
| Change a few files | Full-file drafts and unified diffs; file hashes are checked before applying |
| Check a change | Discovered pytest / npm checks, exit codes, and output; apply-and-check restores the patched target files when checks fail |

## Run locally

Requirements: Python 3.11+, Node.js 20+, and Git. Importing, indexing, repository tools, and checks work without a model key. Q&A and patch generation require `OPENAI_API_KEY` and incur model API costs.

### 1. Clone

```sh
git clone https://github.com/zlsjtj/CodeAtlas.git
cd CodeAtlas
```

### 2. Start the backend

From the project root, copy `.env.example` on first setup. Keep your existing `.env` if you already have one. For Q&A, set `OPENAI_API_KEY` in `.env`; `CODE_AGENT_OPENAI_MODEL` selects the model.

macOS / Linux:

```sh
cp .env.example .env
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install -e ".[dev]"
.venv/bin/python -m uvicorn app.main:app --env-file ../.env --reload --port 8000
```

<details>
<summary>Windows PowerShell</summary>

```powershell
Copy-Item .env.example .env
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --env-file ../.env --reload --port 8000
```

</details>

`--env-file` loads the key into the backend process. Restart the backend after changing it. API docs are at [localhost:8000/docs](http://localhost:8000/docs).

### 3. Start the frontend

In a second terminal, from the project root:

```sh
cd frontend
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). The frontend connects to `http://localhost:8000` by default. To change this, set `NEXT_PUBLIC_API_BASE_URL` in `frontend/.env.local` and restart the frontend.

## First use

Try the project's own `frontend` directory:

1. Select a local repository in the import form and enter the absolute path to `CodeAtlas/frontend`.
2. Register the repository, start indexing, and wait until its status is ready.
3. Without a key, open the API docs, call `GET /api/repositories` to get its ID, and call `POST /api/tools/find-symbol`. Replace `repo_id` below with that ID:

```json
{"repo_id": 1, "name": "WorkspaceShell"}
```

The response should identify the definition in `components/workspace-shell.tsx`, including its path and line number. Paths are relative to the imported `frontend` directory.

With a key configured, try this in Q&A:

> Where is WorkspaceShell defined, and how does it switch between Q&A, patch drafts, and checks? Cite the relevant files.

Inspect the references and tool trace alongside the answer, and check them against the source files.

## Current limits

- Repositories and indexes are stored locally. Q&A and patch generation send relevant code to the model service. File access respects `.gitignore` files inside the imported directory and excludes `.env`, common private-key files, and symlinks by default. Example configs such as `.env.example` remain readable. This is path filtering, not secret detection inside source code; start with public code that contains no credentials.
- Retrieval uses keywords and line-based chunks; symbol lookup uses regexes. Cross-file questions can miss evidence, and returned citations need review.
- Drafts contain entire files and are intended for small files. Rollback restores the patched target files, not other side effects of test scripts.
- Only a limited set of check commands is discovered, but npm scripts and pytest execute repository code. Run checks only on trusted repositories. There is no execution sandbox.
- Authentication, multi-user isolation, and background-job recovery after restarts are not implemented. This is not intended as a public hosted service.

## Development and validation

The backend uses FastAPI, SQLAlchemy, SQLite, and the OpenAI Agents SDK. The frontend uses Next.js, with API types generated from FastAPI's OpenAPI schema. [Design notes](docs/design-notes.md) are available in Chinese.

Run `python -m pytest` in `backend` using its virtual environment, and `npm run typecheck` in `frontend`. CI runs both checks.

Tests cover [file exclusions and old-index access](backend/tests/test_file_access.py), [repository tools](backend/tests/test_tools.py), [stale patch rejection and rollback after failed checks](backend/tests/test_patches.py), and other backend behavior. Model generation is mocked in unit tests; there are no frontend end-to-end tests yet. These checks do not measure real model answer quality.

The [citation smoke runner](benchmarks/README.md) sends three questions to a running backend and checks for expected reference paths. It needs a key and an indexed **CodeAtlas project root**, not the `frontend` directory used above. It does not grade answer correctness, and no cross-repository results have been published.

## Feedback

[Open an issue](https://github.com/zlsjtj/CodeAtlas/issues) with your OS, command, and error for setup problems. For symbol lookup failures, include the symbol name and a small code example. For incorrect references, include the question, returned references, and expected files. Remove API keys and private code.
