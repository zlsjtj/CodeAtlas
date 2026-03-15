"use client";

import { useState } from "react";

import { askRepositoryQuestion } from "@/lib/api";
import type { ChatAskResponse, RepositoryRecord, WorkspaceChatEntry } from "@/lib/types";
import type { WorkspaceLocale } from "@/lib/workspace-i18n";
import { getWorkspaceCopy } from "@/lib/workspace-i18n";

import type { WorkspaceFeedbackHandlers } from "./workspace-shared";
import { toErrorMessage } from "./workspace-shared";

type UseChatWorkspaceOptions = WorkspaceFeedbackHandlers & {
  locale: WorkspaceLocale;
  repositories: RepositoryRecord[];
  selectedRepoId: number | null;
  setSelectedRepoId: (repoId: number | null) => void;
};

export function useChatWorkspace({
  locale,
  repositories,
  selectedRepoId,
  setSelectedRepoId,
  setError,
  setStatusMessage,
}: UseChatWorkspaceOptions) {
  const copy = getWorkspaceCopy(locale);
  const [chatResponse, setChatResponse] = useState<ChatAskResponse | null>(null);
  const [chatHistory, setChatHistory] = useState<WorkspaceChatEntry[]>([]);
  const [activeChatRepoId, setActiveChatRepoId] = useState<number | null>(null);
  const [isAsking, setIsAsking] = useState(false);

  async function handleAsk(repoId: number, question: string) {
    setIsAsking(true);
    setError(null);
    setStatusMessage(null);

    try {
      const response = await askRepositoryQuestion({
        repo_id: repoId,
        question,
        response_language: locale,
      });
      const repository = repositories.find((item) => item.id === repoId);
      setChatResponse(response);
      setActiveChatRepoId(repoId);
      setSelectedRepoId(repoId);
      setChatHistory((current) =>
        [
          {
            asked_at: new Date().toISOString(),
            question,
            repository_id: repoId,
            repository_language: repository?.primary_language ?? null,
            repository_name:
              repository?.name ?? (locale === "zh-CN" ? `仓库 #${repoId}` : `Repository #${repoId}`),
            response,
            session_id: response.session_id,
          },
          ...current.filter((entry) => entry.session_id !== response.session_id),
        ].slice(0, 8),
      );
      setStatusMessage(copy.feedback.answerReady);
    } catch (askError) {
      setError(toErrorMessage(askError, copy.feedback.askRepository));
    } finally {
      setIsAsking(false);
    }
  }

  function handleSelectHistory(entry: WorkspaceChatEntry) {
    setSelectedRepoId(entry.repository_id);
    setActiveChatRepoId(entry.repository_id);
    setChatResponse(entry.response);
    setStatusMessage(copy.feedback.switchHistory(entry.repository_name));
  }

  const citedSessionCount = chatHistory.filter((entry) => entry.response.citations.length > 0).length;
  const suggestedPatchPath =
    activeChatRepoId === selectedRepoId ? chatResponse?.citations[0]?.path ?? null : null;

  return {
    chatResponse,
    chatHistory,
    isAsking,
    citedSessionCount,
    suggestedPatchPath,
    handleAsk,
    handleSelectHistory,
  };
}
