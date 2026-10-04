import type { RepositoryRecord, SourceProvenance, ToolResultItem } from "./types";
import type { WorkspaceLocale } from "./workspace-i18n";

export const MAX_ROUTE_ENTRIES = 50;
export const MAX_NOTE_LENGTH = 2000;
export const MAX_STOP_TITLE_LENGTH = 120;
export type ReadingStop = {
  id: string;
  title?: string;
  path: string;
  startLine: number;
  endLine: number;
  excerpt: string;
  note: string;
  savedAt: string;
  provenance: SourceProvenance;
};
export type ReadingRoute = { version: 1; title: string; entries: ReadingStop[] };

export function routeStorageKey(repository: RepositoryRecord) {
  return "codeatlas:reading-route:v1:" + JSON.stringify([
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
    repository.id, repository.created_at, repository.root_path, repository.source_url,
  ]);
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function validFileUrl(value: unknown, revision: unknown): value is string {
  if (typeof value !== "string" || typeof revision !== "string" || !/^[a-f0-9]{40}$/.test(revision)) return false;
  if (/[\s<>()[\]`\\]/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.href === value && url.protocol === "https:" && url.host === "github.com" && !url.username && !url.password
      && !url.search && !url.hash && new RegExp(`^/[^/]+/[^/]+/blob/${revision}/.+`).test(url.pathname);
  } catch { return false; }
}

export function parseReadingRoute(raw: string): ReadingRoute {
  if (raw.length > 4_000_000) throw new Error("Invalid route size");
  const value: unknown = JSON.parse(raw);
  if (!record(value) || value.version !== 1 || typeof value.title !== "string" || !value.title.trim()
    || value.title.length > 120 || !Array.isArray(value.entries) || value.entries.length > MAX_ROUTE_ENTRIES) throw new Error("Invalid route");
  const ids = new Set<string>();
  for (const stop of value.entries) {
    if (!record(stop) || typeof stop.id !== "string" || !stop.id || stop.id.length > 100 || ids.has(stop.id)
      || typeof stop.path !== "string" || !stop.path || stop.path.length > 4096
      || /^[\\/]/.test(stop.path) || /^[A-Za-z]:/.test(stop.path) || stop.path.split(/[\\/]/).includes("..")
      || !Number.isInteger(stop.startLine) || !Number.isInteger(stop.endLine)
      || Number(stop.startLine) < 1 || Number(stop.endLine) < Number(stop.startLine) || Number(stop.endLine) - Number(stop.startLine) >= 200
      || typeof stop.excerpt !== "string" || stop.excerpt.length > 200_000
      || typeof stop.note !== "string" || stop.note.length > MAX_NOTE_LENGTH
      || (stop.title !== undefined && (typeof stop.title !== "string" || stop.title.length > MAX_STOP_TITLE_LENGTH || /[\r\n]/.test(stop.title)))
      || typeof stop.savedAt !== "string" || !Number.isFinite(Date.parse(stop.savedAt))
      || new Date(stop.savedAt).toISOString() !== stop.savedAt) throw new Error("Invalid stop");
    const info = stop.provenance;
    if (!record(info) || typeof info.content_sha256 !== "string" || !/^[a-f0-9]{64}$/.test(info.content_sha256)
      || !["commit", "modified", "local", "unknown"].includes(String(info.state))
      || (info.revision != null && (typeof info.revision !== "string" || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(info.revision)))
      || (info.state === "commit" && !info.revision)
      || (info.file_url != null && (info.state !== "commit" || !validFileUrl(info.file_url, info.revision)))) throw new Error("Invalid provenance");
    ids.add(stop.id);
  }
  return value as ReadingRoute;
}

export function makeReadingStop(source: ToolResultItem, startLine: number, endLine: number, note: string, title = ""): ReadingStop {
  if (!source.provenance || source.content == null || !Number.isInteger(startLine) || !Number.isInteger(endLine)
    || startLine < (source.start_line ?? 1) || endLine > (source.end_line ?? 0) || startLine > endLine) throw new Error("Invalid range");
  const offset = source.start_line ?? 1;
  return {
    id: crypto.randomUUID(), path: source.path, startLine, endLine, note, title: title.trim(),
    excerpt: source.content.split("\n").slice(startLine - offset, endLine - offset + 1).join("\n"),
    provenance: { ...source.provenance }, savedAt: new Date().toISOString(),
  };
}

export function provenanceLabel(info: SourceProvenance, locale: WorkspaceLocale) {
  const en = locale === "en";
  return {
    commit: en ? "Matches commit" : "与提交内容一致",
    modified: en ? "Modified or untracked file" : "文件已修改或未跟踪",
    local: en ? "Local file, no Git revision" : "本地文件，无 Git 版本",
    unknown: en ? "Revision unverified" : "版本未确认",
  }[info.state];
}

function plainMarkdown(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/([\\`*_[\]{}()#+.!|>-])/g, "\\$1");
}

function codeLanguage(file: string): string {
  const languages: Record<string, string> = {
    py: "python", js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "jsx",
    ts: "typescript", tsx: "tsx", json: "json", css: "css", html: "html", sh: "bash",
    yaml: "yaml", yml: "yaml", rs: "rust", go: "go", java: "java", c: "c", h: "c", cpp: "cpp",
  };
  return languages[file.split(".").pop()?.toLowerCase() ?? ""] ?? "";
}

export function exportReadingRoute(route: ReadingRoute, repositoryName: string, locale: WorkspaceLocale): string {
  const en = locale === "en";
  const lines = ["# " + plainMarkdown(route.title.replace(/[\r\n]/g, " ")), "",
    `${en ? "Repository" : "仓库"}: ${plainMarkdown(repositoryName.replace(/[\r\n]/g, " "))}`, "",
    en ? "Saved source excerpts and notes, not a live workspace view."
      : "源码摘录与笔记保存于阅读时，不随当前工作区变化。", ""];
  route.entries.forEach((stop, index) => {
    const info = stop.provenance;
    const location = `${stop.path.replace(/[\r\n]/g, " ")}:${stop.startLine}${stop.endLine === stop.startLine ? "" : `-${stop.endLine}`}`;
    const linked = info.state === "commit" && validFileUrl(info.file_url, info.revision);
    lines.push(`## ${index + 1}. ${plainMarkdown(stop.title?.trim() || location)}`, "");
    if (linked) lines.push(`[${plainMarkdown(location)}](${info.file_url}#L${stop.startLine}-L${stop.endLine})`);
    else lines.push(`${plainMarkdown(location)} · ${provenanceLabel(info, locale)}`);
    if (stop.note) lines.push("", plainMarkdown(stop.note));
    const ticks = stop.excerpt.match(/`+/g) ?? [];
    const fence = "`".repeat(Math.max(3, ...ticks.map(run => run.length + 1)));
    lines.push("", fence + codeLanguage(stop.path), stop.excerpt, fence, "",
      "<details>", `<summary>${en ? "Source and version" : "来源与版本"}</summary>`, "",
      `- ${en ? "Source" : "来源"}: ${provenanceLabel(info, locale)}`,
      `- ${en ? "Saved" : "保存时间"}: ${stop.savedAt}`,
      `- ${en ? "File SHA-256" : "文件 SHA-256"}: \`${info.content_sha256}\``);
    if (info.revision) lines.push(`- ${info.state === "commit" ? (en ? "Commit" : "提交") : (en ? "HEAD at read time (not an exact source version)" : "读取时 HEAD（不等于摘录版本）")}: \`${info.revision}\``);
    lines.push("", "</details>", "");
  });
  lines.push("<details>", `<summary>${en ? "About this export" : "关于这份导出"}</summary>`, "",
    en ? "File hashes use the whole UTF-8 file with LF line endings." : "文件哈希按整个 UTF-8 文件计算，换行统一为 LF。", "");
  if (route.entries.some(stop => stop.provenance.file_url)) lines.push(en
    ? "GitHub links use the local origin and commit; remote availability and access permissions have not been checked."
    : "GitHub 链接按本地 origin 和提交生成，未确认提交是否已推送或访问权限。", "");
  lines.push("</details>", "");
  return lines.join("\n");
}
