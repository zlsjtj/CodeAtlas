"use client";

import type { WorkspaceChatEntry } from "@/lib/types";
import { getWorkspaceCopy, type WorkspaceLocale } from "@/lib/workspace-i18n";

type ChatHistoryPanelProps = {
  entries: WorkspaceChatEntry[];
  activeSessionId: string | null;
  locale: WorkspaceLocale;
  onSelectSession: (entry: WorkspaceChatEntry) => void;
};

export function ChatHistoryPanel({
  entries,
  activeSessionId,
  locale,
  onSelectSession,
}: ChatHistoryPanelProps) {
  const copy = getWorkspaceCopy(locale);
  const timeFormatter = new Intl.DateTimeFormat(locale === "zh-CN" ? "zh-CN" : "en-US", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "numeric",
  });

  return (
    <section className="panel-card">
      <h2 className="panel-title">{copy.chatHistory.title}</h2>
      <p className="panel-copy">{copy.chatHistory.description}</p>

      {entries.length === 0 ? (
        <div className="placeholder-card">
          <div className="placeholder-copy">{copy.chatHistory.empty}</div>
        </div>
      ) : (
        <div className="session-list">
          {entries.map((entry) => (
            <button
              className={`session-item ${entry.session_id === activeSessionId ? "is-active" : ""}`.trim()}
              key={entry.session_id}
              onClick={() => onSelectSession(entry)}
              type="button"
            >
              <div className="session-question">{entry.question}</div>
              <div className="session-meta">
                {entry.repository_name}
                {entry.repository_language ? ` · ${entry.repository_language}` : ""}
              </div>
              <div className="session-meta">
                {timeFormatter.format(new Date(entry.asked_at))} · {entry.response.citations.length}{" "}
                {copy.chatHistory.citationCount} · {entry.response.trace_summary.tool_call_count}{" "}
                {copy.chatHistory.toolCount}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
