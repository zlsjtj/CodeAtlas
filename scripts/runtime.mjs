import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const backend = path.join(root, "backend");
export const frontend = path.join(root, "frontend");
export const venvPython = path.join(backend, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");

export function checkNode() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 20 || (major === 20 && minor < 12)) throw new Error("Node.js 20.12 or newer is required.");
}

export function findPython() {
  const candidates = existsSync(venvPython) ? [[venvPython, []]] : [];
  candidates.push(["python3", []], ["python", []]);
  if (process.platform === "win32") candidates.push(["py", ["-3"]]);
  for (const [command, args] of candidates) {
    const result = spawnSync(command, [...args, "-c", "import sys; sys.exit(sys.version_info < (3, 11))"], { windowsHide: true });
    if (result.status === 0) return { command, args };
  }
  throw new Error("Python 3.11+ was not found. Install Python, reopen your terminal, and run npm run setup.");
}

export function npmCli() {
  const candidates = [process.env.npm_execpath,
    path.join(path.dirname(process.execPath), "node_modules/npm/bin/npm-cli.js"),
    path.resolve(path.dirname(process.execPath), "../lib/node_modules/npm/bin/npm-cli.js")];
  const cli = candidates.find((candidate) => candidate && existsSync(candidate));
  if (!cli) throw new Error("npm CLI not found. Run this command through npm run setup or npm run dev.");
  return cli;
}

export function run(command, args, cwd = root) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit", windowsHide: true });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${path.basename(command)} exited with code ${code}`)));
  });
}

export async function availablePort(first, strict = false) {
  const base = Number(first);
  if (!Number.isInteger(base) || base < 1024 || base > 65435) throw new Error("Port must be an integer from 1024 to 65435.");
  for (let port = base; port < base + (strict ? 1 : 100); port++) {
    const free = await new Promise((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.listen(port, "127.0.0.1", () => server.close(() => resolve(true)));
    });
    if (free) return port;
  }
  throw new Error(`No free port starting at ${base}. Set CODEATLAS_FRONTEND_PORT or CODEATLAS_BACKEND_PORT.`);
}

export function frontendEnvironment(env, apiUrl) {
  return { ...Object.fromEntries(Object.entries(env).filter(([key]) => !/^(OPENAI_|CODE_AGENT_)/.test(key))),
    NEXT_PUBLIC_API_BASE_URL: apiUrl, NEXT_TELEMETRY_DISABLED: "1" };
}

export function stopChild(child) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
  } else {
    try { process.kill(-child.pid, "SIGTERM"); } catch (error) { if (error.code !== "ESRCH") throw error; }
  }
}
