import { copyFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { backend, checkNode, findPython, frontend, npmCli, root, run, venvPython } from "./runtime.mjs";

try {
  checkNode();
  if (spawnSync("git", ["--version"], { windowsHide: true }).status !== 0) throw new Error("Git was not found. Install Git and reopen your terminal.");
  const python = findPython();
  if (!existsSync(venvPython)) await run(python.command, [...python.args, "-m", "venv", ".venv"], backend);
  await run(venvPython, ["-m", "pip", "install", "-e", ".[dev]"], backend);
  await run(process.execPath, [npmCli(), "ci"], frontend);
  const envFile = path.join(root, ".env");
  if (!existsSync(envFile)) copyFileSync(path.join(root, ".env.example"), envFile);
  console.log("Setup complete. Existing .env settings were preserved. Run npm run dev.");
} catch (error) {
  console.error(`Setup failed: ${error.message}`);
  process.exitCode = 1;
}
