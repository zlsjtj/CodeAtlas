"use client";

import { startTransition, useEffect, useState } from "react";

import {
  createRepository,
  fetchHealth,
  fetchMeta,
  indexRepository,
  listRepositories,
} from "@/lib/api";
import type {
  HealthResponse,
  MetaResponse,
  RepositoryCreatePayload,
  RepositoryRecord,
} from "@/lib/types";
import type { WorkspaceLocale } from "@/lib/workspace-i18n";
import { getWorkspaceCopy } from "@/lib/workspace-i18n";

import type { WorkspaceFeedbackHandlers } from "./workspace-shared";
import { toErrorMessage } from "./workspace-shared";

type UseWorkspaceRepositoriesOptions = WorkspaceFeedbackHandlers & {
  locale: WorkspaceLocale;
};

export function useWorkspaceRepositories({
  locale,
  setError,
  setStatusMessage,
}: UseWorkspaceRepositoriesOptions) {
  const copy = getWorkspaceCopy(locale);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [repositories, setRepositories] = useState<RepositoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [indexingRepoId, setIndexingRepoId] = useState<number | null>(null);
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function loadWorkspace() {
      try {
        setIsLoading(true);
        setError(null);
        const [healthResponse, metaResponse, repositoriesResponse] = await Promise.all([
          fetchHealth(),
          fetchMeta(),
          listRepositories(),
        ]);

        if (!active) {
          return;
        }

        startTransition(() => {
          setHealth(healthResponse);
          setMeta(metaResponse);
          setRepositories(repositoriesResponse.items);
        });
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(toErrorMessage(loadError, copy.feedback.loadWorkspace));
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadWorkspace();

    return () => {
      active = false;
    };
  }, [copy.feedback.loadWorkspace, setError]);

  useEffect(() => {
    if (repositories.length === 0) {
      setSelectedRepoId(null);
      return;
    }

    setSelectedRepoId((current) => {
      if (current && repositories.some((repository) => repository.id === current)) {
        return current;
      }

      const preferredRepository = repositories.find(
        (repository) => Boolean(repository.root_path) && repository.status === "ready",
      );
      return preferredRepository?.id ?? repositories[0]?.id ?? null;
    });
  }, [repositories]);

  async function refreshRepositories() {
    const repositoriesResponse = await listRepositories();
    startTransition(() => {
      setRepositories(repositoriesResponse.items);
    });
  }

  async function handleRepositorySubmit(payload: RepositoryCreatePayload) {
    setIsSubmitting(true);
    setError(null);
    setStatusMessage(null);

    try {
      const created = await createRepository(payload, locale);
      startTransition(() => {
        setRepositories((current) => [created, ...current]);
      });
      setSelectedRepoId(created.id);
      setStatusMessage(copy.feedback.repositoryRegistered(created.name));
    } catch (submitError) {
      setError(toErrorMessage(submitError, copy.feedback.registerRepository));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleIndexRepository(repoId: number) {
    setIndexingRepoId(repoId);
    setError(null);
    setStatusMessage(null);

    try {
      const summary = await indexRepository(repoId, locale);
      await refreshRepositories();
      setStatusMessage(copy.feedback.indexCompleted(summary.file_count, summary.chunk_count));
    } catch (indexError) {
      setError(toErrorMessage(indexError, copy.feedback.indexRepository));
    } finally {
      setIndexingRepoId(null);
    }
  }

  const selectedRepository =
    repositories.find((repository) => repository.id === selectedRepoId) ?? null;
  const readyRepositories = repositories.filter(
    (repository) => Boolean(repository.root_path) && repository.status === "ready",
  );

  return {
    health,
    meta,
    repositories,
    readyRepositories,
    selectedRepoId,
    selectedRepository,
    isLoading,
    isSubmitting,
    indexingRepoId,
    setSelectedRepoId,
    handleRepositorySubmit,
    handleIndexRepository,
    refreshRepositories,
  };
}
