import type { RepositoryRecord } from "@/lib/types";
import {
  formatRepositorySource,
  formatRepositoryStatus,
  getWorkspaceCopy,
  type WorkspaceLocale,
} from "@/lib/workspace-i18n";

type RepositoryListProps = {
  repositories: RepositoryRecord[];
  isLoading: boolean;
  indexingRepoId: number | null;
  selectedRepoId: number | null;
  locale: WorkspaceLocale;
  onIndex: (repoId: number) => Promise<void> | void;
  onSelect: (repoId: number) => void;
};

export function RepositoryList({
  repositories,
  isLoading,
  indexingRepoId,
  locale,
  selectedRepoId,
  onIndex,
  onSelect,
}: RepositoryListProps) {
  const copy = getWorkspaceCopy(locale);

  return (
    <section className="panel-card">
      <h2 className="panel-title">{copy.repositoryList.title}</h2>
      <p className="panel-copy">{copy.repositoryList.description}</p>
      {repositories.length === 0 ? (
        <div className="placeholder-card">
          <div className="placeholder-copy">
            {isLoading ? copy.repositoryList.emptyLoading : copy.repositoryList.emptyIdle}
          </div>
        </div>
      ) : (
        <div className="repo-list">
          {repositories.map((repository) => (
            <article
              className={`repo-item ${repository.id === selectedRepoId ? "is-selected" : ""}`.trim()}
              key={repository.id}
            >
              <div className="repo-header">
                <div>
                  <div className="repo-title">{repository.name}</div>
                  <div className="repo-meta">{repository.root_path ?? repository.source_url}</div>
                </div>
                <span className="status-pill">
                  {formatRepositoryStatus(locale, repository.status)}
                </span>
              </div>
              <div className="repo-meta">
                {copy.repositoryList.sourceTypePrefix}:{" "}
                {formatRepositorySource(locale, repository.source_type)}
                {repository.default_branch
                  ? ` · ${copy.repositoryList.defaultBranchPrefix}: ${repository.default_branch}`
                  : ""}
              </div>
              <div className="meta-pill-row">
                <span className="meta-pill">{repository.primary_language ?? copy.workspace.unknown}</span>
                <span className="meta-pill">
                  {repository.root_path
                    ? copy.repositoryList.canIndex
                    : copy.repositoryList.waitingWorkspace}
                </span>
              </div>
              <div className="button-row">
                <button className="button-secondary" onClick={() => onSelect(repository.id)} type="button">
                  {repository.id === selectedRepoId
                    ? copy.repositoryList.currentRepository
                    : copy.repositoryList.selectRepository}
                </button>
                <button
                  className="button-secondary"
                  disabled={!repository.root_path || indexingRepoId === repository.id}
                  onClick={() => onIndex(repository.id)}
                  type="button"
                >
                  {!repository.root_path
                    ? copy.repositoryList.missingWorkspace
                    : indexingRepoId === repository.id
                      ? copy.repositoryList.indexing
                      : copy.repositoryList.triggerIndex}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
