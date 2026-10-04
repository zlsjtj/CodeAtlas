"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, BookmarkPlus, Download, Pencil, RefreshCw, Save, Trash2, Undo2, X } from "lucide-react";
import type { ToolResultItem } from "@/lib/types";
import type { WorkspaceLocale } from "@/lib/workspace-i18n";
import type { SourceTarget } from "@/lib/hooks/use-repository-reader";
import type { RouteError, useReadingRoute } from "@/lib/hooks/use-reading-route";
import { exportReadingRoute, makeReadingStop, MAX_NOTE_LENGTH, MAX_ROUTE_ENTRIES, MAX_STOP_TITLE_LENGTH, provenanceLabel } from "@/lib/reading-route";

type Route = ReturnType<typeof useReadingRoute>;

function errorMessage(error: RouteError, en: boolean) {
  if (!error) return null;
  return {
    load: en ? "The saved route could not be read. Existing data has not been overwritten." : "无法读取已保存的路线，原有数据未被覆盖。",
    save: en ? "The browser could not save this change. The previously saved route is unchanged." : "浏览器未能保存这次修改，原有路线未变。",
    conflict: en ? "Another window changed this route. Reload it before saving." : "其他窗口已修改这条路线，请重新加载后再保存。",
    duplicate: en ? "This file version and line range are already in the route." : "这个文件版本和行范围已在路线中。",
    limit: en ? `A route can contain up to ${MAX_ROUTE_ENTRIES} stops.` : `一条路线最多保存 ${MAX_ROUTE_ENTRIES} 个位置。`,
  }[error];
}

export function SaveReadingStop({ source, route, locale, onClose, onSaved }: {
  source: ToolResultItem; route: Route; locale: WorkspaceLocale; onClose: () => void; onSaved: () => void;
}) {
  const en = locale === "en";
  const dialog = useRef<HTMLDialogElement>(null);
  const [start, setStart] = useState(String(source.start_line ?? 1));
  const [end, setEnd] = useState(String(source.start_line ?? 1));
  const [note, setNote] = useState("");
  const [title, setTitle] = useState("");
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); if (opener?.isConnected) opener.focus(); };
  }, []);
  const error = errorMessage(route.error, en);
  return <dialog ref={dialog} className="import-dialog reading-stop-dialog" aria-labelledby="save-reading-stop-title" onCancel={onClose}>
    <button className="icon-button dialog-close" title={en ? "Cancel" : "取消"} aria-label={en ? "Cancel" : "取消"} onClick={onClose}><X size={18} /></button>
    <h2 className="panel-title" id="save-reading-stop-title">{en ? "Save reading stop" : "保存阅读位置"}</h2>
    <p className="route-path">{source.path}</p>
    <p className="muted">{source.provenance ? provenanceLabel(source.provenance, locale) : ""}{source.provenance?.revision ? ` · ${source.provenance.revision.slice(0, 10)}` : ""}</p>
    <form className="field-grid" onSubmit={event => {
      event.preventDefault();
      setInvalid(false);
      try {
        if (route.add(makeReadingStop(source, Number(start), Number(end), note, title))) { onSaved(); onClose(); }
      } catch { setInvalid(true); }
    }}>
      <div className="route-line-range">
        <label className="field-label">{en ? "Start line" : "起始行"}<input type="number" min={source.start_line ?? 1} max={source.end_line ?? 1} step={1} required value={start}
          onChange={event => { setStart(event.target.value); if (Number(event.target.value) > Number(end)) setEnd(event.target.value); }} /></label>
        <label className="field-label">{en ? "End line" : "结束行"}<input type="number" min={Number(start) || 1} max={source.end_line ?? 1} step={1} required value={end} onChange={event => setEnd(event.target.value)} /></label>
      </div>
      <label className="field-label">{en ? "Stop title (optional)" : "位置标题（可选）"}<input maxLength={MAX_STOP_TITLE_LENGTH} value={title} onChange={event => setTitle(event.target.value)} /></label>
      <label className="field-label">{en ? "Note" : "笔记"}<textarea rows={4} maxLength={MAX_NOTE_LENGTH} value={note} onChange={event => setNote(event.target.value)} /></label>
      {invalid ? <p className="inline-error" role="alert">{en ? "Select a valid range within the loaded source." : "请选择当前已读取源码内的有效行范围。"}</p> : null}
      {error ? <p className="inline-error" role="alert">{error}</p> : null}
      <div className="button-row"><button className="button-primary" type="submit" disabled={!route.loaded}><BookmarkPlus size={16} />{en ? "Save stop" : "保存位置"}</button>
        <button className="button-secondary" type="button" onClick={onClose}>{en ? "Cancel" : "取消"}</button></div>
    </form>
  </dialog>;
}

