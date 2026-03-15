import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import openapiTS, { astToString } from "openapi-typescript";

const frontendDir = path.resolve(import.meta.dirname, "..");
const repoRoot = path.resolve(frontendDir, "..");
const backendScript = path.join(repoRoot, "backend", "scripts", "export_openapi.py");
const backendPython =
  process.platform === "win32"
    ? path.join(repoRoot, "backend", ".venv", "Scripts", "python.exe")
    : path.join(repoRoot, "backend", ".venv", "bin", "python");
const tempDir = mkdtempSync(path.join(tmpdir(), "code-repo-agent-openapi-"));
const openapiPath = path.join(tempDir, "openapi.json");
const generatedDir = path.join(frontendDir, "lib", "generated");
const generatedTypesPath = path.join(generatedDir, "api-types.ts");

mkdirSync(generatedDir, { recursive: true });

try {
  execFileSync(existsSync(backendPython) ? backendPython : "python", [backendScript, openapiPath], {
    cwd: repoRoot,
    stdio: "inherit",
  });

  const openapiSchema = JSON.parse(readFileSync(openapiPath, "utf-8"));
  const generatedAst = await openapiTS(openapiSchema);
  const generatedTypes = astToString(generatedAst);
  writeFileSync(generatedTypesPath, generatedTypes, "utf-8");
} finally {
  rmSync(tempDir, { force: true, recursive: true });
}
