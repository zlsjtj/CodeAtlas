# CodeAtlas

Read unfamiliar codebases in a local workspace.

[![CI](https://github.com/zlsjtj/CodeAtlas/actions/workflows/ci.yml/badge.svg)](https://github.com/zlsjtj/CodeAtlas/actions/workflows/ci.yml)
[MIT](LICENSE) · [中文](README.md) | English

Browse files, search symbols, and read source in one workspace, without a model key. Connect a model when you need explanations and inspect its references.

## Follow One Question

**How does Click's `@command()` turn a function into an executable command?**

<picture>
  <source media="(max-width: 600px)" srcset="docs/assets/codeatlas-reading-mobile.png">
  <source media="(prefers-reduced-motion: reduce)" srcset="docs/assets/codeatlas-reading.png">
  <img alt="Searching callback=f in Click, inspecting how the decorator stores the function, then finding the callback invocation" src="docs/assets/codeatlas-reading.gif">
</picture>

Actual workspace recording at original speed, with no model calls. Phones show a single-column still. [Full animation](docs/assets/codeatlas-reading.gif) · [Case and recording details](docs/reading-example.md). Real-model Q&A has not yet been validated against the fixed cases.

In the pinned checkout:

1. Search `callback=f`: the decorator creates a command with the original function as its callback, [decorators.py:248](https://github.com/pallets/click/blob/06b2a678741131fd577ce170e23e5ca0aeba0309/src/click/decorators.py#L248).
2. Search `self.callback = callback`: `Command` stores that callback, [core.py:1090](https://github.com/pallets/click/blob/06b2a678741131fd577ce170e23e5ca0aeba0309/src/click/core.py#L1090).
3. Search `ctx.invoke(self.callback`: command execution passes the parsed parameters to the callback, [core.py:1442](https://github.com/pallets/click/blob/06b2a678741131fd577ce170e23e5ca0aeba0309/src/click/core.py#L1442).

This is a manual source-reading path, not an automatically generated call graph.

## Try It Locally

Install Python 3.11+, Node.js 20.12+, and Git, then:

```sh
git clone https://github.com/zlsjtj/CodeAtlas.git
cd CodeAtlas
npm run setup
npm run demo
```

Open the printed URL. Click is already imported and indexed: search `callback=f` in Text mode and open a result to follow the example. The first run downloads the pinned commit from GitHub.

The example uses a separate database in `data/demo` and checkout in `repos/examples`. It leaves `.env` unchanged and does not use your model key. Repeated runs reuse the checkout; local changes stop setup instead of being reset. Press `Ctrl+C` to stop.

For your own repositories, use `npm run dev`, import a local directory or public GitHub repository with the top `+` button, then index it. The commands work in Windows PowerShell and Ubuntu. Occupied ports are skipped automatically. [Startup details](docs/development.md)

### Docker Compose

With Docker and Compose installed, run from the project root:

```sh
docker compose up --build --wait
```

Open [127.0.0.1:3000](http://127.0.0.1:3000) and import a public repository. Docker does not preload the pinned example above; local source needs an [explicit mount](docs/development.md#docker-挂载与端口). Ports bind only to loopback, named volumes retain data, and `docker compose down` preserves them.

### Optional Q&A

Set `OPENAI_API_KEY` and `CODE_AGENT_OPENAI_MODEL` in the root `.env`; compatible services can also use `OPENAI_BASE_URL`. Start with `npm run dev`, or rerun Compose after changing configuration.

Q&A and drafts send relevant source to the model service and incur API costs. Keys stay on the backend. A configured key does not establish service availability. [Real-model validation status](docs/evidence/qa-status.json)

## Limits

- Retrieval uses keywords and line-based chunks; symbol matching uses regexes, not an AST or semantic index. Cross-file questions may miss evidence.
- Reads are limited to 200 lines. Tree, search, read and draft operations share exclusions for `.gitignore`, common credential paths and symlinks. Path filtering is not secret detection inside source files.
- Drafts are intended for small files. Applying checks the original file hash; apply-and-check rollback restores only the patched target files, not other effects of test scripts.
- pytest and npm scripts execute repository code. Run checks only on trusted repositories. There is no execution sandbox, authentication or multi-user isolation; do not expose the service publicly.

## Development and Feedback

FastAPI / SQLite backend, Next.js frontend.

[Development commands](docs/development.md) · [Design notes](docs/design-notes.md) · [Late-response maintenance case](docs/maintenance-reading.md)

[Report a problem](https://github.com/zlsjtj/CodeAtlas/issues/new/choose) with steps and a minimal public example; remove keys and private code. CodeAtlas is [MIT-licensed](LICENSE). Click source shown in the demo retains its [third-party license](THIRD_PARTY_NOTICES.md).
