import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const api = "http://127.0.0.1:8100";

function fixture(name: string) {
  const root = path.resolve("test-results", `repo-${name}`);
  mkdirSync(root, { recursive: true });
  writeFileSync(path.join(root, "main.py"), "def greet(name):\n    return f'Hello {name}'\n" + Array.from({ length: 410 }, (_, n) => `# line ${n + 3}`).join("\n") + "\n");
  writeFileSync(path.join(root, ".env"), "TOKEN=must-not-appear");
  writeFileSync(path.join(root, ".gitignore"), "ignored.py\n");
  writeFileSync(path.join(root, "ignored.py"), "secret_marker = True\n");
  if (name === "patch") {
    mkdirSync(path.join(root, "tests"), { recursive: true });
    writeFileSync(path.join(root, "tests/test_main.py"), "def test_greeting():\n    from main import greet\n    assert greet('reader') == 'Welcome reader'\n");
  }
  return root;
}

async function importAndIndex(page: Page, name: string) {
  const root = fixture(name);
  await page.goto("/");
  await page.locator("header").getByRole("button", { name: "导入仓库", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("仓库名称", { exact: false }).fill(name);
  await dialog.getByLabel("本地仓库路径").fill(root);
  await dialog.getByRole("button", { name: "登记仓库", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByLabel("当前仓库").locator("option:checked")).toHaveText(name);
  await page.getByRole("button", { name: "开始索引", exact: true }).click();
  await expect(page.locator(".repository-status")).toHaveText("可用");
  return root;
}

test("no-key import, indexing, symbol lookup, source pages and existing views", async ({ page }) => {
  await importAndIndex(page, "reading");
  await expect(page.getByRole("button", { name: "提问", exact: true })).toBeDisabled();
  await expect(page.locator(".file-tree")).not.toContainText(".env");
  await expect(page.locator(".file-tree")).not.toContainText("ignored.py");
  await page.getByRole("button", { name: "符号", exact: true }).click();
  await page.getByRole("textbox", { name: "搜索代码" }).fill("greet");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await page.locator(".search-result").filter({ hasText: "main.py" }).click();
  await expect(page.getByRole("region", { name: "文件内容" })).toContainText("def greet(name)");
  await page.getByRole("button", { name: "下一段" }).click();
  await expect(page.locator(".line-number").first()).toHaveText("201");
  await expect(page.locator("header h1")).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
  await page.getByRole("button", { name: "上一段" }).click();
  await expect(page.locator(".line-number").first()).toHaveText("1");
  await page.getByRole("textbox", { name: "搜索代码" }).fill("no_such_symbol");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await expect(page.getByText("没有匹配结果。", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "改动", exact: true }).click();
  await expect(page.locator(".full-panel")).toContainText("草案");
  await page.getByRole("button", { name: "检查", exact: true }).click();
  await expect(page.locator(".full-panel")).toContainText("检查");
});

test("file errors stay visible and can be retried", async ({ page }) => {
  await importAndIndex(page, "errors");
  await page.route("**/api/tools/read", (route) => route.fulfill({ status: 400, json: { detail: "File is no longer available." } }));
  await page.getByRole("button", { name: "main.py", exact: true }).click();
  await expect(page.locator(".reader-panel").getByRole("alert")).toContainText("File is no longer available.");
  await page.unroute("**/api/tools/read");
  await page.getByRole("button", { name: "重新读取" }).click();
  await expect(page.getByRole("region", { name: "文件内容" })).toContainText("def greet");
});

test("answer reference opens current source; mock is used only in this test", async ({ page }) => {
  await page.route("**/api/meta", async (route) => {
    const response = await route.fetch();
    await route.fulfill({ json: { ...(await response.json()), model_configured: true } });
  });
  await page.route("**/api/chat/ask", (route) => route.fulfill({ json: {
    session_id: "e2e-only", answer: "Test response: greet is in main.py.",
    citations: [{ path: "main.py", start_line: 1, end_line: 2, note: "Test citation", excerpt: "def greet(name):" }],
    trace_summary: { agent_name: "test", model: "mock", latency_ms: 0, tool_call_count: 0, steps: [] },
  } }));
  await importAndIndex(page, "citations");
  await page.getByRole("button", { name: "问答", exact: true }).click();
  await page.getByRole("textbox", { name: "问题", exact: true }).fill("Where is greet?");
  await page.getByRole("button", { name: "提问", exact: true }).click();
  await page.getByRole("button", { name: "main.py:1", exact: true }).click();
  await expect(page.getByRole("region", { name: "文件内容" })).toContainText("def greet");
  await expect(page.getByText("当前工作区文件，可能与回答生成时的版本不同。", { exact: true })).toBeVisible();
});

test("switching repositories drops a late answer and keeps the new selection", async ({ page, request }) => {
  const other = await request.post(`${api}/api/repositories`, { data: { source_type: "local", root_path: fixture("other"), name: "other" } });
  const otherId = (await other.json()).id;
  await page.route("**/api/meta", async (route) => route.fulfill({ json: { ...(await (await route.fetch()).json()), model_configured: true } }));
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let started = false;
  await page.route("**/api/chat/ask", async (route) => {
    started = true;
    await gate;
    await route.fulfill({ status: 500, json: { detail: "STALE_ERROR" } }).catch(() => {});
  });
  await importAndIndex(page, "late");
  await page.getByRole("textbox", { name: "问题", exact: true }).fill("A slow question");
  await page.getByRole("button", { name: "提问", exact: true }).click();
  await expect.poll(() => started).toBe(true);
  await page.getByLabel("当前仓库").selectOption(String(otherId));
  release();
  await expect(page.getByLabel("当前仓库").locator("option:checked")).toHaveText("other");
  await expect(page.locator(".reader-empty")).toBeVisible();
  await expect(page.getByText("STALE_ERROR")).toHaveCount(0);
});

test("mobile reading, language switch and keyboard focus do not overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await importAndIndex(page, "mobile");
  await page.getByRole("button", { name: "文件与任务" }).click();
  await page.getByRole("button", { name: "main.py", exact: true }).click();
  await expect(page.locator(".drawer-backdrop")).toHaveCount(0);
  await page.getByRole("textbox", { name: "搜索代码" }).fill("greet");
  await page.getByRole("textbox", { name: "搜索代码" }).press("Enter");
  await page.locator(".search-result").first().click();
  await expect(page.getByRole("region", { name: "文件内容" })).toBeVisible();
  await page.getByLabel("语言", { exact: true }).selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByRole("button", { name: "Next lines" }).focus();
  await expect(page.getByRole("button", { name: "Next lines" })).toBeFocused();
  await page.getByRole("button", { name: "Next lines" }).press("Enter");
  await expect(page.locator(".line-number").first()).toHaveText("201");
  await expect(page.locator("header h1")).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/mobile-reading.png", fullPage: true });
});

test("import failure is visible inside the dialog", async ({ page }) => {
  await page.goto("/");
  await page.locator("header").getByRole("button", { name: "导入仓库", exact: true }).click();
  await page.route("**/api/repositories", (route) => route.fulfill({ status: 400, json: { detail: "Repository path is unavailable." } }));
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("本地仓库路径").fill("/missing-repository");
  await dialog.getByRole("button", { name: "登记仓库", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Repository path is unavailable.");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

test("search errors are recoverable", async ({ page }) => {
  await importAndIndex(page, "search-error");
  await page.route("**/api/tools/search", (route) => route.fulfill({ status: 500, json: { detail: "Search failed." } }));
  await page.getByRole("textbox", { name: "搜索代码" }).fill("greet");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await expect(page.locator(".reader-panel").getByRole("alert")).toContainText("Search failed.");
  await page.unroute("**/api/tools/search");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await expect(page.locator(".search-result").first()).toContainText("main.py");
});

test("a test-only draft needs an explicit apply before the real backend writes", async ({ page }) => {
  await page.route("**/api/meta", async (route) => route.fulfill({ json: { ...(await (await route.fetch()).json()), model_configured: true } }));
  const root = await importAndIndex(page, "patch");
  const original = readFileSync(path.join(root, "main.py"), "utf8");
  const proposed = original.replace("Hello", "Welcome");
  await page.route("**/api/patches/draft", async (route) => {
    const input = route.request().postDataJSON();
    await route.fulfill({ json: {
      session_id: "test-only-draft", repo_id: input.repo_id, target_path: "main.py",
      base_content_sha256: createHash("sha256").update(original).digest("hex"),
      summary: "Test-only greeting change", rationale: "Browser regression fixture", warnings: [],
      original_line_count: 412, proposed_line_count: 412, line_count_delta: 0,
      unified_diff: "--- a/main.py\n+++ b/main.py\n@@ -1,2 +1,2 @@\n def greet(name):\n-    return f'Hello {name}'\n+    return f'Welcome {name}'",
      proposed_content: proposed, trace_summary: { agent_name: "test", model: "mock", latency_ms: 0 },
    } });
  });
  await page.getByRole("button", { name: "改动", exact: true }).click();
  await page.getByLabel("目标文件路径", { exact: true }).fill("main.py");
  await page.getByRole("textbox", { name: "改动意图", exact: true }).fill("Change the greeting");
  await page.getByRole("button", { name: "生成改动草案", exact: true }).click();
  await expect(page.getByText("Test-only greeting change", { exact: true })).toBeVisible();
  expect(readFileSync(path.join(root, "main.py"), "utf8")).toBe(original);
  await page.screenshot({ path: "test-results/desktop-draft.png", fullPage: true });
  await page.getByRole("button", { name: "应用到工作区", exact: true }).click();
  await expect.poll(() => readFileSync(path.join(root, "main.py"), "utf8").replaceAll("\r\n", "\n")).toBe(proposed);
  await page.getByRole("button", { name: "检查", exact: true }).click();
  await page.getByRole("button", { name: "运行默认检查", exact: true }).click();
  await expect(page.locator(".full-panel .patch-stack").last()).toContainText("全部通过");
  await page.screenshot({ path: "test-results/desktop-checks.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
