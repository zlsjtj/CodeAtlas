import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { exportReadingRoute, makeReadingStop, parseReadingRoute, validFileUrl, type ReadingRoute } from "../../lib/reading-route";
import type { ToolResultItem } from "../../lib/types";

const api = "http://127.0.0.1:8100";
const fixtureRoots = new Set<string>();
test.afterEach(() => {
  for (const root of fixtureRoots) {
    if (path.dirname(root) !== path.resolve(tmpdir()) || !path.basename(root).startsWith("codeatlas-route-")) throw new Error("Unexpected fixture path");
    rmSync(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
  fixtureRoots.clear();
});
const sha = "a".repeat(40);
const source: ToolResultItem = {
  kind: "file_segment", path: "src/main.py", start_line: 10, end_line: 12,
  content: "one\n````\nthree", provenance: { state: "commit", revision: sha, content_sha256: "b".repeat(64), file_url: `https://github.com/example/route/blob/${sha}/src/main.py` },
};

test("route data validates ranges and exports literal notes with a safe code fence", () => {
  const stop = makeReadingStop(source, 11, 12, "<img src=x>\n# not a heading\n[not a link](javascript:bad)");
  expect(stop.excerpt).toBe("````\nthree");
  expect(() => makeReadingStop(source, 9, 12, "")).toThrow();
  expect(() => makeReadingStop(source, 11, 13, "")).toThrow();
  const route: ReadingRoute = { version: 1, title: "Example", entries: [stop] };
  expect(parseReadingRoute(JSON.stringify(route))).toEqual(route);
  const text = exportReadingRoute(route, "repo", "en");
  expect(text).toContain("#L11-L12");
  expect(text).toContain("`````\n````\nthree\n`````");
  expect(text).not.toContain("<img");
  expect(text).not.toContain("\n# not a heading");
  expect(text).not.toContain("[not a link](");
  expect(() => parseReadingRoute(JSON.stringify({ ...route, entries: [stop, stop] }))).toThrow();
  expect(() => parseReadingRoute(JSON.stringify({ ...route, version: 2 }))).toThrow();
  expect(validFileUrl(`https://secret@github.com/example/route/blob/${sha}/file`, sha)).toBe(false);
  expect(validFileUrl(`https://github.com.evil.test/example/route/blob/${sha}/file`, sha)).toBe(false);
  expect(validFileUrl(`https://github.com/example/route/blob/${sha}/file)[bad](https://example.com)`, sha)).toBe(false);
  expect(() => parseReadingRoute(JSON.stringify({ ...route, entries: [{ ...stop, savedAt: "2020-01-01 (\n# injected)" }] }))).toThrow();
  const local = { ...stop, provenance: { ...stop.provenance, state: "modified" as const, file_url: null } };
  const localExport = exportReadingRoute({ ...route, entries: [local] }, "repo", "en");
  expect(localExport).not.toContain("](https://github.com/");
  expect(localExport).toContain("HEAD at read time (not an exact source version)");
});

async function fixture(request: APIRequestContext, name: string, useGit = true) {
  const root = mkdtempSync(path.join(tmpdir(), "codeatlas-route-" + name + "-"));
  fixtureRoots.add(root);
  const content = "def greet():\n    return 'hello'\n\ndef run():\n    return greet()\n\nrun()\n";
  writeFileSync(path.join(root, "main.py"), content);
  let revision: string | undefined;
  if (useGit) {
    const env = { ...process.env };
    for (const key of Object.keys(env)) if (key.toUpperCase().startsWith("GIT_")) delete env[key];
    env.GIT_CONFIG_GLOBAL = process.platform === "win32" ? "NUL" : "/dev/null";
    env.GIT_CONFIG_NOSYSTEM = "1";
    const git = (...args: string[]) => execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.invalid",
      "-c", "commit.gpgSign=false", "-c", "core.autocrlf=false", "-C", root, ...args], { encoding: "utf8", env }).trim();
    git("init"); git("add", "main.py"); git("commit", "-m", "fixture");
    git("remote", "add", "origin", "https://github.com/example/reading-route.git");
    revision = git("rev-parse", "HEAD");
  }
  const response = await request.post(`${api}/api/repositories`, { data: { name, source_type: "local", root_path: root } });
  expect(response.ok()).toBe(true);
  return { id: (await response.json()).id as number, root, content, revision };
}

