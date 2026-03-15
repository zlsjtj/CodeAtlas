from __future__ import annotations

from agents import Agent
from pydantic import BaseModel, Field

from app.schemas.common import ResponseLanguage


class PatchDraftFinalOutput(BaseModel):
    summary: str = Field(description="A concise summary of the intended code change.")
    rationale: str = Field(
        description="A short explanation of why the draft solves the request and any assumptions."
    )
    proposed_content: str = Field(
        description="The full updated file content for the target file, preserving unrelated code."
    )
    warnings: list[str] = Field(
        default_factory=list,
        description="Optional cautions, edge cases, or follow-up checks for the patch draft.",
    )


def build_patch_draft_agent(
    model: str,
    *,
    preferred_response_language: ResponseLanguage | None = None,
) -> Agent[None]:
    language_instruction = _build_language_instruction(preferred_response_language)
    return Agent[None](
        name="PatchDraftAssistant",
        model=model,
        instructions=(
            "You are drafting a single-file code patch. "
            "You will receive a repository name, a target file path, an edit instruction, and the current file content. "
            "Return the full updated file content in proposed_content. "
            "Preserve unrelated code, imports, formatting style, and existing behavior unless the instruction requires a change. "
            "Do not mention files other than the provided target file. "
            "Do not wrap proposed_content in markdown fences. "
            "If the instruction is ambiguous, make the smallest safe change and describe the assumption in rationale or warnings. "
            f"{language_instruction}"
        ),
        output_type=PatchDraftFinalOutput,
    )


def _build_language_instruction(preferred_response_language: ResponseLanguage | None) -> str:
    if preferred_response_language == ResponseLanguage.ZH_CN:
        return "Default to Simplified Chinese for summary, rationale, and warnings unless the user explicitly asks for another language."
    if preferred_response_language == ResponseLanguage.EN:
        return "Default to English for summary, rationale, and warnings unless the user explicitly asks for another language."
    return "Reply in the same language as the user unless they explicitly ask otherwise."
