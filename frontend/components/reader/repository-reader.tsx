"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronRight, FileCode2, Folder, RefreshCw, Search } from "lucide-react";
import type { SourceTarget, useRepositoryReader } from "@/lib/hooks/use-repository-reader";
import type { WorkspaceLocale } from "@/lib/workspace-i18n";

type Reader = ReturnType<typeof useRepositoryReader>;

export function RepositoryTree({ reader, locale, onOpenSource }: { reader: Reader; locale: WorkspaceLocale; onOpenSource: (target: SourceTarget) => void }) {
  const en = locale === "en";
  function branch(path: string) {
    return <ul className="file-tree">{(reader.tree[path] ?? []).map((item) => {
      const directory = item.node_type === "directory";
      const expanded = reader.expanded.has(item.path);
      return <li key={item.path}>
        <button className={`tree-entry ${reader.sourceTarget?.path === item.path ? "selected" : ""}`}
          title={item.path} aria-expanded={directory ? expanded : undefined}
          onClick={() => directory ? void reader.toggleDirectory(item.path) : onOpenSource({ path: item.path })}>
          {directory ? <>{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}<Folder size={15} /></> : <FileCode2 size={15} />}
          <span>{item.path.split("/").pop()}</span>
        </button>
        {directory && expanded ? branch(item.path) : null}
      </li>;
    })}</ul>;
  }
  return <section className="tree-section" aria-label={en ? "Repository files" : "仓库文件"}>
    <div className="section-heading"><h2>{en ? "Files" : "文件"}</h2>
      <button className="icon-button" title={en ? "Refresh files" : "刷新文件"} aria-label={en ? "Refresh files" : "刷新文件"}
        onClick={() => void reader.loadTree()}><RefreshCw size={16} /></button></div>
    {reader.treeError ? <p role="alert" className="inline-error">{reader.treeError}</p> : null}
    {reader.treeLoading ? <p role="status" className="muted">{en ? "Loading files..." : "正在读取目录…"}</p> : null}
    {branch("")}
    {reader.tree[""]?.length === 0 ? <p className="empty-state">{en ? "No accessible files." : "没有可访问的文件。"}</p> : null}
  </section>;
}

export function RepositoryReader({ reader, locale, indexed }: { reader: Reader; locale: WorkspaceLocale; indexed: boolean }) {
  const en = locale === "en";
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"search" | "find-symbol">("search");
  const source = reader.source;
  const start = source?.start_line ?? 1;
  const end = source?.end_line ?? 0;
  return <section className="reader-panel" aria-label={en ? "Code reading" : "代码阅读"}>
    <form className="search-toolbar" onSubmit={(event) => { event.preventDefault(); void reader.search(query, mode); }}>
      <div className="segmented" aria-label={en ? "Search mode" : "搜索方式"}>
        <button type="button" aria-pressed={mode === "search"} onClick={() => setMode("search")}>{en ? "Text" : "关键词"}</button>
        <button type="button" aria-pressed={mode === "find-symbol"} onClick={() => setMode("find-symbol")}>{en ? "Symbol" : "符号"}</button>
      </div>
      <input aria-label={en ? "Search code" : "搜索代码"} value={query} onChange={(event) => setQuery(event.target.value)}
        placeholder={mode === "search" ? (en ? "Search code" : "搜索代码") : (en ? "Function or class name" : "函数或类名")} />
      <button className="icon-button primary" type="submit" disabled={!indexed || reader.searching || !query.trim()}
        title={en ? "Search" : "搜索"} aria-label={en ? "Search" : "搜索"}><Search size={18} /></button>
    </form>
    {!indexed ? <p className="notice">{en ? "Index the repository to search. Files can be opened directly." : "搜索需要先建立索引，文件可直接打开。"}</p> : null}
    {reader.searchError ? <p className="inline-error" role="alert">{reader.searchError}</p> : null}
    {reader.searching ? <p role="status" className="muted">{en ? "Searching..." : "正在搜索…"}</p> : null}
    {reader.searched ? <section className="search-results" aria-label={en ? "Search results" : "搜索结果"}>
      <div className="section-heading"><h2>{en ? "Results" : "结果"}</h2><span className="muted">{reader.results.length}{reader.truncated ? "+" : ""}</span></div>
      {reader.results.length === 0 ? <p className="empty-state">{en ? "No matches." : "没有匹配结果。"}</p> : null}
      {reader.results.map((item, index) => <button className="search-result" key={`${item.path}:${item.start_line}:${index}`}
        onClick={() => void reader.openSource({ path: item.path, line: item.start_line ?? 1 })}>
        <span className="result-path">{item.path}<span className="muted">:{item.start_line}</span></span>
        <code>{item.content}</code>
      </button>)}
    </section> : null}
    <div className="source-header">
      <span className="source-path">{reader.sourceTarget?.path ?? (en ? "Source" : "源码")}</span>
      {source ? <div className="source-pagination">
        <span className="muted">{start}–{end}</span>
        <button className="icon-button" disabled={start <= 1 || reader.reading} title={en ? "Previous lines" : "上一段"} aria-label={en ? "Previous lines" : "上一段"}
          onClick={() => void reader.openSource({ path: source.path, line: Math.max(1, start - 200) })}><ArrowLeft size={16} /></button>
        <button className="icon-button" disabled={end - start + 1 < 200 || reader.reading} title={en ? "Next lines" : "下一段"} aria-label={en ? "Next lines" : "下一段"}
          onClick={() => void reader.openSource({ path: source.path, line: end + 1 })}><ArrowRight size={16} /></button>
      </div> : null}
    </div>
    {reader.sourceTarget?.fromCitation ? <p className="notice">{en ? "Current workspace file. It may have changed since the answer was generated." : "当前工作区文件，可能与回答生成时的版本不同。"}</p> : null}
    {reader.sourceError ? <div className="inline-error" role="alert">{reader.sourceError}
      <button className="icon-button" title={en ? "Retry reading" : "重新读取"} aria-label={en ? "Retry reading" : "重新读取"}
        onClick={() => reader.sourceTarget && void reader.openSource(reader.sourceTarget)}><RefreshCw size={16} /></button></div> : null}
    {reader.reading ? <p role="status" className="empty-state">{en ? "Reading file..." : "正在读取文件…"}</p> : null}
    {source ? <div className="source-code" tabIndex={0} role="region" aria-label={en ? "File contents" : "文件内容"}>
      <pre>{(source.content ?? "").split("\n").map((line, index) => <span className={`source-line ${start + index <= (reader.sourceTarget?.endLine ?? start) ? "target-line" : ""}`} key={start + index}>
        <span className="line-number" aria-hidden="true">{start + index}</span><code>{line || " "}</code>
      </span>)}</pre>
    </div> : !reader.reading && !reader.sourceError ? <div className="reader-empty"><FileCode2 size={32} /><p>{en ? "No file selected" : "尚未选择文件"}</p></div> : null}
  </section>;
}
