import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const temporary = mkdtempSync(path.join(tmpdir(), "codeatlas-e2e-"));
Object.assign(process.env, {
  CODEATLAS_FRONTEND_PORT: "3100", CODEATLAS_BACKEND_PORT: "8100",
  CODE_AGENT_DATABASE_URL: `sqlite:///${path.join(temporary, "test.db").replaceAll("\\", "/")}`,
  CODE_AGENT_DATA_DIR: path.join(temporary, "data"), CODE_AGENT_REPOS_DIR: path.join(temporary, "repos"),
  CODE_AGENT_DEBUG: "false", OPENAI_API_KEY: "",
});
process.argv.push("--strict-ports");
try { await import("./dev.mjs"); }
finally {
  if (path.dirname(temporary) !== path.resolve(tmpdir())) throw new Error("Unexpected temporary directory");
  rmSync(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
