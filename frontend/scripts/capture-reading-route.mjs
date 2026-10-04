import { chromium, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { parseArgs } from "node:util";
import { clickExample, indexExample, prepareExample } from "../../scripts/demo.mjs";

const { values } = parseArgs({ options: { locale: { type: "string", default: "zh-CN" } } });
const locale = values.locale;
if (!["zh-CN", "en"].includes(locale)) throw new Error("Supported locales: zh-CN, en");
const en = locale === "en";
const labels = en ? {
  repository: "Current repository", search: "Search code", save: "Save to reading route", dialog: "Save reading stop",
  start: "Start line", end: "End line", note: "Note", submit: "Save stop", route: "Route", title: "Route title",
  saveTitle: "Save title", excerpt: "Saved excerpt", download: "Export Markdown",
  sameHash: "Current workspace file matches the saved file hash.",
} : {
  repository: "当前仓库", search: "搜索代码", save: "保存到阅读路线", dialog: "保存阅读位置",
  start: "起始行", end: "结束行", note: "笔记", submit: "保存位置", route: "路线", title: "路线标题",
  saveTitle: "保存标题", excerpt: "保存时摘录", download: "导出 Markdown", sameHash: "当前工作区文件与保存时的文件哈希一致。",
};
const root = path.resolve(import.meta.dirname, "../..");
const web = process.env.DEMO_WEB_URL ?? "http://127.0.0.1:3000";
const api = process.env.DEMO_API_URL ?? "http://127.0.0.1:8000";
const folder = path.join(root, "data/reading-route-capture", new Date().toISOString().replace(/[:.]/g, "-") + "-" + locale);
mkdirSync(folder, { recursive: true });
const output = path.join(folder, "click-reading-route.md");
const pin = clickExample.commit;
const viewport = { width: 1120, height: 1100 };
const mobileViewport = { width: 390, height: 844 };
const title = en ? "Click: from decorator to callback" : "Click：从装饰器到回调执行";
const stops = [
  { query: "callback=f", path: "src/click/decorators.py", start: 248, end: 250,
    note: en ? "The decorator passes the original function as callback, then returns the command." : "装饰器把原函数作为 callback 交给命令对象，再返回这个命令。" },
  { query: "self.callback = callback", path: "src/click/core.py", start: 1090, end: 1090,
    note: en ? "Command stores the callback on the instance." : "Command 将 callback 保存在实例中。" },
  { query: "ctx.invoke(self.callback", path: "src/click/core.py", start: 1441, end: 1442,
    note: en ? "Command execution passes parsed parameters to the callback." : "执行命令时，将解析后的参数交给 callback。" },
];
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8",
  env: { ...process.env, GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null" } }).trim();
const sources = ["backend/app/services/source_provenance.py", "backend/app/services/retrieval_service.py",
  "frontend/components/reader/reading-route.tsx", "frontend/lib/reading-route.ts", "frontend/lib/hooks/use-reading-route.ts",
  "frontend/scripts/capture-reading-route.mjs"];
const evidence = [];
let modelRequests = 0;
let browser;
let page;
try {
  const meta = await (await fetch(api + "/api/meta")).json();
  if (meta.model_configured) throw new Error("Use npm run demo, which disables the model key.");
  const checkout = await prepareExample(path.join(root, "repos/examples"));
  const repository = await indexExample(api, checkout);
  browser = await chromium.launch();
  page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.on("request", request => { if (/\/api\/(chat\/ask|patches\/draft)/.test(new URL(request.url()).pathname)) modelRequests++; });
  await page.goto(web, { waitUntil: "networkidle" });
  await page.getByLabel("语言", { exact: true }).selectOption(locale);
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
  await page.getByLabel(labels.repository).selectOption(String(repository.id));
  for (const stop of stops) {
    await page.getByRole("textbox", { name: labels.search }).fill(stop.query);
    const searchReady = page.waitForResponse(response => response.url().endsWith("/api/tools/search") && response.request().method() === "POST");
    await page.getByRole("textbox", { name: labels.search }).press("Enter");
    const results = (await (await searchReady).json()).items;
    const index = results.findIndex(item => item.path === stop.path && item.start_line <= stop.start && item.end_line >= stop.end);
    expect(index).toBeGreaterThanOrEqual(0);
    const match = page.locator(".search-result").nth(index);
    await expect(match.locator(".result-path")).toHaveText(`${stop.path}:${results[index].start_line}`);
    const pending = page.waitForResponse(response => response.url().endsWith("/api/tools/read") && response.request().method() === "POST");
    await match.click();
    const item = (await (await pending).json()).items[0];
    expect(item.start_line).toBeLessThanOrEqual(stop.start);
    expect(item.end_line).toBeGreaterThanOrEqual(stop.end);
    const file = readFileSync(path.join(checkout, stop.path), "utf8").replaceAll("\r\n", "\n").replaceAll("\r", "\n");
    expect(item.provenance).toEqual({ revision: pin, state: "commit", content_sha256: hash(file),
      file_url: `https://github.com/pallets/click/blob/${pin}/${stop.path}` });
    await page.getByRole("button", { name: labels.save, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: labels.dialog });
    await dialog.getByLabel(labels.start).fill(String(stop.start));
    await dialog.getByLabel(labels.end).fill(String(stop.end));
    await dialog.getByRole("textbox", { name: labels.note, exact: true }).fill(stop.note);
    await dialog.getByRole("button", { name: labels.submit, exact: true }).click();
    await expect(dialog).not.toBeVisible();
    evidence.push({ ...stop, excerpt: file.split("\n").slice(stop.start - 1, stop.end).join("\n"), provenance: item.provenance });
  }
  await page.getByRole("button", { name: labels.route, exact: true }).click();
  await page.getByLabel(labels.title).fill(title);
  await page.getByRole("button", { name: labels.saveTitle }).click();
  const entries = page.locator(".reading-route-list > li");
  await expect(entries).toHaveCount(3);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(key => key.startsWith("codeatlas:reading-route:")))));
  for (let index = 0; index < evidence.length; index++) {
    expect(saved.entries[index].excerpt).toBe(evidence[index].excerpt);
    await entries.nth(index).getByText(labels.excerpt, { exact: true }).click();
  }
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: labels.download }).click();
  await (await download).saveAs(output);
  const exported = readFileSync(output, "utf8");
  for (const stop of evidence) {
    expect(exported).toContain(stop.excerpt);
    expect(exported).toContain(`${stop.provenance.file_url}#L${stop.start}-L${stop.end}`);
  }
  expect(exported).not.toContain(checkout);
  await page.screenshot({ path: path.join(folder, "desktop.png") });
  await page.setViewportSize(mobileViewport);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: path.join(folder, "mobile.png") });
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".language-picker").selectOption(locale);
  await page.getByRole("button", { name: labels.route, exact: true }).click();
  await expect(entries).toHaveCount(3);
  await entries.first().getByRole("button", { name: "src/click/decorators.py:248–250", exact: true }).click();
  await expect(page.getByText(labels.sameHash, { exact: true })).toBeVisible();
  expect(modelRequests).toBe(0);
  const receipt = {
    recorded_at: new Date().toISOString(), platform: process.platform, browser: browser.version(), locale, viewport, mobile_viewport: mobileViewport,
    codeatlas: { base_commit: git("rev-parse", "HEAD"), working_tree_dirty: Boolean(git("status", "--porcelain")),
      source_sha256: Object.fromEntries(sources.map(file => [file, hash(readFileSync(path.join(root, file)))])) },
    click_commit: pin, model_requests: modelRequests, excerpts_match_checkout: true, refresh_restores_stops: true,
    source_reopen_matches_hash: true, remote_link_availability_checked: false, evidence,
    artifact_sha256: Object.fromEntries(["desktop.png", "mobile.png", "click-reading-route.md"].map(file => [file, hash(readFileSync(path.join(folder, file)))])),
  };
  writeFileSync(path.join(folder, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
  mkdirSync(path.join(root, "docs/examples"), { recursive: true });
  const suffix = en ? "-en" : "";
  copyFileSync(output, path.join(root, `docs/examples/click-reading-route${en ? ".en" : ""}.md`));
  copyFileSync(path.join(folder, "desktop.png"), path.join(root, `docs/assets/codeatlas-route${suffix}.png`));
  copyFileSync(path.join(folder, "mobile.png"), path.join(root, `docs/assets/codeatlas-route${suffix}-mobile.png`));
  copyFileSync(path.join(folder, "receipt.json"), path.join(root, `docs/evidence/reading-route${suffix}.json`));
  console.log(JSON.stringify({ folder, modelRequests, stops: evidence.length }));
} catch (error) {
  writeFileSync(path.join(folder, "failure.json"), JSON.stringify({ evidence, modelRequests, error: String(error) }, null, 2));
  if (page && !page.isClosed()) await page.screenshot({ path: path.join(folder, "failure.png") }).catch(() => {});
  console.error("Failure evidence: " + folder);
  throw error;
} finally { await browser?.close(); }
