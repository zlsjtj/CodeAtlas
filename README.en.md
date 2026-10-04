<h1 align="center">CodeAtlas</h1>

<p align="center"><strong>Read the code. Keep the trail.</strong></p>
<p align="center">Search source, check context, and turn code and notes into a shareable reading route.<br>Runs locally. No model key needed to read, annotate, or export.</p>

<p align="center">
  <a href="https://github.com/zlsjtj/CodeAtlas/actions/workflows/ci.yml"><img src="https://github.com/zlsjtj/CodeAtlas/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-0f766e" alt="MIT License"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="docs/examples/click-reading-route.en.md">Export example</a> ·
  <a href="docs/development.md">Docs</a> ·
  <a href="README.md">中文</a>
</p>

<picture>
  <source media="(max-width: 600px)" srcset="docs/assets/codeatlas-workflow-en-mobile.png">
  <source media="(prefers-reduced-motion: reduce)" srcset="docs/assets/codeatlas-workflow-en.png">
  <img alt="CodeAtlas in use: search Click's source, save an excerpt and note, reorder the reading route, and export Markdown" src="docs/assets/codeatlas-workflow-en.gif">
</picture>

<p align="center">Search → Annotate → Arrange → Export Markdown. A 40-second recording at original speed, with no model calls.<br>Starting with two saved stops, add the decorator to complete the route.<br><a href="docs/assets/codeatlas-workflow-en.gif">Watch the full demo</a> · <a href="docs/examples/click-workflow-route.en.md">Open the actual export</a> · <a href="docs/reading-example.en.md">Follow the walkthrough</a></p>

## From Finding Code to Explaining It

Start with a question when joining a project, investigating an implementation, or writing a source-code walkthrough.

- **Find the implementation.** Import a local directory or public GitHub repository and search text or symbols. Open a result to explore highlighted source, line numbers, and surrounding context alongside the file tree.
- **Keep what you learn.** Save important line ranges, add notes, and arrange them in reading order. Reopen a stop when you come back to the code.
- **Share the whole route.** Export Markdown with source excerpts, notes, line ranges, and version provenance. Give the next reader a path through the code, not just a list of filenames.

Routes stay in the current browser and can be exported at any time. [Using reading routes](docs/reading-route.md#english)

## Quick Start

With **Python 3.11+, Node.js 20.12+, and Git** installed:

```sh
git clone https://github.com/zlsjtj/CodeAtlas.git
cd CodeAtlas
npm run setup
npm run demo
```

Open the printed URL. **Click is already imported and indexed.** Search `callback=f` and open a result to follow the demo. The first run downloads a pinned Click revision. Demo data is separate; `.env` stays unchanged and its model key is not used. Press `Ctrl+C` to stop.

**Bring your own repository:** start with `npm run dev`, import it using the top `+` button, then build the index.

<details>
<summary><strong>Use Docker Compose</strong></summary>

After cloning this project, run from its root:

```sh
docker compose up --build --wait
```

Open [127.0.0.1:3000](http://127.0.0.1:3000) and import a public repository. Named volumes retain data after `docker compose down`. The preloaded Click example is provided by the native `npm run demo` command.

Local source requires an [explicit mount](docs/development.md#docker-挂载与端口). Ports bind only to loopback by default.

</details>

[Setup, ports, and data directories](docs/development.md) · [Releases](https://github.com/zlsjtj/CodeAtlas/releases)

## A Walkthrough You Can Take With You

**How does Click's `@command()` turn a function into a command?**

Follow three source locations, then save a route from command creation to callback execution:

1. [`decorators.py:248`](https://github.com/pallets/click/blob/06b2a678741131fd577ce170e23e5ca0aeba0309/src/click/decorators.py#L248): the decorator passes the original function to the command as its callback.
2. [`core.py:1090`](https://github.com/pallets/click/blob/06b2a678741131fd577ce170e23e5ca0aeba0309/src/click/core.py#L1090): `Command` stores the callback on the instance.
3. [`core.py:1442`](https://github.com/pallets/click/blob/06b2a678741131fd577ce170e23e5ca0aeba0309/src/click/core.py#L1442): command execution passes the parsed parameters to that callback.

**[Read the actual Markdown export →](docs/examples/click-reading-route.en.md)**

It contains three source excerpts, reading notes, and commit-pinned links, ready to read on GitHub. Use the same workflow to document your own repository.

<details>
<summary><strong>See the reading route workspace</strong></summary>

<picture>
  <source media="(max-width: 600px)" srcset="docs/assets/codeatlas-route-en-mobile.png">
  <img alt="CodeAtlas reading route with three Click source excerpts, notes, version provenance, and the Markdown export action" src="docs/assets/codeatlas-route-en.png">
</picture>

[Full walkthrough and reproduction steps](docs/reading-example.en.md) · [Source checks](docs/evidence/reading-route-en.json)

</details>

## Add a Model When You Need One

Ask questions in the same workspace, inspect citations and tool-call records, then open the source to check the answer. For changes, review the draft and diff before confirming an apply and running repository checks.

Set `OPENAI_API_KEY` and `CODE_AGENT_OPENAI_MODEL` in the root `.env`; compatible services can also use `OPENAI_BASE_URL`. Start with `npm run dev`, or rerun Compose after changing configuration. [Model setup and validation notes](docs/development.md#model-and-execution-notes)

Model features send relevant source to the configured service and incur API costs. Keys stay on the backend.

## Development and Community

Next.js / TypeScript frontend, FastAPI / SQLite backend. CI covers native startup on Windows and Ubuntu, plus Docker builds and runtime checks on Linux.

[Development and tests](docs/development.md) · [Design notes](docs/design-notes.md) · [A reproduced and fixed maintenance case](docs/maintenance-reading.md) · [Report a problem or idea](https://github.com/zlsjtj/CodeAtlas/issues/new/choose)

Keep the service local; do not expose it to the public internet. Run checks only on trusted repositories. Remove private code and credentials before sharing exports or filing issues. [Execution notes](docs/development.md#model-and-execution-notes)

**Useful for the way you read code? Give CodeAtlas a Star, or share a repository and the route you took through it.**

[MIT License](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md)
