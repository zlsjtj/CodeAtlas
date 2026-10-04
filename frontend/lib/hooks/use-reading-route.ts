"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RepositoryRecord } from "@/lib/types";
import { MAX_ROUTE_ENTRIES, parseReadingRoute, routeStorageKey, type ReadingRoute, type ReadingStop } from "@/lib/reading-route";

export type RouteError = "load" | "save" | "conflict" | "duplicate" | "limit" | null;

export function useReadingRoute(repository: RepositoryRecord) {
  const key = routeStorageKey(repository);
  const empty = useCallback((): ReadingRoute => ({ version: 1, title: repository.name.slice(0, 120) || "Reading route", entries: [] }), [repository.name]);
  const [route, setRoute] = useState<ReadingRoute>(empty);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<RouteError>(null);
  const [removed, setRemoved] = useState<{ stop: ReadingStop; index: number } | null>(null);
  const raw = useRef<string | null>(null);
  const blocked = useRef(true);

  const reload = useCallback(() => {
    try {
      const stored = localStorage.getItem(key);
      const parsed = stored ? parseReadingRoute(stored) : empty();
      raw.current = stored;
      setRoute(parsed);
      setError(null);
      blocked.current = false;
      setRemoved(null);
    } catch {
      blocked.current = true;
      setError("load");
    }
    setLoaded(true);
  }, [key, empty]);

  useEffect(() => {
    reload();
    const changed = (event: StorageEvent) => {
      if ((event.key === key || event.key === null) && event.storageArea === localStorage) {
        blocked.current = true;
        setError("conflict");
      }
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [key, reload]);

  function persist(next: ReadingRoute): boolean {
    if (!loaded || blocked.current) return false;
    try {
      if (localStorage.getItem(key) !== raw.current) {
        blocked.current = true;
        setError("conflict");
        return false;
      }
      const value = JSON.stringify(next);
      parseReadingRoute(value);
      localStorage.setItem(key, value);
      raw.current = value;
      setRoute(next);
      setError(null);
      return true;
    } catch {
      setError("save");
      return false;
    }
  }

  function add(stop: ReadingStop) {
    if (route.entries.length >= MAX_ROUTE_ENTRIES) { setError("limit"); return false; }
    if (route.entries.some(item => item.path === stop.path && item.startLine === stop.startLine && item.endLine === stop.endLine
      && item.provenance.content_sha256 === stop.provenance.content_sha256)) { setError("duplicate"); return false; }
    return persist({ ...route, entries: [...route.entries, stop] });
  }
  function remove(id: string) {
    const index = route.entries.findIndex(stop => stop.id === id);
    if (index < 0) return;
    if (persist({ ...route, entries: route.entries.filter(stop => stop.id !== id) })) setRemoved({ stop: route.entries[index], index });
  }
  function undoRemove() {
    if (!removed || route.entries.length >= MAX_ROUTE_ENTRIES || route.entries.some(stop => stop.id === removed.stop.id)) return;
    if (route.entries.some(stop => stop.path === removed.stop.path && stop.startLine === removed.stop.startLine
      && stop.endLine === removed.stop.endLine && stop.provenance.content_sha256 === removed.stop.provenance.content_sha256)) {
      setError("duplicate");
      return;
    }
    const entries = [...route.entries];
    entries.splice(removed.index, 0, removed.stop);
    if (persist({ ...route, entries })) setRemoved(null);
  }
  function move(id: string, delta: number) {
    const entries = [...route.entries];
    const from = entries.findIndex(stop => stop.id === id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= entries.length) return;
    [entries[from], entries[to]] = [entries[to], entries[from]];
    persist({ ...route, entries });
  }
  return { route, loaded, error, reload, add, remove, removed, undoRemove, move,
    clearTransientError: () => { if (error === "duplicate" || error === "limit") setError(null); },
    rename: (title: string) => persist({ ...route, title: title.trim() }),
    editNote: (id: string, note: string, title: string) => persist({ ...route, entries: route.entries.map(stop => stop.id === id ? { ...stop, note, title: title.trim() } : stop) }),
  };
}
