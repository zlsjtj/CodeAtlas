from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from agents import Agent, ModelSettings, RunContextWrapper, function_tool
from pydantic import BaseModel, Field

from app.schemas.chat import ChatCitation
from app.schemas.common import ResponseLanguage
from app.schemas.tool import (
    FindSymbolRequest,
    ListRepoTreeRequest,
    ReadFileRequest,
    SearchRepoRequest,
    ToolExecutionResponse,
)
from app.tools.repository_tools import RepositoryTools


@dataclass(slots=True)
class CodeAssistantRunContext:
    repo_id: int
    repo_name: str
    tool_runtime: RepositoryTools
    tool_events: list[dict[str, Any]] = field(default_factory=list)


class CodeAssistantFinalOutput(BaseModel):
    answer: str = Field(
        description="A concise repository answer with evidence-based conclusions and short markdown structure when helpful."
    )
    citations: list[ChatCitation] = Field(
        default_factory=list,
        description="Supporting citations derived only from tool results.",
    )


@function_tool
def list_repo_tree(
    ctx: RunContextWrapper[CodeAssistantRunContext],
    path: str = "",
    depth: int = 3,
) -> dict[str, Any]:
    """List a repository directory tree with a bounded depth. Use this to understand module layout before reading files."""
    payload = ListRepoTreeRequest(repo_id=ctx.context.repo_id, path=path, depth=depth)
    result = ctx.context.tool_runtime.list_repo_tree(payload)
    _record_tool_event(ctx, payload.model_dump(), result)
    return result.model_dump(mode="json")


@function_tool
def search_repo(
    ctx: RunContextWrapper[CodeAssistantRunContext],
    query: str,
    path_prefix: str | None = None,
    limit: int = 8,
) -> dict[str, Any]:
    """Search indexed repository chunks by keyword. Use this first for finding likely files, callsites, or configuration entries."""
    payload = SearchRepoRequest(
        repo_id=ctx.context.repo_id,
        query=query,
        path_prefix=path_prefix,
        limit=limit,
    )
    result = ctx.context.tool_runtime.search_repo(payload)
    _record_tool_event(ctx, payload.model_dump(exclude_none=True), result)
    return result.model_dump(mode="json")


@function_tool
def read_file(
    ctx: RunContextWrapper[CodeAssistantRunContext],
    path: str,
    start_line: int = 1,
    end_line: int | None = None,
) -> dict[str, Any]:
    """Read a bounded line range from a single repository file. Use this after search results to inspect the exact implementation."""
    payload = ReadFileRequest(
        repo_id=ctx.context.repo_id,
        path=path,
        start_line=start_line,
        end_line=end_line,
    )
    result = ctx.context.tool_runtime.read_file(payload)
    _record_tool_event(ctx, payload.model_dump(exclude_none=True), result)
    return result.model_dump(mode="json")


@function_tool
def find_symbol(
    ctx: RunContextWrapper[CodeAssistantRunContext],
    name: str,
    path_hint: str | None = None,
    limit: int = 8,
) -> dict[str, Any]:
    """Locate likely definitions of a function, class, interface, or exported symbol by name."""
    payload = FindSymbolRequest(
        repo_id=ctx.context.repo_id,
        name=name,
        path_hint=path_hint,
        limit=limit,
    )
    result = ctx.context.tool_runtime.find_symbol(payload)
    _record_tool_event(ctx, payload.model_dump(exclude_none=True), result)
    return result.model_dump(mode="json")


def build_code_assistant_agent(
    model: str,
    *,
    preferred_response_language: ResponseLanguage | None = None,
) -> Agent[CodeAssistantRunContext]:
    language_instruction = _build_language_instruction(preferred_response_language)
    return Agent[CodeAssistantRunContext](
        name="CodeAssistant",
        model=model,
        instructions=(
            "You are a code repository assistant. "
            "Answer questions about the selected repository only. "
            "Always use at least one tool before answering. "
            "Prefer search_repo first, then read_file or find_symbol when you need confirmation. "
            "Never invent a file path, symbol, or line number. "
            "If the evidence is incomplete, say that you are uncertain. "
            f"{language_instruction} "
            "Keep the final answer concise but structured. "
            "The answer field can use short markdown sections such as conclusion, evidence, risk, and next steps when helpful. "
            "The citations list must reference only evidence observed from tools."
        ),
        tools=[list_repo_tree, search_repo, read_file, find_symbol],
        output_type=CodeAssistantFinalOutput,
        model_settings=ModelSettings(tool_choice="required"),
    )


def _build_language_instruction(preferred_response_language: ResponseLanguage | None) -> str:
    if preferred_response_language == ResponseLanguage.ZH_CN:
        return (
            "Default to Simplified Chinese for the answer and citation notes unless the user explicitly asks for another language."
        )
    if preferred_response_language == ResponseLanguage.EN:
        return "Default to English for the answer and citation notes unless the user explicitly asks for another language."
    return "Reply in the same language as the user unless they explicitly ask otherwise."


def _record_tool_event(
    ctx: RunContextWrapper[CodeAssistantRunContext],
    args: dict[str, Any],
    result: ToolExecutionResponse,
) -> None:
    filtered_args = {key: value for key, value in args.items() if key != "repo_id"}
    args_summary = ", ".join(f"{key}={value}" for key, value in filtered_args.items()) or "(no args)"
    ctx.context.tool_events.append(
        {
            "tool_name": result.tool_name,
            "args_summary": args_summary,
            "item_count": len(result.items),
            "summary": result.summary,
        }
    )
