from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator

ToolItemKind = Literal["tree_node", "search_match", "file_segment", "symbol_match"]
ToolNodeType = Literal["file", "directory"]


class ToolResultItem(BaseModel):
    kind: ToolItemKind
    path: str
    start_line: int | None = None
    end_line: int | None = None
    language: str | None = None
    content: str | None = None
    score: float | None = None
    symbol: str | None = None
    symbol_type: str | None = None
    node_type: ToolNodeType | None = None
    depth: int | None = None


class ToolExecutionResponse(BaseModel):
    tool_name: str
    repo_id: int
    items: list[ToolResultItem]
    truncated: bool = False
    total_matches: int = 0
    summary: str | None = None


class ListRepoTreeRequest(BaseModel):
    repo_id: int
    path: str = ""
    depth: int = Field(default=3, ge=1, le=8)


class SearchRepoRequest(BaseModel):
    repo_id: int
    query: str = Field(min_length=1)
    path_prefix: str | None = None
    limit: int = Field(default=10, ge=1, le=50)


class ReadFileRequest(BaseModel):
    repo_id: int
    path: str
    start_line: int = Field(default=1, ge=1)
    end_line: int | None = Field(default=None, ge=1)

    @model_validator(mode="after")
    def validate_range(self) -> "ReadFileRequest":
        if self.end_line is not None and self.end_line < self.start_line:
            raise ValueError("end_line must be greater than or equal to start_line.")
        return self


class FindSymbolRequest(BaseModel):
    repo_id: int
    name: str = Field(min_length=1)
    path_hint: str | None = None
    limit: int = Field(default=10, ge=1, le=50)
