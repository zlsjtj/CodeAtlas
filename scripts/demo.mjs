import { execFile } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { root } from "./runtime.mjs";

const execute = promisify(execFile);
export const clickExample = JSON.parse(readFileSync(path.join(root, "benchmarks/reading-cases.json"), "utf8"))
  .repositories.find((repository) => repository.name === "Click");

async function git(directory, args, signal) {
  const { stdout } = await execute("git", ["-C", directory, ...args], {
    encoding: "utf8", windowsHide: true, timeout: 120_000, signal,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  return stdout.trim();
}

export async function prepareExample(parent, example = clickExample, signal) {
  if (!/^[a-f0-9]{40}$/.test(example.commit)) throw new Error("The example needs a full commit hash.");
  const slug = (example.name ?? "Click").toLowerCase();
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(slug)) throw new Error("Invalid example name.");
  mkdirSync(parent, { recursive: true });
  const base = realpathSync(parent);
  const target = path.join(base, `${slug}-${example.commit}`);
  if (existsSync(target)) {
    if (realpathSync(target) !== target) throw new Error(`Example path is a link: ${target}`);
    if (await git(target, ["rev-parse", "HEAD"], signal) !== example.commit
      || await git(target, ["status", "--porcelain", "--untracked-files=all", "--ignored"], signal)) {
      throw new Error(`Example checkout has changed. Move it aside before retrying: ${target}`);
    }
    if (!(await git(target, ["remote"], signal)).split("\n").includes("origin")) {
      await git(target, ["remote", "add", "origin", example.url], signal);
    }
    return target;
  }

  // Publish only a complete checkout; never reset an existing example directory.
  const staging = mkdtempSync(path.join(base, `.${slug}-`));
  try {
    await git(staging, ["init"], signal);
    await git(staging, ["remote", "add", "origin", example.url], signal);
    await git(staging, ["-c", "core.autocrlf=false", "fetch", "--depth=1", example.url, example.commit], signal);
    await git(staging, ["-c", "core.autocrlf=false", "-c", "core.hooksPath=", "checkout", "--detach", example.commit], signal);
    if (await git(staging, ["rev-parse", "HEAD"], signal) !== example.commit) throw new Error("Example commit mismatch.");
    renameSync(staging, target);
    return target;
  } finally {
    if (existsSync(staging)) {
      if (path.dirname(realpathSync(staging)) !== base) throw new Error("Unexpected example staging directory.");
      rmSync(staging, { recursive: true, force: true });
    }
  }
}

export async function indexExample(apiUrl, directory, signal) {
  async function request(route, body) {
    const response = await fetch(`${apiUrl}${route}`, {
      signal: AbortSignal.any([signal ?? new AbortController().signal, AbortSignal.timeout(120_000)]),
      ...(body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new Error(`Example setup ${route}: HTTP ${response.status}`);
    return response.json();
  }
  const { items } = await request("/api/repositories");
  const repository = items.find((item) => item.root_path && path.resolve(item.root_path) === path.resolve(directory))
    ?? await request("/api/repositories", { name: "Click", source_type: "local", root_path: directory });
  const result = await request(`/api/repositories/${repository.id}/index`, {});
  if (result.status !== "ready") throw new Error("Example indexing did not complete.");
  const search = await request("/api/tools/search", { repo_id: repository.id, query: "callback=f", limit: 10 });
  if (!search.items.some((item) => item.path === "src/click/decorators.py")) throw new Error("Click callback was not found in the index.");
  return repository;
}
