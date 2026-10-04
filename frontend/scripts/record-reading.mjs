import { chromium, expect } from "@playwright/test";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import { clickExample, indexExample, prepareExample } from "../../scripts/demo.mjs";

const { values } = parseArgs({ options: { locale: { type: "string", default: "zh-CN" } } });
const locale = values.locale;
if (!["zh-CN", "en"].includes(locale)) throw new Error("Supported locales: zh-CN, en");
const labels = locale === "en"
  ? { search: "Search code", repository: "Current repository", ready: "Ready", wrap: "Wrap lines" }
  : { search: "搜索代码", repository: "当前仓库", ready: "可用", wrap: "自动换行" };
const assetName = locale === "en" ? "codeatlas-reading-en" : "codeatlas-reading";
const root = path.resolve(import.meta.dirname, "../..");
const folder = await prepareExample(path.join(root, "repos/examples"));
const recordingRoot = path.join(root, "data/recording");
const output = path.join(recordingRoot, new Date().toISOString().replaceAll(/[:.]/g, "-"));
const web = process.env.DEMO_WEB_URL ?? "http://127.0.0.1:3000";
const api = process.env.DEMO_API_URL ?? "http://127.0.0.1:8000";
const meta = await (await fetch(api + "/api/meta")).json();
if (meta.model_configured) throw new Error("Record with npm run demo, which disables the model key.");
const repo = await indexExample(api, folder);
const browser = await chromium.launch();
const viewport = { width: 960, height: 640 };
const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
const network = [];
const verification = [];
const frames = [];
let capturing = false;
let recording;
page.on("request", (request) => {
  if (request.url().startsWith(api + "/api/")) network.push({ path: new URL(request.url()).pathname, method: request.method() });
});
mkdirSync(output, { recursive: true });

async function search(query) {
  await page.getByRole("textbox", { name: labels.search }).fill(query);
  const response = page.waitForResponse((response) => response.url().endsWith("/api/tools/search")
    && response.request().method() === "POST");
  await page.getByRole("textbox", { name: labels.search }).press("Enter");
  return (await (await response).json()).items;
}

async function inspect(items, filename, line, query) {
  const item = items.find((item) => item.path === filename && item.start_line <= line && item.end_line >= line);
  if (!item) throw new Error("Expected source not in search results: " + filename + ":" + line);
  const result = page.locator(".search-result").filter({ hasText: filename + ":" + item.start_line }).first();
  await result.click();
  await expect(result).toHaveAttribute("aria-current", "true");
  await expect(page.locator(".source-path")).toHaveText(filename);
  await expect(page.locator(".source-line").first()).toBeVisible();
  const start = Number(await page.locator(".line-number").first().textContent());
  const displayed = await page.locator(".source-line code").allTextContents();
  const bytes = readFileSync(path.join(folder, filename));
  const expected = bytes.toString("utf8").split(/\r?\n/).slice(start - 1, start - 1 + displayed.length).map((text) => text || " ");
  expect(displayed).toEqual(expected);
  expect(displayed.length).toBeLessThanOrEqual(200);
  expect(await page.locator(".source-code mark").count()).toBeGreaterThan(0);
  await focusLine(line);
  verification.push({ query, path: filename, start_line: start, end_line: start + displayed.length - 1,
    focus_line: line, displayed_lines_match_checkout: true, source_sha256: createHash("sha256").update(bytes).digest("hex") });
}

async function focusLine(line) {
  await page.locator(".source-code").evaluate((panel, line) => {
    const row = Array.from(panel.querySelectorAll(".source-line")).find((node) => Number(node.querySelector(".line-number").textContent) === line);
    if (!row) throw new Error("Line is outside current source page.");
    panel.scrollTop += row.getBoundingClientRect().top - panel.getBoundingClientRect().top - 70;
  }, line);
}

try {
  await page.goto(web);
  await page.getByLabel("语言", { exact: true }).selectOption(locale);
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
  await page.getByLabel(labels.repository).selectOption(String(repo.id));
  await expect(page.locator(".repository-status")).toHaveText(labels.ready);
  await page.getByRole("button", { name: "src", exact: true }).click();
  await page.getByRole("button", { name: "click", exact: true }).click();
  await inspect(await search("callback=f"), "src/click/decorators.py", 248, "callback=f");
  await page.getByRole("button", { name: labels.wrap }).click();
  await focusLine(248);
  await page.screenshot({ path: path.join(output, "poster.png") });

  const started = Date.now();
  capturing = true;
  recording = (async () => {
    while (capturing && Date.now() - started < 28_000) {
      const filename = String(frames.length).padStart(4, "0") + ".png";
      frames.push({ file: filename, elapsed_ms: Date.now() - started });
      await page.screenshot({ path: path.join(output, filename) });
      await page.waitForTimeout(180);
    }
  })();
  const at = async (seconds) => page.waitForTimeout(Math.max(0, seconds * 1000 - (Date.now() - started)));
  await at(1);
  let items = await search("callback=f");
  await at(4);
  await inspect(items, "src/click/decorators.py", 248, "callback=f");
  await at(9);
  items = await search("self.callback = callback");
  await at(12);
  await inspect(items, "src/click/core.py", 1090, "self.callback = callback");
  await at(17);
  items = await search("ctx.invoke(self.callback");
  await at(21);
  await inspect(items, "src/click/core.py", 1442, "ctx.invoke(self.callback");
  await recording;
  const duration = Date.now() - started;
  await expect(page.locator("header h1")).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  const mobileViewport = { width: 390, height: 720 };
  await page.setViewportSize(mobileViewport);
  await focusLine(1442);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator(".source-code").evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  await page.locator(".reader-panel").screenshot({ path: path.join(output, "mobile.png") });
  const modelCalls = network.filter((item) => /\/api\/(chat\/ask|patches\/draft)/.test(item.path)).length;
  expect(modelCalls).toBe(0);
  const receipt = {
    recorded_at: new Date().toISOString(), repository: "pallets/click", commit: clickExample.commit,
    locale, viewport, mobile_viewport: mobileViewport, duration_ms: duration, model_calls: modelCalls,
    mocked_responses: false, speed: "original", initial_state: "Click indexed; callback=f query, selected result and highlighted decorator source visible",
    verification, frames, network,
  };
  writeFileSync(path.join(output, "recording.json"), JSON.stringify(receipt, null, 2));
  writeFileSync(path.join(recordingRoot, "latest.json"), JSON.stringify({ directory: path.basename(output) }));
  copyFileSync(path.join(output, "poster.png"), path.join(root, `docs/assets/${assetName}.png`));
  copyFileSync(path.join(output, "mobile.png"), path.join(root, `docs/assets/${assetName}-mobile.png`));
  console.log(`Recorded ${frames.length} real frames (${locale}); three source locations verified, no model calls. ${output}`);
} catch (error) {
  writeFileSync(path.join(output, "failure.json"), JSON.stringify({ error: String(error), verification, network }, null, 2));
  throw error;
} finally {
  capturing = false;
  await recording?.catch(() => {});
  await browser.close();
}