async function select(page: Page, id: number) {
  await page.goto("/");
  await expect(page.getByLabel("当前仓库").locator(`option[value="${id}"]`)).toBeAttached();
  await page.getByLabel("当前仓库").selectOption(String(id));
}

async function addStop(page: Page, start: number, end: number, note: string) {
  await page.getByRole("button", { name: "保存到阅读路线", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "保存阅读位置" });
  await dialog.getByLabel("起始行").fill(String(start));
  await dialog.getByLabel("结束行").fill(String(end));
  await dialog.getByLabel("笔记", { exact: true }).fill(note);
  await dialog.getByRole("button", { name: "保存位置", exact: true }).click();
}

test("save, reorder, edit, reload and export a pinned route without a model", async ({ page, request }) => {
  const repo = await fixture(request, "route-main");
  const other = await fixture(request, "route-other", false);
  await select(page, repo.id);
  await page.getByRole("button", { name: "main.py", exact: true }).click();
  await addStop(page, 1, 2, "First: greeting");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await addStop(page, 4, 5, "Second: call");
  await addStop(page, 7, 7, "Third: entry");
  await page.getByRole("button", { name: "路线", exact: true }).click();
  const stops = page.locator(".reading-route-list > li");
  await expect(stops).toHaveCount(3);
  await page.getByLabel("路线标题").fill("Follow the greeting");
  await page.getByRole("button", { name: "保存标题" }).click();
  await stops.nth(2).getByRole("button", { name: "上移", exact: true }).click();
  await expect(stops.nth(1)).toContainText("Third: entry");
  await stops.nth(1).getByRole("button", { name: "编辑笔记" }).click();
  await stops.nth(1).getByRole("textbox", { name: "笔记", exact: true }).fill("The entry calls run");
  await stops.nth(1).getByRole("button", { name: "保存笔记" }).click();
  await stops.nth(2).getByRole("button", { name: "移除位置" }).click();
  await expect(stops).toHaveCount(2);
  await page.getByRole("button", { name: "撤销移除" }).click();
  await expect(stops).toHaveCount(3);
  await page.getByLabel("当前仓库").selectOption(String(other.id));
  await page.getByRole("button", { name: "路线", exact: true }).click();
  await expect(stops).toHaveCount(0);
  await page.getByLabel("当前仓库").selectOption(String(repo.id));
  await page.getByRole("button", { name: "路线", exact: true }).click();
  await expect(stops).toHaveCount(3);
  await select(page, repo.id);
  await page.getByRole("button", { name: "路线", exact: true }).click();
  await expect(page.getByLabel("路线标题")).toHaveValue("Follow the greeting");
  await expect(stops.nth(1)).toContainText("The entry calls run");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 Markdown" }).click();
  const download = await pending;
  const markdown = readFileSync((await download.path())!, "utf8");
  expect(markdown).toContain(`https://github.com/example/reading-route/blob/${repo.revision}/main.py#L1-L2`);
  expect(markdown.indexOf("The entry calls run")).toBeLessThan(markdown.indexOf("Second: call"));
  expect(markdown).not.toContain(repo.root);
  await page.screenshot({ path: "test-results/reading-route-desktop.png", fullPage: true });
  writeFileSync(path.join(repo.root, "main.py"), repo.content.replace("hello", "welcome"));
  await stops.first().getByRole("button", { name: "main.py:1–2", exact: true }).click();
  await expect(page.locator(".source-code")).toContainText("welcome");
  await expect(page.getByText("当前文件与保存版本不同", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "路线", exact: true }).click();
  await stops.first().getByText("保存时摘录", { exact: true }).click();
  await expect(stops.first().locator("pre")).toContainText("hello");
  unlinkSync(path.join(repo.root, "main.py"));
  await stops.first().getByRole("button", { name: "main.py:1–2", exact: true }).click();
  await expect(page.locator(".reader-panel").getByRole("alert")).toBeVisible();
});

