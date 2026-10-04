import assert from "node:assert/strict";

const api = "http://127.0.0.1:8000/api";
const post = async (route, body) => {
  const response = await fetch(`${api}${route}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  assert.ok(response.ok, `${route}: ${response.status} ${await response.clone().text()}`);
  return response.json();
};
assert.ok((await fetch("http://127.0.0.1:3000")).ok);
const meta = await (await fetch(`${api}/meta`)).json();
assert.equal(meta.model_configured, false);
const before = await (await fetch(`${api}/repositories`)).json();
if (process.argv.includes("--persisted")) {
  assert.ok(before.items.some((item) => item.name === "docker-smoke" && item.status === "ready"));
  console.log("DOCKER PASS: indexed repository survived container recreation.");
} else {
  const repo = await post("/repositories", { name: "docker-smoke", source_type: "local", root_path: "/app/backend" });
  await post(`/repositories/${repo.id}/index`, {});
  const found = await post("/tools/find-symbol", { repo_id: repo.id, name: "Settings" });
  assert.ok(found.items.some((item) => item.path === "app/core/config.py"));
  const read = await post("/tools/read", { repo_id: repo.id, path: "app/core/config.py", start_line: 1, end_line: 200 });
  assert.match(read.items[0].content, /class Settings/);
  const cors = await fetch(`${api}/meta`, { headers: { Origin: "http://127.0.0.1:3000" } });
  assert.equal(cors.headers.get("access-control-allow-origin"), "http://127.0.0.1:3000");
  console.log("DOCKER PASS: web, API, no-key indexing, symbol search, reading and CORS.");
}
