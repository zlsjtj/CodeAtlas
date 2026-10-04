import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { prepareExample } from "./demo.mjs";

function fixture(t) {
  const temporary = mkdtempSync(path.join(tmpdir(), "codeatlas-example-test-"));
  t.after(() => {
    if (path.dirname(path.resolve(temporary)) !== path.resolve(tmpdir())) throw new Error("Unexpected temporary directory.");
    rmSync(temporary, { recursive: true, force: true });
  });
  const git = (...args) => execFileSync("git", ["-C", temporary, ...args], { encoding: "utf8", windowsHide: true }).trim();
  git("init");
  writeFileSync(path.join(temporary, "example.py"), "def command():\n    pass\n");
  git("add", "example.py");
  git("-c", "user.name=Example test", "-c", "user.email=example@localhost", "-c", "commit.gpgsign=false", "commit", "-m", "fixture");
  return { temporary, parent: path.join(temporary, "checkouts"), example: { url: temporary, commit: git("rev-parse", "HEAD") } };
}

test("example checkout uses the exact commit and is reused without downloading", async (t) => {
  const { parent, example } = fixture(t);
  const folder = await prepareExample(parent, example);
  assert.equal(readFileSync(path.join(folder, "example.py"), "utf8"), "def command():\n    pass\n");
  assert.equal(await prepareExample(parent, { ...example, url: "/unreachable" }), folder);
  assert.deepEqual(readdirSync(parent), [`click-${example.commit}`]);
});

test("example setup refuses to replace modified or untracked files", async (t) => {
  const { parent, example } = fixture(t);
  const folder = await prepareExample(parent, example);
  writeFileSync(path.join(folder, "notes.txt"), "keep my notes");
  await assert.rejects(prepareExample(parent, example), /checkout has changed/);
  assert.equal(readFileSync(path.join(folder, "notes.txt"), "utf8"), "keep my notes");
  writeFileSync(path.join(folder, "example.py"), "my changes\n");
  await assert.rejects(prepareExample(parent, example), /checkout has changed/);
  assert.equal(readFileSync(path.join(folder, "example.py"), "utf8"), "my changes\n");
});

test("a missing pinned commit leaves no published checkout or staging directory", async (t) => {
  const { parent, example } = fixture(t);
  await assert.rejects(prepareExample(parent, { ...example, commit: "0".repeat(40) }));
  assert.deepEqual(readdirSync(parent), []);
});

test("invalid pins and cancelled preparation cannot publish an example", async (t) => {
  const { parent, example } = fixture(t);
  await assert.rejects(prepareExample(parent, { ...example, commit: "main" }), /full commit hash/);
  assert.equal(existsSync(parent), false);
  await assert.rejects(prepareExample(parent, example, AbortSignal.abort()));
  assert.deepEqual(readdirSync(parent), []);
});