test("mobile route, duplicate detection, local snapshots and English export", async ({ page, request }) => {
  const repo = await fixture(request, "route-mobile", false);
  await page.setViewportSize({ width: 360, height: 800 });
  await select(page, repo.id);
  await page.getByRole("button", { name: "文件与任务" }).click();
  await page.getByRole("button", { name: "main.py", exact: true }).click();
  await page.getByRole("button", { name: "保存到阅读路线" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "保存阅读位置" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "保存到阅读路线" })).toBeFocused();
  await addStop(page, 1, 2, "Local note");
  await addStop(page, 1, 2, "Duplicate");
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("已在路线中");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "路线", exact: true }).click();
  await expect(page.locator(".reading-route-list > li")).toHaveCount(1);
  await page.getByLabel("语言", { exact: true }).selectOption("en");
  await expect(page.locator(".route-provenance")).toHaveText("Local file, no Git revision");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Markdown" }).click();
  const markdown = readFileSync((await (await pending).path())!, "utf8");
  expect(markdown).toContain("Local file, no Git revision");
  expect(markdown).not.toContain("https://github.com/");
  await page.screenshot({ path: "test-results/reading-route-mobile.png", fullPage: true });
});

test("storage failure and corrupt data do not claim a save or overwrite existing data", async ({ page, request }) => {
  const repo = await fixture(request, "route-storage", false);
  await select(page, repo.id);
  await page.getByRole("button", { name: "main.py", exact: true }).click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key.startsWith("codeatlas:reading-route:")) throw new DOMException("test quota", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await addStop(page, 1, 2, "Must not claim saved");
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("未能保存");
  await select(page, repo.id);
  await page.getByRole("button", { name: "main.py", exact: true }).click();
  await addStop(page, 1, 2, "Keep this data");
  const key = await page.evaluate(() => Object.keys(localStorage).find(key => key.startsWith("codeatlas:reading-route:"))!);
  await page.evaluate(key => localStorage.setItem(key, "{broken"), key);
  await select(page, repo.id);
  await page.getByRole("button", { name: "路线", exact: true }).click();
  await expect(page.locator(".reading-route").getByRole("alert")).toContainText("原有数据未被覆盖");
  await page.getByLabel("路线标题").fill("No overwrite");
  await page.getByRole("button", { name: "保存标题" }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe("{broken");
});

test("another browser tab cannot be silently overwritten", async ({ page, context, request }) => {
  const repo = await fixture(request, "route-tabs", false);
  await select(page, repo.id);
  await page.getByRole("button", { name: "main.py", exact: true }).click();
  await addStop(page, 1, 2, "Shared stop");
  await page.getByRole("button", { name: "路线", exact: true }).click();
  const other = await context.newPage();
  await select(other, repo.id);
  await other.getByRole("button", { name: "路线", exact: true }).click();
  await other.getByLabel("路线标题").fill("Updated elsewhere");
  await other.getByRole("button", { name: "保存标题" }).click();
  await expect(page.locator(".reading-route").getByRole("alert")).toContainText("其他窗口已修改");
  await page.getByLabel("路线标题").fill("Stale title");
  await page.getByRole("button", { name: "保存标题" }).click();
  await page.getByRole("button", { name: "重新加载路线" }).click();
  await expect(page.getByLabel("路线标题")).toHaveValue("Updated elsewhere");
  await expect(page.locator(".reading-route-list > li")).toHaveCount(1);
  await other.close();
});

test("a late source response cannot be saved into another repository route", async ({ page, request }) => {
  const first = await fixture(request, "route-late-first", false);
  const second = await fixture(request, "route-late-second", false);
  await select(page, first.id);
  await page.getByRole("button", { name: "main.py", exact: true }).click();
  await addStop(page, 1, 2, "First repository only");
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let started = false;
  let finished = false;
  await page.route("**/api/tools/read", async route => {
    if (route.request().postDataJSON().repo_id !== first.id) return route.continue();
    started = true;
    await gate;
    try { await route.fulfill({ response: await route.fetch() }); } catch { /* The old request is aborted on repository switch. */ }
    finally { finished = true; }
  });
  await page.getByRole("button", { name: "main.py", exact: true }).click();
  await expect.poll(() => started).toBe(true);
  await page.getByLabel("当前仓库").selectOption(String(second.id));
  release();
  await expect.poll(() => finished).toBe(true);
  await expect(page.locator(".reader-empty")).toBeVisible();
  await expect(page.getByRole("button", { name: "保存到阅读路线" })).toHaveCount(0);
  await page.getByRole("button", { name: "路线", exact: true }).click();
  await expect(page.locator(".reading-route-list > li")).toHaveCount(0);
  await page.getByLabel("当前仓库").selectOption(String(first.id));
  await page.getByRole("button", { name: "路线", exact: true }).click();
  await expect(page.locator(".reading-route-list > li")).toHaveCount(1);
});
