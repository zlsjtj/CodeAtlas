import { FileCode2 } from "lucide-react";
import type { ChatAskResponse } from "@/lib/types";
import type { SourceTarget } from "@/lib/hooks/use-repository-reader";
import type { WorkspaceLocale } from "@/lib/workspace-i18n";

export function CitationPanel({ locale, response, onOpenSource }: {
  locale: WorkspaceLocale;
  response: ChatAskResponse;
  onOpenSource: (target: SourceTarget) => void;
}) {
  const en = locale === "en";
  return <section className="citations-panel">
    <div className="section-heading"><h2>{en ? "References" : "引用"}</h2></div>
    {response.citations.length === 0 ? <p className="notice">{en ? "This answer has no references." : "这次回答没有提供引用。"}</p> : null}
    {response.citations.map((citation, index) => <article className="citation-item" key={`${citation.path}:${index}`}>
      <button className="citation-link" onClick={() => onOpenSource({ path: citation.path, line: citation.start_line ?? 1, endLine: citation.end_line ?? undefined, fromCitation: true })}>
        <FileCode2 size={16} /><span>{citation.path}{citation.start_line ? `:${citation.start_line}` : ""}</span>
      </button>
      {citation.note ? <p>{citation.note}</p> : null}
      {citation.excerpt ? <details><summary>{en ? "Excerpt from the answer" : "回答中的摘录"}</summary><pre>{citation.excerpt}</pre></details> : null}
    </article>)}
    <details className="tool-trace"><summary>{en ? "Tool calls" : "工具调用"} · {response.trace_summary.tool_call_count}</summary>
      <p className="muted">{response.trace_summary.model} · {response.trace_summary.latency_ms} ms</p>
      <ol>{response.trace_summary.steps.map((step, index) => <li key={index}><code>{step.tool_name}</code><p>{step.args_summary}</p><p className="muted">{step.summary}</p></li>)}</ol>
    </details>
  </section>;
}
