import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { availablePort, backend, checkNode, frontend, frontendEnvironment, root, stopChild, venvPython } from "./runtime.mjs";

const smoke = process.argv.includes("--smoke");
const strict = process.argv.includes("--strict-ports");
const children = [];
let stopping = false;
let temporary;
let exitCode = 0;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
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
  const backendPort = await availablePort(process.env.CODEATLAS_BACKEND_PORT ?? 8000, strict);
  let frontendPort = await availablePort(process.env.CODEATLAS_FRONTEND_PORT ?? 3000, strict);
  if (frontendPort === backendPort) frontendPort = await availablePort(frontendPort + 1, strict);
  const apiUrl = `http://127.0.0.1:${backendPort}`;
  const webUrl = `http://127.0.0.1:${frontendPort}`;
  const env = { ...process.env, CODE_AGENT_CORS_ORIGINS: JSON.stringify([webUrl]), PYTHONUNBUFFERED: "1" };
  if (smoke) {
    temporary = mkdtempSync(path.join(tmpdir(), "codeatlas-smoke-"));
    env.CODE_AGENT_DATABASE_URL = `sqlite:///${path.join(temporary, "test.db").replaceAll("\\", "/")}`;
    env.CODE_AGENT_DATA_DIR = path.join(temporary, "data");
    env.CODE_AGENT_REPOS_DIR = path.join(temporary, "repos");
    env.OPENAI_API_KEY = "";
  }
  process.on("SIGINT", () => stop());
  process.on("SIGTERM", () => stop());
  start(venvPython, ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", String(backendPort)], backend, env);
  await ready(`${apiUrl}/api/health`);
  start(process.execPath, [path.join(frontend, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", String(frontendPort)], frontend, frontendEnvironment(env, apiUrl));
  await ready(webUrl);
  console.log(`\nCodeAtlas: ${webUrl}\nAPI docs: ${apiUrl}/docs\nTry importing: ${frontend}\n`);
  if (smoke) {
    const meta = await fetch(`${apiUrl}/api/meta`, { headers: { Origin: webUrl } });
    if (meta.headers.get("access-control-allow-origin") !== webUrl) throw new Error("Selected frontend port is not allowed by CORS.");
    if ((await meta.json()).model_configured) throw new Error("Smoke test must not use a model key.");
    const post = async (route, payload) => {
      const response = await fetch(`${apiUrl}${route}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(`${route}: HTTP ${response.status}`);
      return response.json();
    };
    const repository = await post("/api/repositories", { source_type: "local", root_path: frontend });
    await post(`/api/repositories/${repository.id}/index`, {});
    const symbols = await post("/api/tools/find-symbol", { repo_id: repository.id, name: "WorkspaceShell" });
    if (!symbols.items.some((item) => item.path === "components/workspace-shell.tsx")) throw new Error("WorkspaceShell was not found.");
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
