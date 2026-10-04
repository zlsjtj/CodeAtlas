import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const web = `http://127.0.0.1:${process.env.CODEATLAS_FRONTEND_PORT ?? 3000}`;
const api = `http://127.0.0.1:${process.env.CODEATLAS_BACKEND_PORT ?? 8000}/api`;
const post = async (route, body) => {
  const response = await fetch(`${api}${route}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  assert.ok(response.ok, `${route}: ${response.status} ${await response.clone().text()}`);
  return response.json();
};
assert.ok((await fetch(web)).ok);
const meta = await (await fetch(`${api}/meta`)).json();
assert.equal(meta.model_configured, false);
const before = await (await fetch(`${api}/repositories`)).json();
let repo;
if (process.argv.includes("--persisted")) {
  repo = before.items.find((item) => item.name === "docker-smoke" && item.status === "ready");
  assert.ok(repo);
  console.log("DOCKER PASS: indexed repository survived container recreation.");
} else {
  repo = await post("/repositories", { name: "docker-smoke", source_type: "local", root_path: "/app/backend" });
  await post(`/repositories/${repo.id}/index`, {});
  const found = await post("/tools/find-symbol", { repo_id: repo.id, name: "Settings" });
  assert.ok(found.items.some((item) => item.path === "app/core/config.py"));
  const read = await post("/tools/read", { repo_id: repo.id, path: "app/core/config.py", start_line: 1, end_line: 200 });
  assert.match(read.items[0].content, /class Settings/);
  const cors = await fetch(`${api}/meta`, { headers: { Origin: web } });
  assert.equal(cors.headers.get("access-control-allow-origin"), web);
  console.log("DOCKER PASS: web, API, no-key indexing, symbol search, reading and CORS.");
}
const source = await post("/tools/read", {
  repo_id: repo.id, path: "app/core/config.py", start_line: 1, end_line: 200, include_provenance: true,
});
const item = source.items[0];
assert.match(item.content, /class Settings/);
assert.equal(item.provenance.state, "local");
assert.equal(item.provenance.revision, null);
assert.equal(item.provenance.file_url, null);
// The image's .git directory is deliberately excluded; no commit link is implied.
const original = readFileSync(new URL("../backend/app/core/config.py", import.meta.url), "utf8").replaceAll("\r\n", "\n").replaceAll("\r", "\n");
assert.equal(item.provenance.content_sha256, createHash("sha256").update(original).digest("hex"));
console.log("DOCKER PASS: source provenance remains readable without Git metadata.");
