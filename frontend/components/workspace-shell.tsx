"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, FilePenLine, ListChecks, Menu, MessageSquare, PanelRightClose, PanelRightOpen, Plus, X } from "lucide-react";
import { ChecksPanel } from "@/components/checks/checks-panel";
import { ChatPanel } from "@/components/chat/chat-panel";
import { ChatHistoryPanel } from "@/components/chat/chat-history-panel";
import { CitationPanel } from "@/components/citations/citation-panel";
import { JobActivityPanel } from "@/components/jobs/job-activity-panel";
import { PatchDraftPanel } from "@/components/patches/patch-draft-panel";
import { RepositoryImportForm } from "@/components/repositories/repository-import-form";
import { RepositoryReader, RepositoryTree } from "@/components/reader/repository-reader";
import { useChatWorkspace } from "@/lib/hooks/use-chat-workspace";
import { usePatchChecksWorkspace } from "@/lib/hooks/use-patch-checks-workspace";
import { useWorkspaceRepositories } from "@/lib/hooks/use-workspace-repositories";
import { useRepositoryReader, type SourceTarget } from "@/lib/hooks/use-repository-reader";
import { formatRepositoryStatus, type WorkspaceLocale } from "@/lib/workspace-i18n";
import type { RepositoryRecord } from "@/lib/types";

type View = "read" | "chat" | "patch" | "checks";

export function WorkspaceShell() {
  const [locale, setLocale] = useState<WorkspaceLocale>("zh-CN");
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const importButton = useRef<HTMLButtonElement>(null);
  const repositories = useWorkspaceRepositories({ locale, setError, setStatusMessage });
  const en = locale === "en";
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  useEffect(() => {
    if (importOpen) dialog.current?.showModal();
    else { dialog.current?.close(); importButton.current?.focus(); }
  }, [importOpen]);
  function selectRepo(id: number | null) {
    repositories.setSelectedRepoId(id);
    setError(null);
    setStatusMessage(null);
  }
  return <main className="atlas-app">
    <header className="app-bar">
      <h1><BookOpen size={23} />CodeAtlas</h1>
      <label className="repository-picker"><span className="sr-only">{en ? "Current repository" : "当前仓库"}</span>
        <select aria-label={en ? "Current repository" : "当前仓库"} value={repositories.selectedRepoId ?? ""}
          onChange={(event) => selectRepo(Number(event.target.value))}>
          {repositories.repositories.length === 0 ? <option value="">{en ? "No repositories" : "暂无仓库"}</option> : null}
          {repositories.repositories.map((repo) => <option key={repo.id} value={repo.id}>{repo.name}</option>)}
        </select></label>
      <button ref={importButton} className="icon-button" title={en ? "Import repository" : "导入仓库"} aria-label={en ? "Import repository" : "导入仓库"} onClick={() => setImportOpen(true)}><Plus size={19} /></button>
      <span className={`connection-status ${repositories.health ? "connected" : ""}`}>{repositories.health ? (en ? "Local" : "本地") : (en ? "Connecting" : "连接中")}</span>
      <select className="language-picker" aria-label={en ? "Language" : "语言"} value={locale} onChange={(event) => setLocale(event.target.value as WorkspaceLocale)}>
        <option value="zh-CN">中文</option><option value="en">English</option>
      </select>
    </header>
    {error || statusMessage ? <div className={`feedback-bar ${error ? "is-error" : ""}`} role={error ? "alert" : "status"}>
      <span>{error ?? statusMessage}</span><button className="icon-button" aria-label={en ? "Dismiss" : "关闭提示"} title={en ? "Dismiss" : "关闭提示"}
        onClick={() => { setError(null); setStatusMessage(null); }}><X size={16} /></button>
    </div> : null}
    <dialog ref={dialog} className="import-dialog" onCancel={() => setImportOpen(false)} onClose={() => setImportOpen(false)}>
      <button className="icon-button dialog-close" aria-label={en ? "Close import" : "关闭导入"} title={en ? "Close import" : "关闭导入"} onClick={() => setImportOpen(false)}><X size={18} /></button>
      {error ? <p className="inline-error" role="alert">{error}</p> : null}
      <RepositoryImportForm isSubmitting={repositories.isSubmitting} locale={locale} onSubmit={async (payload) => {
        const success = await repositories.handleRepositorySubmit(payload);
        if (success) setImportOpen(false);
      }} />
    </dialog>
    {repositories.selectedRepository ? <RepositorySession key={repositories.selectedRepository.id} repository={repositories.selectedRepository}
      locale={locale} modelConfigured={repositories.meta?.model_configured ?? false} repositories={repositories} onSelect={selectRepo}
      setError={setError} setStatusMessage={setStatusMessage} /> : <div className="workspace-empty">
        <BookOpen size={36} /><h2>{en ? "No repository open" : "尚未打开仓库"}</h2>
        <button className="button-primary" disabled={repositories.isLoading} onClick={() => setImportOpen(true)}><Plus size={16} />{en ? "Import repository" : "导入仓库"}</button>
      </div>}
  </main>;
}

