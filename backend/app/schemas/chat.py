from __future__ import annotations

from pydantic import BaseModel, Field


class ChatCitation(BaseModel):
    path: str
    start_line: int | None = None
    end_line: int | None = None
    symbol: str | None = None
    note: str = Field(description="Why this citation supports the answer.")
    excerpt: str | None = Field(default=None, description="Short supporting snippet when available.")


class ChatAskRequest(BaseModel):
    repo_id: int
    question: str = Field(min_length=1)
    session_id: str | None = None


class ChatTraceStep(BaseModel):
    tool_name: str
    args_summary: str
    item_count: int
    summary: str | None = None


class ChatTraceSummary(BaseModel):
    agent_name: str
    model: str
    latency_ms: int
    tool_call_count: int
    steps: list[ChatTraceStep]


class ChatAskResponse(BaseModel):
    session_id: str
    answer: str
    citations: list[ChatCitation]
    trace_summary: ChatTraceSummary
