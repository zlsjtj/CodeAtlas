import { chromium, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = path.resolve(import.meta.dirname, "../..");
const folder = path.join(root, "repos/click-demo");
const output = path.join(root, "data/recording");
const cases = JSON.parse(readFileSync(path.join(root, "benchmarks/reading-cases.json"), "utf8"));
const commit = execFileSync("git", ["-C", folder, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (commit !== cases.repositories[1].commit) throw new Error("Click checkout does not match the case manifest.");
const web = process.env.DEMO_WEB_URL ?? "http://127.0.0.1:3000";
const api = process.env.DEMO_API_URL ?? "http://127.0.0.1:8000";
const post = async (route, body) => {
  const response = await fetch(`${api}${route}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`${route}: ${response.status}`);
  return response.json();
};
const existing = await (await fetch(`${api}/api/repositories`)).json();
const repo = existing.items.find((item) => item.name === "Click") ?? await post("/api/repositories", { name: "Click", source_type: "local", root_path: folder });
await post(`/api/repositories/${repo.id}/index`, {});
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const network = [];
page.on("response", (response) => { if (response.url().includes("/api/")) network.push({ url: response.url().replace(api, ""), status: response.status() }); });
mkdirSync(output, { recursive: true });
try {
  await page.goto(web);
  await page.getByLabel("当前仓库").selectOption(String(repo.id));
  await page.getByRole("button", { name: "符号", exact: true }).click();
  await expect(page.locator(".repository-status")).toHaveText("可用");
  await page.getByRole("button", { name: "src", exact: true }).click();
  await page.getByRole("button", { name: "click", exact: true }).click();

  const started = Date.now();
  const frames = [];
  const recording = (async () => {
    while (Date.now() - started < 26_000) {
      const filename = `${String(frames.length).padStart(4, "0")}.png`;
      frames.push({ file: filename, elapsed_ms: Date.now() - started });
      await page.screenshot({ path: path.join(output, filename) });
      await new Promise((resolve) => setTimeout(resolve, 180));
    }
  })();
  const at = async (seconds) => { await new Promise((resolve) => setTimeout(resolve, Math.max(0, seconds * 1000 - (Date.now() - started)))); };
  await at(2);
  await page.getByRole("textbox", { name: "搜索代码" }).pressSequentially("Command", { delay: 160 });
  await at(5);
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  const result = page.locator(".search-result").filter({ hasText: "src/click/core.py" }).first();
  await expect(result).toBeVisible();
  await at(8);
  await result.click();
  await expect(page.getByRole("region", { name: "文件内容" })).toContainText("class Command");
  const firstLine = Number(await page.locator(".line-number").first().textContent());
  const actualLines = await page.locator(".source-line code").allTextContents();
  const expectedLines = readFileSync(path.join(folder, "src/click/core.py"), "utf8").split(/\r?\n/).slice(firstLine - 1, firstLine + 199).map((line) => line || " ");
  expect(actualLines).toEqual(expectedLines);
  await at(13);
  await page.getByRole("region", { name: "文件内容" }).hover();
  await page.mouse.wheel(0, 270);
  await at(17);
  await page.getByRole("button", { name: "下一段", exact: true }).click();
  await at(20);
  await page.getByRole("button", { name: "上一段", exact: true }).click();
  await at(23);
  await page.getByRole("region", { name: "文件内容" }).evaluate((element) => { element.scrollTop = 0; });
  await recording;
  await expect(page.locator("header h1")).toBeInViewport();
  await page.screenshot({ path: path.join(root, "docs/assets/codeatlas-reading.png") });
  const source = readFileSync(path.join(folder, "src/click/core.py"));
  writeFileSync(path.join(output, "recording.json"), JSON.stringify({
    recorded_at: new Date().toISOString(), repository: "pallets/click", commit, model_calls: 0,
    viewport: { width: 1280, height: 800 }, duration_ms: Date.now() - started,
    source_sha256: createHash("sha256").update(source).digest("hex"),
    verification: { path: "src/click/core.py", start_line: firstLine, end_line: firstLine + actualLines.length - 1, displayed_lines_match_checkout: true },
    frames, network,
  }, null, 2));
  console.log(`Recorded ${frames.length} real browser frames; no mocked requests or model calls.`);
} finally { await browser.close(); }
