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
  const origin = () => execFileSync("git", ["-C", folder, "remote", "get-url", "origin"], { encoding: "utf8", windowsHide: true }).trim();
  assert.equal(origin(), example.url);
  assert.equal(await prepareExample(parent, { ...example, url: "/unreachable" }), folder);
  assert.equal(origin(), example.url);
  assert.deepEqual(readdirSync(parent), [`click-${example.commit}`]);
});

test("an older clean example gets a missing origin without changing its checkout", async (t) => {
  const { parent, example } = fixture(t);
  const folder = await prepareExample(parent, example);
  const git = (...args) => execFileSync("git", ["-C", folder, ...args], { encoding: "utf8", windowsHide: true }).trim();
  git("remote", "remove", "origin");
  const content = readFileSync(path.join(folder, "example.py"), "utf8");
  assert.equal(await prepareExample(parent, example), folder);
  assert.equal(git("remote", "get-url", "origin"), example.url);
  assert.equal(git("rev-parse", "HEAD"), example.commit);
  assert.equal(git("status", "--porcelain"), "");
  assert.equal(readFileSync(path.join(folder, "example.py"), "utf8"), content);
});

test("named examples use separate reusable checkouts", async (t) => {
  const { parent, example } = fixture(t);
  const click = await prepareExample(parent, example);
  const named = { ...example, name: "CodeAtlas" };
  const atlas = await prepareExample(parent, named);
  assert.notEqual(click, atlas);
  assert.equal(path.basename(atlas), `codeatlas-${example.commit}`);
  assert.equal(await prepareExample(parent, named), atlas);
  assert.equal(readFileSync(path.join(atlas, "example.py"), "utf8"), readFileSync(path.join(click, "example.py"), "utf8"));
  assert.deepEqual(readdirSync(parent).sort(), [`click-${example.commit}`, `codeatlas-${example.commit}`]);
});

test("invalid example names are rejected before creating directories", async (t) => {
  const { parent, example } = fixture(t);
  for (const name of ["../outside", "a/b", "a\\b", "", ".", "a".repeat(65)]) {
    await assert.rejects(prepareExample(parent, { ...example, name }), /Invalid example name/);
    assert.equal(existsSync(parent), false);
  }
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