function RepositorySession({ repository, locale, modelConfigured, repositories, onSelect, setError, setStatusMessage }: {
  repository: RepositoryRecord;
  locale: WorkspaceLocale;
  modelConfigured: boolean;
  repositories: ReturnType<typeof useWorkspaceRepositories>;
  onSelect: (id: number | null) => void;
  setError: (message: string | null) => void;
  setStatusMessage: (message: string | null) => void;
}) {
  const en = locale === "en";
  const [view, setView] = useState<View>("read");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [questionSidebar, setQuestionSidebar] = useState<boolean | null>(null);
  const showQuestions = questionSidebar ?? modelConfigured;
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setSidebarOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const reader = useRepositoryReader(repository, locale);
  const common = { locale, selectedRepoId: repository.id, setSelectedRepoId: onSelect, setError, setStatusMessage };
  const chat = useChatWorkspace({ ...common, repositories: repositories.repositories });
  const changes = usePatchChecksWorkspace({ ...common, selectedRepository: repository });
  const tabs = [
    { id: "read" as const, label: en ? "Read" : "阅读", icon: BookOpen },
    { id: "chat" as const, label: en ? "Ask" : "问答", icon: MessageSquare },
    { id: "patch" as const, label: en ? "Changes" : "改动", icon: FilePenLine },
    { id: "checks" as const, label: en ? "Checks" : "检查", icon: ListChecks },
  ];
  function openSource(target: SourceTarget) { setView("read"); setSidebarOpen(false); void reader.openSource(target); }
  const questionPanel = <>
    <ChatPanel repository={repository} isAsking={chat.isAsking} modelConfigured={modelConfigured} locale={locale}
      onAsk={chat.handleAsk} onOpenPatch={() => setView("patch")} onOpenChecks={() => setView("checks")} response={chat.chatResponse} />
    {chat.chatResponse ? <CitationPanel locale={locale} response={chat.chatResponse} onOpenSource={openSource} /> : null}
  </>;
  return <>
    <nav className="workspace-nav" aria-label={en ? "Workspace views" : "工作区视图"}>
      <button className="icon-button sidebar-toggle" aria-expanded={sidebarOpen} title={en ? "Files and jobs" : "文件与任务"} aria-label={en ? "Files and jobs" : "文件与任务"}
        onClick={() => setSidebarOpen(!sidebarOpen)}><Menu size={18} /></button>
      {tabs.map(({ id, label, icon: Icon }) => <button key={id} className={`workspace-tab ${view === id ? "active" : ""}`} aria-current={view === id ? "page" : undefined} onClick={() => setView(id)}><Icon size={16} />{label}</button>)}
      <span className="repository-status">{formatRepositoryStatus(locale, repository.status)}</span>
      {view === "read" ? <button className="icon-button question-toggle" aria-expanded={showQuestions}
        aria-label={showQuestions ? (en ? "Hide questions" : "收起问答栏") : (en ? "Show questions" : "展开问答栏")}
        title={showQuestions ? (en ? "Hide questions" : "收起问答栏") : (en ? "Show questions" : "展开问答栏")}
        onClick={() => setQuestionSidebar(!showQuestions)}>{showQuestions ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}</button> : null}
      <button className="button-secondary index-button" disabled={!repository.root_path || Boolean(repositories.indexingRepoId || repositories.importingRepoId)}
        onClick={() => void repositories.handleIndexRepository(repository.id)}>{repository.status === "ready" ? (en ? "Reindex" : "重新索引") : (en ? "Index repository" : "开始索引")}</button>
    </nav>
    <div className={`reading-layout view-${view} ${showQuestions ? "" : "reader-wide"}`}>
      {sidebarOpen ? <button className="drawer-backdrop" aria-label={en ? "Close files" : "关闭文件栏"} onClick={() => setSidebarOpen(false)} /> : null}
      <aside className={`file-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-context"><strong>{repository.name}</strong><span className="muted">{repository.primary_language ?? repository.source_type}</span></div>
        {repository.root_path ? <RepositoryTree reader={reader} locale={locale} onOpenSource={openSource} /> : <p className="empty-state">{en ? "Waiting for clone" : "等待克隆完成"}</p>}
        <details className="sidebar-details"><summary>{en ? "Jobs" : "任务"}</summary><JobActivityPanel jobs={repositories.recentJobs} locale={locale} onRetry={repositories.handleRetryJob}
          onSelectRepository={onSelect} repositories={repositories.repositories} retryingJobId={repositories.retryingJobId} selectedRepoId={repository.id} /></details>
        {chat.chatHistory.length ? <details className="sidebar-details"><summary>{en ? "Questions" : "历史提问"}</summary><ChatHistoryPanel activeSessionId={chat.chatResponse?.session_id ?? null}
          entries={chat.chatHistory} locale={locale} onSelectSession={chat.handleSelectHistory} /></details> : null}
      </aside>
      {view === "read" ? <><RepositoryReader reader={reader} locale={locale} indexed={repository.status === "ready"} />{showQuestions ? <aside className="question-sidebar">{questionPanel}</aside> : null}</> : null}
      {view === "chat" ? <div className="full-panel chat-view">{questionPanel}</div> : null}
      {view === "patch" ? <div className="full-panel"><PatchDraftPanel modelConfigured={modelConfigured} applyResponse={changes.patchApplyResponse} batchApplyResponse={changes.patchBatchApplyResponse}
        batchResponse={changes.patchBatchResponse} isApplying={changes.isApplyingPatch} isApplyingAndChecking={changes.isApplyingAndChecking} isApplyingBatch={changes.isApplyingBatchPatch}
        isApplyingBatchAndChecking={changes.isApplyingBatchAndChecking} isDrafting={changes.isDraftingPatch} locale={locale} onApply={changes.handleApplyPatch}
        onApplyAndCheck={changes.handleApplyPatchAndRunChecks} onApplyBatch={changes.handleApplyPatchBatch} onApplyBatchAndCheck={changes.handleApplyPatchBatchAndRunChecks}
        onDraft={changes.handleDraftPatch} onOpenChat={() => setView("chat")} onOpenChecks={() => setView("checks")} recommendedCheckCount={changes.recommendedCheckCount}
        response={changes.patchResponse} selectedRepository={repository} suggestedPath={reader.source?.path ?? chat.suggestedPatchPath} /></div> : null}
      {view === "checks" ? <div className="full-panel"><ChecksPanel isLoadingProfiles={changes.isLoadingCheckProfiles} isLoadingRecommendation={changes.isLoadingCheckRecommendation}
        isRunningChecks={changes.isRunningChecks} locale={locale} onOpenChat={() => setView("chat")} onOpenPatch={() => setView("patch")}
        onRunChecks={changes.handleRunChecks} patchApplyResponse={changes.patchApplyResponse} profiles={changes.checkProfiles} recommendation={changes.checkRecommendation}
        response={changes.checkResponse} selectedRepository={repository} /></div> : null}
    </div>
  </>;
}
