import type { ChatAskResponse } from "@/lib/types";
import { getWorkspaceCopy, type WorkspaceLocale } from "@/lib/workspace-i18n";

type CitationPanelProps = {
  locale: WorkspaceLocale;
  response: ChatAskResponse | null;
};

export function CitationPanel({ locale, response }: CitationPanelProps) {
  const copy = getWorkspaceCopy(locale);
  const toolCallsLabel = copy.citations.toolCalls.replace(
    "{count}",
    String(response?.trace_summary.tool_call_count ?? 0),
  );

  return (
    <section className="panel-card">
      <h2 className="panel-title">{copy.citations.title}</h2>
      <p className="panel-copy">{copy.citations.description}</p>

      {!response ? (
        <div className="placeholder-card">
          <div className="placeholder-copy">{copy.citations.empty}</div>
        </div>
      ) : (
        <div className="citation-stack">
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-label">{copy.citations.evidenceCount}</div>
              <div className="summary-value">{response.citations.length}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">{copy.citations.toolSteps}</div>
              <div className="summary-value">{response.trace_summary.tool_call_count}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">{copy.citations.latency}</div>
              <div className="summary-value">{response.trace_summary.latency_ms} ms</div>
            </div>
          </div>

          <div className="trace-card">
            <div className="answer-header">
              <div className="answer-label">{copy.citations.traceSummary}</div>
              <div className="meta-pill-row">
                <span className="meta-pill">{response.trace_summary.agent_name}</span>
                <span className="meta-pill">{response.trace_summary.model}</span>
                <span className="meta-pill">{response.trace_summary.latency_ms} ms</span>
              </div>
            </div>
            <div className="trace-meta">{toolCallsLabel}</div>
            <div className="trace-step-list">
              {response.trace_summary.steps.map((step, index) => (
                <div className="trace-step" key={`${step.tool_name}-${index}`}>
                  <div className="trace-step-title">
                    {step.tool_name} · {step.item_count}
                  </div>
                  <div className="trace-step-copy">{step.args_summary}</div>
                  {step.summary ? <div className="trace-step-copy">{step.summary}</div> : null}
                </div>
              ))}
            </div>
          </div>

          {response.citations.length === 0 ? (
            <div className="placeholder-card">
              <div className="placeholder-copy">{copy.citations.noCitations}</div>
            </div>
          ) : (
            <div className="citation-list">
              {response.citations.map((citation, index) => (
                <article className="citation-card" key={`${citation.path}-${index}`}>
                  <div className="citation-card-header">
                    <div className="citation-index">#{index + 1}</div>
                    <div className="citation-path">
                      {citation.path}
                      {citation.start_line ? `:${citation.start_line}` : ""}
                      {citation.end_line && citation.end_line !== citation.start_line
                        ? `-${citation.end_line}`
                        : ""}
                    </div>
                  </div>
                  <div className="citation-note">{citation.note}</div>
                  {citation.symbol ? (
                    <div className="citation-meta">
                      {copy.citations.symbolPrefix}: {citation.symbol}
                    </div>
                  ) : null}
                  {citation.excerpt ? <pre className="citation-excerpt">{citation.excerpt}</pre> : null}
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
