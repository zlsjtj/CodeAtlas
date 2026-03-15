"use client";

import { startTransition, useEffect, useState } from "react";

import {
  applyPatchBatchAndRunChecks,
  applyPatchDraftBatch,
  applyPatchAndRunChecks,
  applyPatchDraft,
  createPatchDraftBatch,
  createPatchDraft,
  fetchCheckProfiles,
  fetchRecommendedChecks,
  runRepositoryChecks,
} from "@/lib/api";
import type {
  CheckProfile,
  CheckRecommendationResponse,
  CheckRunResponse,
  PatchApplyAndCheckResponse,
  PatchApplyResponse,
  PatchBatchApplyAndCheckResponse,
  PatchBatchApplyResponse,
  PatchBatchDraftResponse,
  PatchDraftFile,
  PatchDraftResponse,
  RepositoryRecord,
} from "@/lib/types";
import type { WorkspaceLocale } from "@/lib/workspace-i18n";
import { getWorkspaceCopy } from "@/lib/workspace-i18n";

import type { WorkspaceFeedbackHandlers } from "./workspace-shared";
import { toErrorMessage } from "./workspace-shared";

type UsePatchChecksWorkspaceOptions = WorkspaceFeedbackHandlers & {
  locale: WorkspaceLocale;
  selectedRepoId: number | null;
  selectedRepository: RepositoryRecord | null;
  setSelectedRepoId: (repoId: number | null) => void;
};

