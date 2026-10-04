import { chromium, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { prepareExample } from "../../scripts/demo.mjs";

const { values } = parseArgs({ options: { locale: { type: "string", default: "zh-CN" } } });
const locale = values.locale;
if (!["zh-CN", "en"].includes(locale)) throw new Error("Supported locales: zh-CN, en");
const en = locale === "en";
const labels = en ? {
  repository: "Current repository", search: "Search code", save: "Save to reading route", dialog: "Save reading stop",
  start: "Start line", end: "End line", stopTitle: "Stop title (optional)", note: "Note", submit: "Save stop",
  route: "Route", title: "Route title", saveTitle: "Save title", download: "Export Markdown", wrap: "Wrap lines",
  sameHash: "Current workspace file matches the saved file hash.",
} : {
  repository: "当前仓库", search: "搜索代码", save: "保存到阅读路线", dialog: "保存阅读位置",
  start: "起始行", end: "结束行", stopTitle: "位置标题（可选）", note: "笔记", submit: "保存位置",
  route: "路线", title: "路线标题", saveTitle: "保存标题", download: "导出 Markdown", wrap: "自动换行",
  sameHash: "当前工作区文件与保存时的文件哈希一致。",
};
const root = path.resolve(import.meta.dirname, "../..");
const manifestPath = "docs/examples/codeatlas-search-case.json";
const example = JSON.parse(readFileSync(path.join(root, manifestPath), "utf8"));
const pin = example.repository.commit;
const sourceUrl = example.repository.url.replace(/\.git$/, "");
const web = process.env.DEMO_WEB_URL ?? "http://127.0.0.1:3000";
const api = process.env.DEMO_API_URL ?? "http://127.0.0.1:8000";
const folder = path.join(root, "data/search-case-capture", new Date().toISOString().replace(/[:.]/g, "-") + "-" + locale);
mkdirSync(folder, { recursive: true });
const viewport = { width: 1280, height: 900 };
const mobileViewport = { width: 390, height: 844 };
const output = path.join(folder, "codeatlas-search-route.md");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true,
  env: { ...process.env, GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null" } }).trim();
const evidence = [];
let modelRequests = 0;
let browser;
let page;

async function checkSource(checkout, stop, item) {
  const file = readFileSync(path.join(checkout, stop.path), "utf8").replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  expect(item.start_line).toBeLessThanOrEqual(stop.start);
  expect(item.end_line).toBeGreaterThanOrEqual(stop.end);
  expect(item.provenance).toEqual({ revision: pin, state: "commit", content_sha256: hash(file),
    file_url: `${sourceUrl}/blob/${pin}/${stop.path}` });
  await expect(page.locator(".source-path")).toHaveText(stop.path);
  const firstLine = Number(await page.locator(".line-number").first().textContent());
  const displayed = await page.locator(".source-line code").allTextContents();
  expect(displayed.length).toBeGreaterThan(0);
  expect(displayed.length).toBeLessThanOrEqual(200);
  expect(displayed).toEqual(file.split("\n").slice(firstLine - 1, firstLine - 1 + displayed.length).map(line => line || " "));
  return file.split("\n").slice(stop.start - 1, stop.end).join("\n");
}

try {
  const metaResponse = await fetch(api + "/api/meta");
  expect(metaResponse.ok).toBe(true);
  expect((await metaResponse.json()).model_configured).toBe(false);
  const checkout = await prepareExample(path.join(root, "repos/examples"), example.repository);
  const repositoriesResponse = await fetch(api + "/api/repositories");
  expect(repositoriesResponse.ok).toBe(true);
  const { items } = await repositoriesResponse.json();
  const existing = items.find(item => item.root_path && path.resolve(item.root_path) === checkout);
  browser = await chromium.launch();
  page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.on("request", request => {
    if (/\/api\/(chat\/ask|patches\/draft)/.test(new URL(request.url()).pathname)) modelRequests++;
  });
  await page.goto(web, { waitUntil: "networkidle" });
  // Import and index through the same controls a reader uses, in a fresh browser context.
  if (existing) {
    await page.getByLabel("当前仓库").selectOption(String(existing.id));
    await expect(page.locator(".repository-status")).toHaveText("可用");
  } else {
    await page.locator("header").getByRole("button", { name: "导入仓库", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("仓库名称", { exact: false }).fill("CodeAtlas");
    await dialog.getByLabel("本地仓库路径").fill(checkout);
    await dialog.getByRole("button", { name: "登记仓库", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await page.getByRole("button", { name: "开始索引", exact: true }).click();
    await expect(page.locator(".repository-status")).toHaveText("可用", { timeout: 120_000 });
  }
  await page.getByLabel("语言", { exact: true }).selectOption(locale);
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
  await expect(page.getByLabel(labels.repository).locator("option:checked")).toHaveText("CodeAtlas");
  for (const stop of example.stops) {
    const search = page.getByRole("textbox", { name: labels.search });
    await search.fill(stop.query);
    const searchReady = page.waitForResponse(response => response.url().endsWith("/api/tools/search") && response.request().method() === "POST");
    await search.press("Enter");
    const response = await searchReady;
    expect(response.ok()).toBe(true);
    const results = (await response.json()).items;
    const index = results.findIndex(item => item.path === stop.path && item.start_line <= stop.start && item.end_line >= stop.start);
    expect(index, `Search result for ${stop.path}:${stop.start}`).toBeGreaterThanOrEqual(0);
    const match = page.locator(".search-result").nth(index);
    await expect(match.locator(".result-path")).toHaveText(`${stop.path}:${results[index].start_line}`);
    const sourceReady = page.waitForResponse(response => response.url().endsWith("/api/tools/read") && response.request().method() === "POST");
    await match.click();
    const sourceResponse = await sourceReady;
    expect(sourceResponse.ok()).toBe(true);
    const item = (await sourceResponse.json()).items[0];
    const excerpt = await checkSource(checkout, stop, item);
    await page.getByRole("button", { name: labels.save, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: labels.dialog });
    await dialog.getByLabel(labels.start).fill(String(stop.start));
    await dialog.getByLabel(labels.end).fill(String(stop.end));
    await dialog.getByLabel(labels.stopTitle).fill(stop.title[locale]);
    await dialog.getByRole("textbox", { name: labels.note, exact: true }).fill(stop.note[locale]);
    await dialog.getByRole("button", { name: labels.submit, exact: true }).click();
    await expect(dialog).not.toBeVisible();
    evidence.push({ path: stop.path, start: stop.start, end: stop.end, query: stop.query,
      title: stop.title[locale], note: stop.note[locale], excerpt, provenance: item.provenance });
  }
  await page.getByRole("button", { name: labels.route, exact: true }).click();
  await page.getByLabel(labels.title).fill(example.title[locale]);
  await page.getByRole("button", { name: labels.saveTitle }).click();
  const entries = page.locator(".reading-route-list > li");
  await expect(entries).toHaveCount(example.stops.length);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(key => key.startsWith("codeatlas:reading-route:")))));
  for (let index = 0; index < evidence.length; index++) {
    expect(saved.entries[index].excerpt).toBe(evidence[index].excerpt);
    expect(saved.entries[index].title).toBe(evidence[index].title);
    expect(saved.entries[index].note).toBe(evidence[index].note);
  }
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: labels.download }).click();
  await (await download).saveAs(output);
  const exported = readFileSync(output, "utf8");
  for (const stop of evidence) {
    expect(exported).toContain(stop.title);
    expect(exported).toContain(stop.excerpt);
    expect(exported).toContain(`${stop.provenance.file_url}#L${stop.start}-L${stop.end}`);
  }
  expect(exported).not.toContain(checkout);
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".language-picker").selectOption(locale);
  await page.getByRole("button", { name: labels.route, exact: true }).click();
  await expect(entries).toHaveCount(example.stops.length);
  const pictured = example.stops[4];
  const reopened = page.waitForResponse(response => response.url().endsWith("/api/tools/read") && response.request().method() === "POST");
  await entries.nth(4).getByRole("button", { name: `${pictured.path}:${pictured.start}–${pictured.end}`, exact: true }).click();
  const reopenedItem = (await (await reopened).json()).items[0];
  await checkSource(checkout, pictured, reopenedItem);
  await expect(page.getByText(labels.sameHash, { exact: true })).toBeVisible();
  const wrap = page.getByRole("button", { name: labels.wrap, exact: true });
  if (await wrap.getAttribute("aria-pressed") !== "true") await wrap.click();
  await page.screenshot({ path: path.join(folder, "desktop.png") });
  await page.setViewportSize(mobileViewport);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator(".source-code")).toBeVisible();
  await page.screenshot({ path: path.join(folder, "mobile.png") });
  expect(modelRequests).toBe(0);
  const sources = [manifestPath, "frontend/scripts/capture-search-case.mjs", "scripts/demo.mjs",
    "frontend/lib/reading-route.ts", "frontend/lib/hooks/use-reading-route.ts", "backend/app/services/source_provenance.py"];
  const receipt = {
    recorded_at: new Date().toISOString(), platform: process.platform, browser: browser.version(), locale, viewport, mobile_viewport: mobileViewport,
    codeatlas: { base_commit: git("rev-parse", "HEAD"), working_tree_dirty: Boolean(git("status", "--porcelain")),
      source_sha256: Object.fromEntries(sources.map(file => [file, hash(readFileSync(path.join(root, file)))])) },
    subject: example.repository, import_mode: existing ? "reused indexed checkout" : "UI import and indexing",
    model_requests: modelRequests, mocked_responses: false, excerpts_match_checkout: true,
    refresh_restores_stops: true, source_reopen_matches_hash: true, remote_link_availability_checked: false, evidence,
    artifact_sha256: Object.fromEntries(["desktop.png", "mobile.png", "codeatlas-search-route.md"].map(file => [file, hash(readFileSync(path.join(folder, file)))])),
  };
  writeFileSync(path.join(folder, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
  const suffix = en ? "-en" : "";
  copyFileSync(output, path.join(root, `docs/examples/codeatlas-search-route${en ? ".en" : ""}.md`));
  copyFileSync(path.join(folder, "desktop.png"), path.join(root, `docs/assets/codeatlas-search${suffix}.png`));
  copyFileSync(path.join(folder, "mobile.png"), path.join(root, `docs/assets/codeatlas-search${suffix}-mobile.png`));
  copyFileSync(path.join(folder, "receipt.json"), path.join(root, `docs/evidence/codeatlas-search${suffix}.json`));
  console.log(JSON.stringify({ folder, modelRequests, stops: evidence.length, importMode: receipt.import_mode }));
} catch (error) {
  writeFileSync(path.join(folder, "failure.json"), JSON.stringify({ evidence, modelRequests, error: String(error) }, null, 2) + "\n");
  if (page && !page.isClosed()) await page.screenshot({ path: path.join(folder, "failure.png") }).catch(() => {});
  console.error("Failure evidence: " + folder);
  throw error;
} finally {
  await browser?.close();
}
