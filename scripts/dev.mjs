import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { availablePort, backend, checkNode, frontend, frontendEnvironment, root, stopChild, venvPython } from "./runtime.mjs";
import { clickExample, indexExample, prepareExample } from "./demo.mjs";

const smoke = process.argv.includes("--smoke");
const strict = process.argv.includes("--strict-ports");
const demo = process.argv.includes("--demo");
const controller = new AbortController();
const children = [];
let stopping = false;
let temporary;
let exitCode = 0;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  controller.abort();
  exitCode = code;
  for (const child of children) stopChild(child);
}

function start(command, args, cwd, env) {
  const child = spawn(command, args, { cwd, env, stdio: "inherit", windowsHide: true, detached: process.platform !== "win32" });
  children.push(child);
  child.done = new Promise((resolve) => {
    child.once("error", (error) => { console.error(error.message); stop(1); resolve(); });
    child.once("exit", (code) => { if (!stopping) stop(code || 1); resolve(); });
  });
  return child;
}

async function ready(url, timeout = 120_000) {
  const deadline = Date.now() + timeout;
  while (!stopping && Date.now() < deadline) {
    try { if ((await fetch(url, { signal: AbortSignal.timeout(2000) })).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`Service did not become ready: ${url}`);
}

try {
  checkNode();
  if (!existsSync(venvPython) || !existsSync(path.join(frontend, "node_modules/next/dist/bin/next"))) throw new Error("Dependencies are missing. Run npm run setup first.");
  if (existsSync(path.join(root, ".env"))) process.loadEnvFile(path.join(root, ".env"));
  process.on("SIGINT", () => stop());
  process.on("SIGTERM", () => stop());
  let exampleRoot;
  if (demo) {
    console.log(`Preparing pallets/click at ${clickExample.commit}. No model calls or repository scripts.`);
    exampleRoot = await prepareExample(path.join(root, "repos/examples"), clickExample, controller.signal);
  }
  const backendPort = await availablePort(process.env.CODEATLAS_BACKEND_PORT ?? 8000, strict);
  let frontendPort = await availablePort(process.env.CODEATLAS_FRONTEND_PORT ?? 3000, strict);
  if (frontendPort === backendPort) frontendPort = await availablePort(frontendPort + 1, strict);
  const apiUrl = `http://127.0.0.1:${backendPort}`;
  const webUrl = `http://127.0.0.1:${frontendPort}`;
  const env = { ...process.env, CODE_AGENT_CORS_ORIGINS: JSON.stringify([webUrl]), PYTHONUNBUFFERED: "1" };
  if (demo) {
    const demoData = path.join(root, "data/demo");
    mkdirSync(demoData, { recursive: true });
    env.CODE_AGENT_DATABASE_URL = `sqlite:///${path.join(demoData, "atlas.db").replaceAll("\\", "/")}`;
    env.CODE_AGENT_DATA_DIR = demoData;
    env.CODE_AGENT_REPOS_DIR = path.join(root, "repos/examples");
    env.OPENAI_API_KEY = "";
  }
  if (smoke) {
    temporary = mkdtempSync(path.join(tmpdir(), "codeatlas-smoke-"));
    env.CODE_AGENT_DATABASE_URL = `sqlite:///${path.join(temporary, "test.db").replaceAll("\\", "/")}`;
    env.CODE_AGENT_DATA_DIR = path.join(temporary, "data");
    env.CODE_AGENT_REPOS_DIR = path.join(temporary, "repos");
    env.OPENAI_API_KEY = "";
  }
  start(venvPython, ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", String(backendPort)], backend, env);
  await ready(`${apiUrl}/api/health`);
  if (demo) await indexExample(apiUrl, exampleRoot, controller.signal);
  start(process.execPath, [path.join(frontend, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", String(frontendPort)], frontend, frontendEnvironment(env, apiUrl));
  await ready(webUrl);
  console.log(`\nCodeAtlas: ${webUrl}\nAPI docs: ${apiUrl}/docs\n`);
  console.log(demo ? `Click is indexed. Search for callback=f to follow the command decorator.\nExample: ${exampleRoot}\n` : `Try importing: ${frontend}\n`);
  if (smoke) {
    const meta = await fetch(`${apiUrl}/api/meta`, { headers: { Origin: webUrl } });
    if (meta.headers.get("access-control-allow-origin") !== webUrl) throw new Error("Selected frontend port is not allowed by CORS.");
    if ((await meta.json()).model_configured) throw new Error("Smoke test must not use a model key.");
    const post = async (route, payload) => {
      const response = await fetch(`${apiUrl}${route}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(`${route}: HTTP ${response.status}`);
      return response.json();
    };
    if (demo) {
      const first = await indexExample(apiUrl, exampleRoot, controller.signal);
      const repeated = await indexExample(apiUrl, exampleRoot, controller.signal);
      if (first.id !== repeated.id) throw new Error("Repeated example setup created a duplicate repository.");
    } else {
      const repository = await post("/api/repositories", { source_type: "local", root_path: frontend });
      await post(`/api/repositories/${repository.id}/index`, {});
      const symbols = await post("/api/tools/find-symbol", { repo_id: repository.id, name: "WorkspaceShell" });
      if (!symbols.items.some((item) => item.path === "components/workspace-shell.tsx")) throw new Error("WorkspaceShell was not found.");
    }
    console.log("SMOKE PASS: frontend, backend, indexing, symbol lookup; no model calls.");
    stop();
  }
  await Promise.all(children.map((child) => child.done));
} catch (error) {
  console.error(`Startup failed: ${error.message}`);
  stop(1);
} finally {
  stop(exitCode);
  await Promise.all(children.map((child) => child.done));
  if (temporary) {
    if (path.dirname(temporary) !== path.resolve(tmpdir())) throw new Error("Unexpected temporary directory");
    rmSync(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
  process.exitCode = exitCode;
}
