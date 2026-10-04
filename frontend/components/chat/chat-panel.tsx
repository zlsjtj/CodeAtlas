"use client";

import { useState } from "react";
import { ArrowUp, FilePenLine, ListChecks } from "lucide-react";
import type { ChatAskResponse, RepositoryRecord } from "@/lib/types";
import type { WorkspaceLocale } from "@/lib/workspace-i18n";

type ChatPanelProps = {
  repository: RepositoryRecord;
  isAsking: boolean;
  modelConfigured: boolean;
  locale: WorkspaceLocale;
  onAsk: (repoId: number, question: string) => Promise<void>;
  onOpenPatch: () => void;
  onOpenChecks: () => void;
  response: ChatAskResponse | null;
};

export function ChatPanel({ repository, isAsking, modelConfigured, locale, onAsk, onOpenPatch, onOpenChecks, response }: ChatPanelProps) {
  const en = locale === "en";
  const [question, setQuestion] = useState("");
  return <section className="chat-panel">
    <div className="section-heading"><h2>{en ? "Ask about this code" : "代码问答"}</h2></div>
    {!modelConfigured ? <p className="notice">{en ? "Model not configured. Set OPENAI_API_KEY in .env and restart the backend." : "模型未配置。请在 .env 设置 OPENAI_API_KEY 并重启后端。"}</p> : null}
    <form onSubmit={(event) => { event.preventDefault(); if (question.trim()) void onAsk(repository.id, question.trim()); }}>
      <label className="field-label">{en ? "Question" : "问题"}
        <textarea rows={4} value={question} onChange={(event) => setQuestion(event.target.value)}
          placeholder={en ? "Where is this behavior implemented?" : "这段行为在哪里实现？"} /></label>
      <div className="question-actions"><span className="muted">{repository.name}</span>
        <button className="icon-button primary" type="submit" disabled={!modelConfigured || repository.status !== "ready" || isAsking || !question.trim()}
          title={en ? "Ask" : "提问"} aria-label={en ? "Ask" : "提问"}><ArrowUp size={18} /></button></div>
    </form>
    {isAsking ? <p role="status" className="muted">{en ? "Reading code and generating an answer..." : "正在读取代码并生成回答…"}</p> : null}
    {response ? <section className="answer-section">
      <div className="section-heading"><h3>{en ? "Answer" : "回答"}</h3><span className="muted">{response.citations.length} {en ? "references" : "条引用"}</span></div>
      <div className="answer-body">{response.answer}</div>
      <div className="button-row">
        <button className="button-secondary" onClick={onOpenPatch}><FilePenLine size={15} />{en ? "Draft change" : "起草改动"}</button>
        <button className="icon-button" onClick={onOpenChecks} title={en ? "Checks" : "检查"} aria-label={en ? "Checks" : "检查"}><ListChecks size={17} /></button>
      </div>
    </section> : null}
  </section>;
}
