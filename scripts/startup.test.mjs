import assert from "node:assert/strict";
import net from "node:net";
import { test } from "node:test";
import { availablePort, frontendEnvironment } from "./runtime.mjs";

test("occupied ports are not reused or killed", async () => {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  try {
    assert.notEqual(await availablePort(port), port);
    await assert.rejects(availablePort(port, true), /No free port/);
    assert.equal(server.listening, true);
  } finally { server.close(); }
});

test("frontend receives the selected API URL, not model credentials", () => {
  const env = frontendEnvironment({ PATH: "test", OPENAI_API_KEY: "secret", CODE_AGENT_DATABASE_URL: "private", OPENAI_BASE_URL: "private" }, "http://127.0.0.1:8010");
  assert.equal(env.NEXT_PUBLIC_API_BASE_URL, "http://127.0.0.1:8010");
  assert.equal(env.OPENAI_API_KEY, undefined);
  assert.equal(env.CODE_AGENT_DATABASE_URL, undefined);
  assert.equal(env.OPENAI_BASE_URL, undefined);
  assert.equal(env.PATH, "test");
});