export function ReadingRoutePanel({ route, repositoryName, locale, onOpenSource }: {
  route: Route; repositoryName: string; locale: WorkspaceLocale; onOpenSource: (target: SourceTarget) => void;
}) {
  const en = locale === "en";
  const [title, setTitle] = useState(route.route.title);
  const [editing, setEditing] = useState<string | null>(null);
  const [stopTitle, setStopTitle] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => { setTitle(route.route.title); }, [route.route.title]);
  const error = errorMessage(route.error, en);
  function download() {
    const text = exportReadingRoute(route.route, repositoryName, locale);
    const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${repositoryName.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60) || "codeatlas"}-reading-route.md`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="reading-route" aria-label={en ? "Reading route" : "阅读路线"}>
    <div className="section-heading route-heading"><h2>{en ? "Reading route" : "阅读路线"}</h2>
      <button className="button-secondary" disabled={!route.loaded || !route.route.entries.length} onClick={download}><Download size={16} />{en ? "Export Markdown" : "导出 Markdown"}</button></div>
    <p className="muted" role="status">{route.loaded ? (en ? `${route.route.entries.length} ${route.route.entries.length === 1 ? "stop" : "stops"} · This browser` : `${route.route.entries.length} 个位置 · 当前浏览器`) : (en ? "Loading..." : "正在加载…")}</p>
    {error ? <div className="inline-error" role="alert">{error}
      {route.error === "load" || route.error === "conflict" ? <button className="icon-button" aria-label={en ? "Reload route" : "重新加载路线"} title={en ? "Reload route" : "重新加载路线"} onClick={route.reload}><RefreshCw size={16} /></button> : null}</div> : null}
    <form className="route-title-form" onSubmit={event => { event.preventDefault(); route.rename(title); }}>
      <label className="field-label">{en ? "Route title" : "路线标题"}<input required maxLength={120} value={title} onChange={event => setTitle(event.target.value)} /></label>
      <button className="icon-button" disabled={!route.loaded || !title.trim() || title.trim() === route.route.title} aria-label={en ? "Save title" : "保存标题"} title={en ? "Save title" : "保存标题"}><Save size={17} /></button>
    </form>
    {route.removed ? <div className="route-undo" role="status"><span>{en ? "Stop removed" : "位置已移除"}</span><button className="icon-button" aria-label={en ? "Undo removal" : "撤销移除"} title={en ? "Undo removal" : "撤销移除"} onClick={route.undoRemove}><Undo2 size={16} /></button></div> : null}
    {route.loaded && !route.route.entries.length ? <p className="empty-state">{en ? "No saved stops." : "尚未保存阅读位置。"}</p> : null}
    <ol className="reading-route-list">{route.route.entries.map((stop, index) => <li key={stop.id}>
      {stop.title ? <h3 className="route-stop-title">{stop.title}</h3> : null}
      <div className="route-stop-header"><button className="citation-link route-source-link" title={en ? "Open current workspace source" : "打开当前工作区源码"}
        onClick={() => onOpenSource({ path: stop.path, line: stop.startLine, endLine: stop.endLine, savedHash: stop.provenance.content_sha256 })}>
        {stop.path}:{stop.startLine}–{stop.endLine}</button>
        <div className="route-stop-actions">
          <button className="icon-button" title={en ? "Move up" : "上移"} aria-label={en ? "Move up" : "上移"} disabled={index === 0} onClick={() => route.move(stop.id, -1)}><ArrowUp size={16} /></button>
          <button className="icon-button" title={en ? "Move down" : "下移"} aria-label={en ? "Move down" : "下移"} disabled={index === route.route.entries.length - 1} onClick={() => route.move(stop.id, 1)}><ArrowDown size={16} /></button>
          <button className="icon-button" title={en ? "Edit note" : "编辑笔记"} aria-label={en ? "Edit note" : "编辑笔记"} onClick={() => { setEditing(stop.id); setNote(stop.note); setStopTitle(stop.title ?? ""); }}><Pencil size={16} /></button>
          <button className="icon-button" title={en ? "Remove stop" : "移除位置"} aria-label={en ? "Remove stop" : "移除位置"} onClick={() => route.remove(stop.id)}><Trash2 size={16} /></button>
        </div></div>
      <p className="muted route-provenance">{provenanceLabel(stop.provenance, locale)}{stop.provenance.revision ? <code title={stop.provenance.revision}> · {stop.provenance.revision.slice(0, 10)}</code> : null}</p>
      {editing === stop.id ? <form className="route-note-form" onSubmit={event => { event.preventDefault(); if (route.editNote(stop.id, note, stopTitle)) setEditing(null); }}>
        <label className="field-label">{en ? "Stop title (optional)" : "位置标题（可选）"}<input maxLength={MAX_STOP_TITLE_LENGTH} value={stopTitle} onChange={event => setStopTitle(event.target.value)} /></label>
        <label className="field-label">{en ? "Note" : "笔记"}<textarea autoFocus rows={4} maxLength={MAX_NOTE_LENGTH} value={note} onChange={event => setNote(event.target.value)} /></label>
        <div className="button-row"><button className="button-primary" type="submit"><Save size={16} />{en ? "Save note" : "保存笔记"}</button>
          <button className="button-secondary" type="button" onClick={() => setEditing(null)}>{en ? "Cancel" : "取消"}</button></div>
      </form> : stop.note ? <p className="route-note">{stop.note}</p> : null}
      <details className="route-excerpt"><summary>{en ? "Saved excerpt" : "保存时摘录"}</summary><pre><code>{stop.excerpt}</code></pre></details>
    </li>)}</ol>
  </section>;
}
