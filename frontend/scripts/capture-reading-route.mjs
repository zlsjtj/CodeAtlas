import { chromium, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { parseArgs } from "node:util";
import { clickExample, indexExample, prepareExample } from "../../scripts/demo.mjs";

const { values } = parseArgs({ options: {
  locale: { type: "string", default: "zh-CN" }, record: { type: "boolean", default: false },
  showcase: { type: "boolean", default: false },
} });
const showcase = values.showcase;
const record = values.record || showcase;
const locale = values.locale;
if (!["zh-CN", "en"].includes(locale)) throw new Error("Supported locales: zh-CN, en");
const en = locale === "en";
const labels = en ? {
  repository: "Current repository", search: "Search code", save: "Save to reading route", dialog: "Save reading stop",
  start: "Start line", end: "End line", note: "Note", submit: "Save stop", route: "Route", title: "Route title",
  saveTitle: "Save title", excerpt: "Saved excerpt", download: "Export Markdown",
  sameHash: "Current workspace file matches the saved file hash.", moveUp: "Move up", stopTitle: "Stop title (optional)",
} : {
  repository: "当前仓库", search: "搜索代码", save: "保存到阅读路线", dialog: "保存阅读位置",
  start: "起始行", end: "结束行", note: "笔记", submit: "保存位置", route: "路线", title: "路线标题",
  saveTitle: "保存标题", excerpt: "保存时摘录", download: "导出 Markdown", sameHash: "当前工作区文件与保存时的文件哈希一致。", moveUp: "上移", stopTitle: "位置标题（可选）",
};
const root = path.resolve(import.meta.dirname, "../..");
const web = process.env.DEMO_WEB_URL ?? "http://127.0.0.1:3000";
const api = process.env.DEMO_API_URL ?? "http://127.0.0.1:8000";
const recordingRoot = path.join(root, showcase ? "data/showcase-recording" : record ? "data/workflow-recording" : "data/reading-route-capture");
const folder = path.join(recordingRoot, new Date().toISOString().replace(/[:.]/g, "-") + "-" + locale);
mkdirSync(folder, { recursive: true });
const output = path.join(folder, "click-reading-route.md");
const pin = clickExample.commit;
const viewport = showcase ? { width: 960, height: 820 } : { width: record ? 1080 : 1120, height: record ? 800 : 1100 };
const mobileViewport = { width: 390, height: 844 };
const title = en ? "Click: from decorator to callback" : "Click：从装饰器到回调执行";
const stops = [
  { query: "callback=f", path: "src/click/decorators.py", start: 248, end: 250,
    title: en ? "Create the command" : "创建命令",
    note: en ? "The decorator passes the original function as callback, then returns the command." : "装饰器把原函数作为 callback 交给命令对象，再返回这个命令。" },
  { query: "self.callback = callback", path: "src/click/core.py", start: 1090, end: 1090,
    title: en ? "Keep the callback" : "保存回调",
    note: en ? "Command stores the callback on the instance." : "Command 将 callback 保存在实例中。" },
  { query: "ctx.invoke(self.callback", path: "src/click/core.py", start: 1441, end: 1442,
    title: en ? "Invoke the callback" : "执行回调",
    note: en ? "Command execution passes parsed parameters to the callback." : "执行命令时，将解析后的参数交给 callback。" },
];
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8",
  env: { ...process.env, GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null" } }).trim();
const sources = ["backend/app/services/source_provenance.py", "backend/app/services/retrieval_service.py",
  "frontend/components/reader/reading-route.tsx", "frontend/lib/reading-route.ts", "frontend/lib/hooks/use-reading-route.ts",
  "frontend/scripts/capture-reading-route.mjs"];
const evidence = [];
const frames = [];
let started;
let capturing = false;
let recording;
const at = async seconds => {
  if (record && started) await page.waitForTimeout(Math.max(0, seconds * 1000 - (Date.now() - started)));
};
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
  // Prepare two stops through the UI; the recording adds and reorders the third.
  const captureOrder = record ? [stops[1], stops[2], stops[0]] : stops;
  for (const stop of captureOrder) {
    if (record && stop === stops[0]) {
      await page.getByRole("textbox", { name: labels.search }).fill("");
      started = Date.now();
      capturing = true;
      recording = (async () => {
        while (capturing) {
          const file = String(frames.length).padStart(4, "0") + ".png";
          const elapsed_ms = Date.now() - started;
          await page.screenshot({ path: path.join(folder, file) });
          frames.push({ file, elapsed_ms });
          await page.waitForTimeout(180);
        }
      })();
    }
    await at(1);
    await page.getByRole("textbox", { name: labels.search }).fill(stop.query);
    const searchReady = page.waitForResponse(response => response.url().endsWith("/api/tools/search") && response.request().method() === "POST");
    await page.getByRole("textbox", { name: labels.search }).press("Enter");
    const results = (await (await searchReady).json()).items;
    const index = results.findIndex(item => item.path === stop.path && item.start_line <= stop.start && item.end_line >= stop.end);
    expect(index).toBeGreaterThanOrEqual(0);
    const match = page.locator(".search-result").nth(index);
    await expect(match.locator(".result-path")).toHaveText(`${stop.path}:${results[index].start_line}`);
    const pending = page.waitForResponse(response => response.url().endsWith("/api/tools/read") && response.request().method() === "POST");
    await at(4);
    await match.click();
    const item = (await (await pending).json()).items[0];
    expect(item.start_line).toBeLessThanOrEqual(stop.start);
    expect(item.end_line).toBeGreaterThanOrEqual(stop.end);
    const file = readFileSync(path.join(checkout, stop.path), "utf8").replaceAll("\r\n", "\n").replaceAll("\r", "\n");
    expect(item.provenance).toEqual({ revision: pin, state: "commit", content_sha256: hash(file),
      file_url: `https://github.com/pallets/click/blob/${pin}/${stop.path}` });
    await expect(page.locator(".source-path")).toHaveText(stop.path);
    const firstLine = Number(await page.locator(".line-number").first().textContent());
    const displayed = await page.locator(".source-line code").allTextContents();
    expect(displayed).toEqual(file.split("\n").slice(firstLine - 1, firstLine - 1 + displayed.length).map(line => line || " "));
    expect(displayed.length).toBeLessThanOrEqual(200);
    await page.locator(".source-code").evaluate((panel, line) => {
      const row = [...panel.querySelectorAll(".source-line")].find(node => Number(node.querySelector(".line-number").textContent) === line);
      if (!row) throw new Error("Saved line is not on the current source page.");
      panel.scrollTop += row.getBoundingClientRect().top - panel.getBoundingClientRect().top - 70;
    }, stop.start);
    await at(8);
    await page.getByRole("button", { name: labels.save, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: labels.dialog });
    await at(10);
    await dialog.getByLabel(labels.start).fill(String(stop.start));
    await dialog.getByLabel(labels.end).fill(String(stop.end));
    await dialog.getByLabel(labels.stopTitle).fill(stop.title);
    const note = dialog.getByRole("textbox", { name: labels.note, exact: true });
    if (record && started) await note.pressSequentially(stop.note, { delay: 35 });
    else await note.fill(stop.note);
    await at(15);
    await dialog.getByRole("button", { name: labels.submit, exact: true }).click();
    await expect(dialog).not.toBeVisible();
    evidence.push({ ...stop, excerpt: file.split("\n").slice(stop.start - 1, stop.end).join("\n"), provenance: item.provenance });
  }
  if (record) {
    await at(16);
    await page.locator(".feedback-bar button").click();
  }
  await at(18);
  await page.getByRole("button", { name: labels.route, exact: true }).click();
  const entries = page.locator(".reading-route-list > li");
  if (record) {
    await at(20);
    await entries.nth(2).getByRole("button", { name: labels.moveUp, exact: true }).click();
    await at(22);
    await entries.nth(1).getByRole("button", { name: labels.moveUp, exact: true }).click();
    evidence.unshift(evidence.pop());
  }
  await at(24);
  await page.getByLabel(labels.title).fill(title);
  await page.getByRole("button", { name: labels.saveTitle }).click();
  await expect(entries).toHaveCount(3);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(key => key.startsWith("codeatlas:reading-route:")))));
  for (let index = 0; index < evidence.length; index++) {
    expect(saved.entries[index].excerpt).toBe(evidence[index].excerpt);
    if (!record || (!showcase && index === 0)) {
      await at(26 + index);
      await entries.nth(index).getByText(labels.excerpt, { exact: true }).click();
    }
  }
  if (record) await page.locator(".full-panel").evaluate(panel => { panel.scrollTop = 0; });
  await at(30);
  await page.screenshot({ path: path.join(folder, "desktop.png") });
  await at(33);
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
  await at(40);
  capturing = false;
  await recording;
  const duration = started ? Date.now() - started : null;
  if (record) expect(duration).toBeLessThanOrEqual(45_000);
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
  const name = showcase ? "showcase" : record ? "workflow" : "reading";
  const asset = showcase ? "showcase" : record ? "workflow" : "route";
  copyFileSync(output, path.join(root, `docs/examples/click-${name}-route${en ? ".en" : ""}.md`));
  copyFileSync(path.join(folder, "desktop.png"), path.join(root, `docs/assets/codeatlas-${asset}${suffix}.png`));
  copyFileSync(path.join(folder, "mobile.png"), path.join(root, `docs/assets/codeatlas-${asset}${suffix}-mobile.png`));
  if (record) {
    writeFileSync(path.join(folder, "recording.json"), JSON.stringify({ ...receipt, duration_ms: duration,
      frames, mocked_responses: false, speed: "original",
      initial_state: "Click indexed; callback storage and invocation stops saved through the UI before recording",
      sequence: showcase
        ? "Search decorator, read source, save title and note, reorder three stops, name route, download Markdown"
        : "Search decorator, read source, save excerpt and note, reorder three stops, name route, expand first excerpt, download Markdown",
    }, null, 2) + "\n");
    writeFileSync(path.join(recordingRoot, "latest.json"), JSON.stringify({ directory: path.basename(folder) }));
  } else copyFileSync(path.join(folder, "receipt.json"), path.join(root, `docs/evidence/reading-route${suffix}.json`));
  console.log(JSON.stringify({ folder, modelRequests, stops: evidence.length }));
} catch (error) {
  writeFileSync(path.join(folder, "failure.json"), JSON.stringify({ evidence, modelRequests, error: String(error) }, null, 2));
  if (page && !page.isClosed()) await page.screenshot({ path: path.join(folder, "failure.png") }).catch(() => {});
  console.error("Failure evidence: " + folder);
  throw error;
} finally {
  capturing = false;
  await recording?.catch(() => {});
  await browser?.close();
}
