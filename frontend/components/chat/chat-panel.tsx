"use client";

import { FormEvent, useEffect, useState } from "react";

import type { ChatAskResponse, RepositoryRecord } from "@/lib/types";

type ChatPanelProps = {
  repositories: RepositoryRecord[];
  isAsking: boolean;
  onAsk: (repoId: number, question: string) => Promise<void> | void;
  response: ChatAskResponse | null;
};

export function ChatPanel({
  repositories,
  isAsking,
  onAsk,
  response,
}: ChatPanelProps) {
  const availableRepositories = repositories.filter(
    (repository) => repository.source_type === "local" && repository.status === "ready",
  );

  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(
    availableRepositories[0]?.id ?? null,
  );
  const [question, setQuestion] = useState(
    "这个仓库现在的索引流程是怎么工作的？关键入口在哪里？",
  );

  useEffect(() => {
    if (availableRepositories.length === 0) {
      setSelectedRepoId(null);
      return;
    }

    setSelectedRepoId((current) => {
      if (current && availableRepositories.some((repository) => repository.id === current)) {
        return current;
      }
      return availableRepositories[0].id;
    });
  }, [availableRepositories]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRepoId) {
      return;
    }
    await onAsk(selectedRepoId, question.trim());
  }

  return (
    <section className="panel-card">
      <h2 className="panel-title">问答主链路</h2>
      <p className="panel-copy">
        这一版已经接入受控工具链。你可以选择一个已经完成索引的本地仓库，让 Agent 先检索再回答，并返回引用与调用摘要。
      </p>

      {availableRepositories.length === 0 ? (
        <div className="placeholder-card">
          <div className="placeholder-copy">
            先登记并索引一个本地仓库，问答能力才会启用。
          </div>
        </div>
      ) : (
        <form className="field-grid" onSubmit={handleSubmit}>
          <label className="field-label">
            选择仓库
            <select
              onChange={(event) => setSelectedRepoId(Number(event.target.value))}
              value={selectedRepoId ?? ""}
            >
              {availableRepositories.map((repository) => (
                <option key={repository.id} value={repository.id}>
                  {repository.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            你的问题
            <textarea
              className="textarea-input"
              onChange={(event) => setQuestion(event.target.value)}
              rows={6}
              value={question}
            />
          </label>

          <div className="button-row">
            <button
              className="button-primary"
              disabled={isAsking || !selectedRepoId || !question.trim()}
              type="submit"
            >
              {isAsking ? "分析中..." : "发起问答"}
            </button>
          </div>
        </form>
      )}

      {response ? (
        <div className="answer-card">
          <div className="answer-label">Agent 回答</div>
          <pre className="answer-body">{response.answer}</pre>
        </div>
      ) : null}
    </section>
  );
}