export function usePatchChecksWorkspace({
  locale,
  selectedRepoId,
  selectedRepository,
  setSelectedRepoId,
  setError,
  setStatusMessage,
}: UsePatchChecksWorkspaceOptions) {
  const copy = getWorkspaceCopy(locale);
  const [patchResponse, setPatchResponse] = useState<PatchDraftResponse | null>(null);
  const [patchBatchResponse, setPatchBatchResponse] = useState<PatchBatchDraftResponse | null>(null);
  const [patchApplyResponse, setPatchApplyResponse] = useState<PatchApplyResponse | null>(null);
  const [patchBatchApplyResponse, setPatchBatchApplyResponse] =
    useState<PatchBatchApplyResponse | null>(null);
  const [checkProfiles, setCheckProfiles] = useState<CheckProfile[]>([]);
  const [checkRecommendation, setCheckRecommendation] =
    useState<CheckRecommendationResponse | null>(null);
  const [checkResponse, setCheckResponse] = useState<CheckRunResponse | null>(null);
  const [isLoadingCheckProfiles, setIsLoadingCheckProfiles] = useState(false);
  const [isLoadingCheckRecommendation, setIsLoadingCheckRecommendation] = useState(false);
  const [isDraftingPatch, setIsDraftingPatch] = useState(false);
  const [isApplyingPatch, setIsApplyingPatch] = useState(false);
  const [isApplyingBatchPatch, setIsApplyingBatchPatch] = useState(false);
  const [isApplyingAndChecking, setIsApplyingAndChecking] = useState(false);
  const [isApplyingBatchAndChecking, setIsApplyingBatchAndChecking] = useState(false);
  const [isRunningChecks, setIsRunningChecks] = useState(false);

  useEffect(() => {
    setPatchResponse((current) => (current?.repo_id === selectedRepoId ? current : null));
    setPatchBatchResponse((current) => (current?.repo_id === selectedRepoId ? current : null));
    setPatchApplyResponse((current) => (current?.repo_id === selectedRepoId ? current : null));
    setPatchBatchApplyResponse((current) =>
      current?.repo_id === selectedRepoId ? current : null,
    );
    setCheckResponse((current) => (current?.repo_id === selectedRepoId ? current : null));
    setCheckRecommendation((current) => (current?.repo_id === selectedRepoId ? current : null));
  }, [selectedRepoId]);

  useEffect(() => {
    let active = true;

    async function loadCheckProfiles() {
      if (!selectedRepository || !selectedRepository.root_path) {
        startTransition(() => {
          setCheckProfiles([]);
        });
        return;
      }

      try {
        setIsLoadingCheckProfiles(true);
        const response = await fetchCheckProfiles(selectedRepository.id);
        if (!active) {
          return;
        }
        startTransition(() => {
          setCheckProfiles(response.items);
        });
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(toErrorMessage(loadError, copy.feedback.loadChecks));
      } finally {
        if (active) {
          setIsLoadingCheckProfiles(false);
        }
      }
    }

    void loadCheckProfiles();
    return () => {
      active = false;
    };
  }, [copy.feedback.loadChecks, selectedRepository, setError]);

  useEffect(() => {
    let active = true;

    async function loadCheckRecommendation() {
      const changedPaths =
        patchBatchResponse && patchBatchResponse.repo_id === selectedRepository?.id
          ? patchBatchResponse.target_paths
          : patchResponse && patchResponse.repo_id === selectedRepository?.id
            ? [patchResponse.target_path]
            : null;

      if (
        !selectedRepository ||
        !selectedRepository.root_path ||
        !changedPaths ||
        changedPaths.length === 0
      ) {
        startTransition(() => {
          setCheckRecommendation(null);
        });
        return;
      }

      try {
        setIsLoadingCheckRecommendation(true);
        const response = await fetchRecommendedChecks({
          changed_paths: changedPaths,
          repo_id: selectedRepository.id,
        });
        if (!active) {
          return;
        }
        startTransition(() => {
          setCheckRecommendation(response);
        });
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(toErrorMessage(loadError, copy.feedback.loadRecommendedChecks));
      } finally {
        if (active) {
          setIsLoadingCheckRecommendation(false);
        }
      }
    }

    void loadCheckRecommendation();
    return () => {
      active = false;
    };
  }, [copy.feedback.loadRecommendedChecks, patchBatchResponse, patchResponse, selectedRepository, setError]);

  function getRecommendedProfileIds(): string[] | undefined {
    return checkRecommendation && checkRecommendation.items.length > 0
      ? checkRecommendation.items.map((item) => item.id)
      : undefined;
  }

  async function handleDraftPatch(repoId: number, targetPaths: string[], instruction: string) {
    const normalizedTargetPaths = targetPaths
      .map((targetPath) => targetPath.trim())
      .filter((targetPath) => targetPath.length > 0);

    if (normalizedTargetPaths.length === 0) {
      return;
    }

    setIsDraftingPatch(true);
    setError(null);
    setStatusMessage(null);

    try {
      if (normalizedTargetPaths.length === 1) {
        const response = await createPatchDraft({
          instruction,
          repo_id: repoId,
          response_language: locale,
          target_path: normalizedTargetPaths[0],
        });
        setPatchResponse(response);
        setPatchBatchResponse(null);
        setStatusMessage(copy.feedback.draftPatchSingleReady(response.target_path));
      } else {
        const response = await createPatchDraftBatch({
          instruction,
          repo_id: repoId,
          response_language: locale,
          target_paths: normalizedTargetPaths,
        });
        setPatchBatchResponse(response);
        setPatchResponse(null);
        setStatusMessage(copy.feedback.draftPatchBatchReady(response.changed_file_count));
      }

      setPatchApplyResponse(null);
      setPatchBatchApplyResponse(null);
      setCheckRecommendation(null);
      setCheckResponse(null);
      setSelectedRepoId(repoId);
    } catch (draftError) {
      setError(toErrorMessage(draftError, copy.feedback.draftPatch));
    } finally {
      setIsDraftingPatch(false);
    }
  }

  async function handleApplyPatchAndRunChecks(draft: PatchDraftResponse) {
    setIsApplyingAndChecking(true);
    setError(null);
    setStatusMessage(null);

    try {
      const response: PatchApplyAndCheckResponse = await applyPatchAndRunChecks({
        expected_base_sha256: draft.base_content_sha256,
        profile_ids: getRecommendedProfileIds(),
        proposed_content: draft.proposed_content,
        repo_id: draft.repo_id,
        target_path: draft.target_path,
      });
      setPatchApplyResponse(response.patch);
      setCheckResponse(response.checks);
      setStatusMessage(copy.feedback.applyPatchAndVerifyDone);
    } catch (applyError) {
      setError(toErrorMessage(applyError, copy.feedback.applyPatchAndVerify));
    } finally {
      setIsApplyingAndChecking(false);
    }
  }

  async function handleApplyPatch(draft: PatchDraftResponse) {
    setIsApplyingPatch(true);
    setError(null);
    setStatusMessage(null);

    try {
      const response = await applyPatchDraft({
        expected_base_sha256: draft.base_content_sha256,
        proposed_content: draft.proposed_content,
        repo_id: draft.repo_id,
        target_path: draft.target_path,
      });
      setPatchApplyResponse(response);
      setStatusMessage(copy.feedback.applyPatchDone(response.target_path));
    } catch (applyError) {
      setError(toErrorMessage(applyError, copy.feedback.applyPatch));
    } finally {
      setIsApplyingPatch(false);
    }
  }

  async function handleApplyPatchBatch(repoId: number, drafts: PatchDraftFile[]) {
    if (drafts.length === 0) {
      return;
    }

    setIsApplyingBatchPatch(true);
    setError(null);
    setStatusMessage(null);

    try {
      const response = await applyPatchDraftBatch({
        items: drafts.map((draft) => ({
          expected_base_sha256: draft.base_content_sha256,
          proposed_content: draft.proposed_content,
          target_path: draft.target_path,
        })),
        repo_id: repoId,
      });
      setPatchApplyResponse(null);
      setPatchBatchApplyResponse(response);
      setStatusMessage(copy.feedback.applyPatchBatchDone(response.applied_count, response.noop_count));
    } catch (applyError) {
      setError(toErrorMessage(applyError, copy.feedback.applyPatchBatch));
    } finally {
      setIsApplyingBatchPatch(false);
    }
  }

  async function handleApplyPatchBatchAndRunChecks(repoId: number, drafts: PatchDraftFile[]) {
    if (drafts.length === 0) {
      return;
    }

    setIsApplyingBatchAndChecking(true);
    setError(null);
    setStatusMessage(null);

    try {
      const response: PatchBatchApplyAndCheckResponse = await applyPatchBatchAndRunChecks({
        items: drafts.map((draft) => ({
          expected_base_sha256: draft.base_content_sha256,
          proposed_content: draft.proposed_content,
          target_path: draft.target_path,
        })),
        profile_ids: getRecommendedProfileIds(),
        repo_id: repoId,
      });
      setPatchApplyResponse(null);
      setPatchBatchApplyResponse(response.patch);
      setCheckResponse(response.checks);
      setStatusMessage(copy.feedback.applyPatchBatchAndVerifyDone);
    } catch (applyError) {
      setError(toErrorMessage(applyError, copy.feedback.applyPatchBatchAndVerify));
    } finally {
      setIsApplyingBatchAndChecking(false);
    }
  }

  async function handleRunChecks(profileIds?: string[]) {
    if (!selectedRepository) {
      return;
    }

    setIsRunningChecks(true);
    setError(null);
    setStatusMessage(null);

    try {
      const response = await runRepositoryChecks({
        profile_ids: profileIds,
        repo_id: selectedRepository.id,
      });
      setCheckResponse(response);
      setStatusMessage(copy.feedback.runChecksDone(response.results.length));
    } catch (checkError) {
      setError(toErrorMessage(checkError, copy.feedback.runChecks));
    } finally {
      setIsRunningChecks(false);
    }
  }

  return {
    patchResponse,
    patchBatchResponse,
    patchApplyResponse,
    patchBatchApplyResponse,
    checkProfiles,
    checkRecommendation,
    checkResponse,
    isLoadingCheckProfiles,
    isLoadingCheckRecommendation,
    isDraftingPatch,
    isApplyingPatch,
    isApplyingBatchPatch,
    isApplyingAndChecking,
    isApplyingBatchAndChecking,
    isRunningChecks,
    recommendedCheckCount: checkRecommendation?.items.length ?? 0,
    handleDraftPatch,
    handleApplyPatchAndRunChecks,
    handleApplyPatch,
    handleApplyPatchBatch,
    handleApplyPatchBatchAndRunChecks,
    handleRunChecks,
  };
}
