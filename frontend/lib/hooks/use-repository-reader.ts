"use client";

import { useEffect, useRef, useState } from "react";
import { repositoryTool } from "@/lib/api";
import type { RepositoryRecord, ToolResultItem } from "@/lib/types";
import type { WorkspaceLocale } from "@/lib/workspace-i18n";

export type SourceTarget = { path: string; line?: number; endLine?: number; fromCitation?: boolean; resultKey?: string; searchQuery?: string; savedHash?: string };

export function useRepositoryReader(repository: RepositoryRecord, locale: WorkspaceLocale) {
  const [tree, setTree] = useState<Record<string, ToolResultItem[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [treeError, setTreeError] = useState("");
  const [treeLoading, setTreeLoading] = useState(false);
  const [results, setResults] = useState<ToolResultItem[]>([]);
  const [resultQuery, setResultQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);
  const [source, setSource] = useState<ToolResultItem | null>(null);
  const [sourceTarget, setSourceTarget] = useState<SourceTarget | null>(null);
  const [sourceError, setSourceError] = useState("");
  const [reading, setReading] = useState(false);
  const requests = useRef<Record<string, AbortController>>({});

  function begin(name: string) {
    requests.current[name]?.abort();
    const controller = new AbortController();
    requests.current[name] = controller;
    return controller.signal;
  }
  useEffect(() => () => {
    Object.values(requests.current).forEach((controller) => controller.abort());
  }, []);

  async function loadTree(path = "") {
    const signal = begin(`tree:${path}`);
    setTreeError("");
    setTreeLoading(true);
    try {
      const response = await repositoryTool("list-tree", { repo_id: repository.id, path, depth: 1 }, locale, signal);
      if (!signal.aborted) setTree((current) => ({ ...current, [path]: response.items }));
    } catch (error) {
      if (!signal.aborted) setTreeError(String(error instanceof Error ? error.message : error));
    } finally {
      if (!signal.aborted) setTreeLoading(false);
    }
  }

  useEffect(() => {
    Object.entries(requests.current).forEach(([name, controller]) => { if (name.startsWith("tree:")) controller.abort(); });
    if (repository.root_path) void loadTree();
    // Re-indexing can add or exclude paths; discard previously expanded branches.
    setTree({});
    setExpanded(new Set());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repository.id, repository.status, repository.updated_at, locale]);

  async function toggleDirectory(path: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
    if (!tree[path]) await loadTree(path);
  }

  async function search(query: string, mode: "search" | "find-symbol") {
    if (!query.trim()) return;
    const signal = begin("search");
    setSearching(true);
    setSearchError("");
    setSearched(false);
    setResults([]);
    setResultQuery("");
    setSourceTarget((current) => current ? { ...current, resultKey: undefined, searchQuery: undefined } : null);
    try {
      const response = await repositoryTool(mode, {
        repo_id: repository.id, [mode === "search" ? "query" : "name"]: query.trim(), limit: 30,
      }, locale, signal);
      if (signal.aborted) return;
      setResults(response.items);
      setResultQuery(query.trim());
      setTruncated(response.truncated);
      setSearched(true);
    } catch (error) {
      if (!signal.aborted) setSearchError(String(error instanceof Error ? error.message : error));
    } finally {
      if (!signal.aborted) setSearching(false);
    }
  }

  async function openSource(target: SourceTarget) {
    const signal = begin("source");
    setSourceTarget(target);
    setReading(true);
    setSource(null);
    setSourceError("");
    const start = Math.max(1, target.line ?? 1);
    try {
      const response = await repositoryTool("read", {
        repo_id: repository.id, path: target.path, start_line: start, end_line: start + 199, include_provenance: true,
      }, locale, signal);
      if (!signal.aborted) setSource(response.items[0] ?? null);
    } catch (error) {
      if (!signal.aborted) setSourceError(String(error instanceof Error ? error.message : error));
    } finally {
      if (!signal.aborted) setReading(false);
    }
  }

  return { tree, expanded, treeError, treeLoading, loadTree, toggleDirectory, results, resultQuery, searched,
    truncated, searchError, searching, search, source, sourceTarget, sourceError, reading, openSource };
}
