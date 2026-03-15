"use client";

import type {
  CheckProfile,
  CheckRecommendationResponse,
  CheckRunResponse,
  PatchApplyResponse,
  RepositoryRecord,
} from "@/lib/types";
import {
  formatCheckCategory,
  formatCheckStatus,
  formatRecommendationStrategy,
  getWorkspaceCopy,
  type WorkspaceLocale,
} from "@/lib/workspace-i18n";

type ChecksPanelProps = {
  selectedRepository: RepositoryRecord | null;
  profiles: CheckProfile[];
  isLoadingProfiles: boolean;
  isLoadingRecommendation: boolean;
  isRunningChecks: boolean;
  locale: WorkspaceLocale;
  recommendation: CheckRecommendationResponse | null;
  response: CheckRunResponse | null;
  patchApplyResponse: PatchApplyResponse | null;
  onRunChecks: (profileIds?: string[]) => Promise<void> | void;
};

export function ChecksPanel({
  selectedRepository,
  profiles,
  isLoadingProfiles,
  isLoadingRecommendation,
  isRunningChecks,
  locale,
  recommendation,
  response,
  patchApplyResponse,
  onRunChecks,
}: ChecksPanelProps) {
  const copy = getWorkspaceCopy(locale);

  return (
    <section className="panel-card">
      <h2 className="panel-title">{copy.checks.title}</h2>
      <p className="panel-copy">{copy.checks.description}</p>

      {!selectedRepository ? (
        <div className="placeholder-card">
          <div className="placeholder-copy">{copy.checks.selectRepository}</div>
        </div>
      ) : isLoadingProfiles ? (
        <div className="placeholder-card">
          <div className="placeholder-copy">{copy.checks.loadingProfiles}</div>
        </div>
      ) : profiles.length === 0 ? (
        <div className="placeholder-card">
          <div className="placeholder-copy">{copy.checks.emptyProfiles}</div>
        </div>
      ) : (
        <div className="patch-stack">
          {patchApplyResponse?.status === "applied" ? (
            <div className="success-banner">{copy.checks.patchApplied}</div>
          ) : null}

          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-label">{copy.checks.availableChecks}</div>
              <div className="summary-value">{profiles.length}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">{copy.checks.currentRepository}</div>
              <div className="summary-value">{selectedRepository.name}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">{copy.checks.latestResult}</div>
              <div className="summary-value">
                {response ? formatCheckStatus(locale, response.status) : copy.checks.notRun}
              </div>
            </div>
          </div>

          <div className="check-profile-list">
            {profiles.map((profile) => (
              <article className="check-profile-card" key={profile.id}>
                <div className="answer-header">
                  <div className="answer-label">{profile.name}</div>
                  <div className="meta-pill-row">
                    <span className="meta-pill">{formatCheckCategory(locale, profile.category)}</span>
                    <span className="meta-pill">{profile.working_dir}</span>
                  </div>
                </div>
                <div className="citation-meta">{profile.command_preview}</div>
              </article>
            ))}
          </div>

          {isLoadingRecommendation ? (
            <div className="placeholder-card">
              <div className="placeholder-copy">{copy.checks.loadingRecommendation}</div>
            </div>
          ) : recommendation ? (
            <div className="recommendation-card">
              <div className="answer-header">
                <div className="answer-label">{copy.checks.recommendationTitle}</div>
                <div className="meta-pill-row">
                  <span className="meta-pill">
                    {formatRecommendationStrategy(locale, recommendation.strategy)}
                  </span>
                  <span className="meta-pill">
                    {recommendation.items.length} {copy.checks.recommendationCount}
                  </span>
                </div>
              </div>
              <div className="patch-copy">{recommendation.summary}</div>
              <div className="check-profile-list top-gap">
                {recommendation.items.map((item) => (
                  <article className="check-profile-card" key={item.id}>
                    <div className="answer-header">
                      <div className="answer-label">{item.name}</div>
                      <div className="meta-pill-row">
                        <span className="meta-pill">{formatCheckCategory(locale, item.category)}</span>
                        <span className="meta-pill">
                          {locale === "zh-CN" ? `得分 ${item.score}` : `Score ${item.score}`}
                        </span>
                      </div>
                    </div>
                    <div className="citation-meta">{item.reason}</div>
                  </article>
                ))}
              </div>
              <div className="button-row patch-action-row top-gap">
                <button
                  className="button-secondary"
                  disabled={isRunningChecks || recommendation.items.length === 0}
                  onClick={() => onRunChecks(recommendation.items.map((item) => item.id))}
                  type="button"
                >
                  {isRunningChecks ? copy.checks.running : copy.checks.runRecommended}
                </button>
              </div>
            </div>
          ) : null}

          <div className="button-row patch-action-row">
            <button className="button-primary" disabled={isRunningChecks} onClick={() => onRunChecks()} type="button">
              {isRunningChecks ? copy.checks.running : copy.checks.runDefault}
            </button>
            <div className="field-help">{copy.checks.runHelp}</div>
          </div>
        </div>
      )}

      {response ? (
        <div className="patch-stack top-gap">
          <div className="answer-card">
            <div className="answer-header">
              <div className="answer-label">{copy.checks.summaryTitle}</div>
              <div className="meta-pill-row">
                <span className="meta-pill">{formatCheckStatus(locale, response.status)}</span>
                <span className="meta-pill">
                  {response.results.length} {copy.checks.resultCount}
                </span>
              </div>
            </div>
            <div className="patch-copy">{response.summary}</div>
          </div>

          <div className="check-result-list">
            {response.results.map((result) => (
              <article className="diff-card" key={result.id}>
                <div className="answer-header">
                  <div className="answer-label">{result.name}</div>
                  <div className="meta-pill-row">
                    <span className="meta-pill">{formatCheckStatus(locale, result.status)}</span>
                    <span className="meta-pill">{result.duration_ms} ms</span>
                    <span className="meta-pill">{result.exit_code ?? "-"}</span>
                  </div>
                </div>
                <div className="citation-meta">{result.command_preview}</div>
                {result.stdout ? <pre className="diff-output diff-output-stdout">{result.stdout}</pre> : null}
                {result.stderr ? <pre className="diff-output diff-output-stderr">{result.stderr}</pre> : null}
                {result.truncated ? <div className="field-help">{copy.checks.truncated}</div> : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
