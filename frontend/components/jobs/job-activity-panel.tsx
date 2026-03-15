import { useEffect, useMemo, useState } from "react";

import type { JobRun, RepositoryRecord } from "@/lib/types";
import { getWorkspaceCopy, type WorkspaceLocale } from "@/lib/workspace-i18n";

type JobActivityPanelProps = {
  jobs: JobRun[];
  repositories: RepositoryRecord[];
  locale: WorkspaceLocale;
  retryingJobId: number | null;
  selectedRepoId: number | null;
  onRetry: (jobId: number) => Promise<void> | void;
  onSelectRepository: (repoId: number) => void;
};

type JobFilter = "all" | "current" | "failed";

function formatRelativeTime(locale: WorkspaceLocale, value: string): string {
  const date = new Date(value);
  const deltaSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [unit, secondsPerUnit] of units) {
    if (Math.abs(deltaSeconds) >= secondsPerUnit || unit === "minute") {
      return formatter.format(Math.round(deltaSeconds / secondsPerUnit), unit);
    }
  }

  return formatter.format(deltaSeconds, "second");
}

function getStatusClassName(status: JobRun["status"]): string {
  if (status === "running") return "is-running";
  if (status === "succeeded") return "is-succeeded";
  if (status === "failed") return "is-failed";
  return "is-queued";
}

function formatJobStatus(locale: WorkspaceLocale, status: JobRun["status"]): string {
  if (locale === "zh-CN") {
    if (status === "queued") return "排队中";
    if (status === "running") return "运行中";
    if (status === "succeeded") return "已完成";
    return "失败";
  }
  if (status === "queued") return "Queued";
  if (status === "running") return "Running";
  if (status === "succeeded") return "Succeeded";
  return "Failed";
}

function formatJobType(locale: WorkspaceLocale, jobType: JobRun["job_type"]): string {
  if (locale === "zh-CN") {
    return jobType === "repository_clone" ? "仓库克隆" : "仓库索引";
  }
  return jobType === "repository_clone" ? "Repository clone" : "Repository index";
}

function formatJobStatusDescription(
  locale: WorkspaceLocale,
  status: JobRun["status"],
  jobType: JobRun["job_type"],
): string {
  if (locale === "zh-CN") {
    if (status === "queued") {
      return jobType === "repository_clone"
        ? "任务已加入后台队列，等待开始克隆仓库。"
        : "任务已加入后台队列，等待开始建立索引。";
    }
    if (status === "running") {
      return jobType === "repository_clone"
        ? "后端正在克隆仓库。完成后才能继续索引和问答。"
        : "后端正在扫描文件并写入分片索引记录。";
    }
    if (status === "succeeded") {
      return jobType === "repository_clone"
        ? "克隆已完成。这个仓库已经可以进入下一步索引。"
        : "索引已完成。这个仓库已经可以检索和问答。";
    }
    return "这个任务执行失败，建议先查看详情，再决定是否重试。";
  }

  if (status === "queued") {
    return jobType === "repository_clone"
      ? "Queued in the background and waiting to start cloning."
      : "Queued in the background and waiting to start indexing.";
  }
  if (status === "running") {
    return jobType === "repository_clone"
      ? "The backend is cloning the repository before it can be indexed and queried."
      : "The backend is scanning files and building chunk records for retrieval.";
  }
  if (status === "succeeded") {
    return jobType === "repository_clone"
      ? "Clone finished. The repository is ready for the next indexing step."
      : "Indexing finished. The repository is ready for search and Q&A.";
  }
  return "This job failed and needs attention before you retry it.";
}

export function JobActivityPanel({
  jobs,
  repositories,
  locale,
  retryingJobId,
  selectedRepoId,
  onRetry,
  onSelectRepository,
}: JobActivityPanelProps) {
  const copy = getWorkspaceCopy(locale);
  const openRepositoryLabel = locale === "zh-CN" ? "跳转到仓库" : "Open repository";
  const [filter, setFilter] = useState<JobFilter>("all");
  const [timeTick, setTimeTick] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeTick(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const filteredJobs = useMemo(() => {
    if (filter === "current") {
      if (!selectedRepoId) {
        return [];
      }
      return jobs.filter((job) => job.repo_id === selectedRepoId);
    }
    if (filter === "failed") {
      return jobs.filter((job) => job.status === "failed");
    }
    return jobs;
  }, [filter, jobs, selectedRepoId, timeTick]);

  return (
    <section className="panel-card">
      <div className="repo-header">
        <div>
          <h2 className="panel-title">{copy.jobs.title}</h2>
          <p className="panel-copy">{copy.jobs.description}</p>
        </div>
        <div className="job-filter-row">
          <button
            className={`button-secondary compact-button ${filter === "all" ? "is-active-filter" : ""}`.trim()}
            onClick={() => setFilter("all")}
            type="button"
          >
            {copy.jobs.showAll}
          </button>
          <button
            className={`button-secondary compact-button ${filter === "current" ? "is-active-filter" : ""}`.trim()}
            onClick={() => setFilter("current")}
            type="button"
          >
            {copy.jobs.showCurrentRepo}
          </button>
          <button
            className={`button-secondary compact-button ${filter === "failed" ? "is-active-filter" : ""}`.trim()}
            onClick={() => setFilter("failed")}
            type="button"
          >
            {copy.jobs.showFailed}
          </button>
        </div>
      </div>
      {filteredJobs.length === 0 ? (
        <div className="placeholder-card">
          <div className="placeholder-copy">{copy.jobs.empty}</div>
        </div>
      ) : (
        <div className="job-list">
          {filteredJobs.map((job) => {
            const repository = repositories.find((item) => item.id === job.repo_id);
            return (
              <article className="job-item" key={job.id}>
                <div className="repo-header">
                  <div>
                    <div className="repo-title">{formatJobType(locale, job.job_type)}</div>
                    <div className="repo-meta">
                      {repository?.name ?? `${copy.jobs.repositoryPrefix} #${job.repo_id}`}
                    </div>
                    <div className="job-meta-line">
                      <span>
                        {copy.jobs.createdLabel} {formatRelativeTime(locale, job.created_at)}
                      </span>
                      <span>
                        {copy.jobs.updatedLabel} {formatRelativeTime(locale, job.updated_at)}
                      </span>
                    </div>
                  </div>
                  <span className={`status-pill ${getStatusClassName(job.status)}`.trim()}>
                    {formatJobStatus(locale, job.status)}
                  </span>
                </div>
                <div className="repo-meta">{job.message ?? copy.jobs.noMessage}</div>
                <div className="job-status-copy">{formatJobStatusDescription(locale, job.status, job.job_type)}</div>
                <div className="button-row top-gap">
                  <button
                    className="button-secondary"
                    onClick={() => onSelectRepository(job.repo_id)}
                    type="button"
                  >
                    {openRepositoryLabel}
                  </button>
                  {job.status === "failed" ? (
                    <button
                      className="button-secondary"
                      disabled={retryingJobId === job.id}
                      onClick={() => onRetry(job.id)}
                      type="button"
                    >
                      {retryingJobId === job.id ? copy.jobs.retrying : copy.jobs.retry}
                    </button>
                  ) : null}
                </div>
                {job.status === "failed" ? (
                  <details className="job-details top-gap">
                    <summary className="job-details-summary">{copy.jobs.details}</summary>
                    <pre className="job-details-content">
                      {job.message?.trim() || copy.jobs.detailsEmpty}
                    </pre>
                  </details>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
