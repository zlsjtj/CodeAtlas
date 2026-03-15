from __future__ import annotations

import json
import logging
import os
from time import perf_counter
from uuid import uuid4

from agents import Runner
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.agents.code_assistant import (
    CodeAssistantFinalOutput,
    CodeAssistantRunContext,
    build_code_assistant_agent,
)
from app.core.config import get_settings
from app.models.conversation_trace import ConversationTrace
from app.models.file_chunk import FileChunk
from app.models.repository import Repository
from app.schemas.chat import ChatAskRequest, ChatAskResponse, ChatTraceStep, ChatTraceSummary
from app.schemas.common import ResponseLanguage
from app.services.repository_service import RepositoryService, RepositoryValidationError
from app.tools.repository_tools import RepositoryTools

logger = logging.getLogger(__name__)


class ChatConfigurationError(ValueError):
    """Raised when the chat runtime is not configured correctly."""


class ChatService:
    def __init__(self, db: Session):
        self.db = db
        self.repository_service = RepositoryService(db)

    async def ask(self, payload: ChatAskRequest) -> ChatAskResponse:
        settings = get_settings()
        if not os.getenv("OPENAI_API_KEY"):
            raise ChatConfigurationError(
                self._localized_message(
                    payload.response_language,
                    "OPENAI_API_KEY 尚未配置，请先设置后再调用 /api/chat/ask。",
                    "OPENAI_API_KEY is not configured. Set it before calling /api/chat/ask.",
                )
            )

        repository = self.repository_service.get_repository(payload.repo_id)
        self._validate_repository_for_chat(repository, payload.response_language)

        session_id = payload.session_id or uuid4().hex
        logger.info(
            "chat.ask.start repo_id=%s session_id=%s response_language=%s",
            repository.id,
            session_id,
            payload.response_language,
        )
        runtime = RepositoryTools(self.db)
        run_context = CodeAssistantRunContext(
            repo_id=repository.id,
            repo_name=repository.name,
            tool_runtime=runtime,
        )

        user_input = self._build_user_input(repository, payload.question, payload.response_language)
        started_at = perf_counter()
        final_output, agent_name = await self._run_agent(
            user_input=user_input,
            run_context=run_context,
            model=settings.openai_model,
            response_language=payload.response_language,
        )
        latency_ms = int((perf_counter() - started_at) * 1000)

        trace_summary = ChatTraceSummary(
            agent_name=agent_name,
            model=settings.openai_model,
            latency_ms=latency_ms,
            tool_call_count=len(run_context.tool_events),
            steps=[ChatTraceStep(**event) for event in run_context.tool_events],
        )

        trace = ConversationTrace(
            session_id=session_id,
            repo_id=repository.id,
            user_query=payload.question,
            tool_calls_json=json.dumps(run_context.tool_events, ensure_ascii=False),
            citations_json=json.dumps(
                [citation.model_dump() for citation in final_output.citations],
                ensure_ascii=False,
            ),
            final_answer=final_output.answer,
            latency_ms=latency_ms,
        )
        self.db.add(trace)
        self.db.commit()
        logger.info(
            "chat.ask.success repo_id=%s session_id=%s tool_calls=%s latency_ms=%s",
            repository.id,
            session_id,
            len(run_context.tool_events),
            latency_ms,
        )

        return ChatAskResponse(
            session_id=session_id,
            answer=final_output.answer,
            citations=final_output.citations,
            trace_summary=trace_summary,
        )

    async def _run_agent(
        self,
        *,
        user_input: str,
        run_context: CodeAssistantRunContext,
        model: str,
        response_language: ResponseLanguage | None,
    ) -> tuple[CodeAssistantFinalOutput, str]:
        agent = build_code_assistant_agent(
            model,
            preferred_response_language=response_language,
        )
        result = await Runner.run(agent, user_input, context=run_context)
        final_output = result.final_output
        if not isinstance(final_output, CodeAssistantFinalOutput):
            raise ChatConfigurationError(
                self._localized_message(
                    response_language,
                    "代码问答助手返回了意外的输出类型。",
                    "The code assistant returned an unexpected output type.",
                )
            )

        agent_name = getattr(getattr(result, "last_agent", None), "name", agent.name)
        return final_output, agent_name

    def _validate_repository_for_chat(
        self,
        repository: Repository,
        response_language: ResponseLanguage | None,
    ) -> None:
        self.repository_service.resolve_repository_root(repository, response_language)
        if repository.status != "ready":
            raise RepositoryValidationError(
                self._localized_message(
                    response_language,
                    "请先为仓库建立索引，再发起问答。",
                    "Index the repository first before asking questions.",
                )
            )

        chunk_count = int(
            self.db.scalar(select(func.count(FileChunk.id)).where(FileChunk.repo_id == repository.id))
            or 0
        )
        if chunk_count == 0:
            raise RepositoryValidationError(
                self._localized_message(
                    response_language,
                    "这个仓库还没有可用的索引片段，请先触发索引。",
                    "The repository has no indexed chunks yet. Trigger indexing first.",
                )
            )

    def _build_user_input(
        self,
        repository: Repository,
        question: str,
        response_language: ResponseLanguage | None,
    ) -> str:
        root_path = repository.root_path or "(unknown)"
        preferred_language = self._describe_response_language(response_language)
        parts = [
            f"Repository name: {repository.name}",
            f"Repository root: {root_path}",
        ]
        if preferred_language:
            parts.append(f"Preferred response language: {preferred_language}")
        parts.append(f"User question: {question}")
        return "\n".join(parts)

    def _describe_response_language(self, response_language: ResponseLanguage | None) -> str | None:
        if response_language == ResponseLanguage.ZH_CN:
            return "Simplified Chinese"
        if response_language == ResponseLanguage.EN:
            return "English"
        return None

    def _localized_message(
        self,
        response_language: ResponseLanguage | None,
        zh_cn_message: str,
        en_message: str,
    ) -> str:
        if response_language == ResponseLanguage.ZH_CN:
            return zh_cn_message
        return en_message
