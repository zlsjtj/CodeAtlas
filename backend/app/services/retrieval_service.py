from __future__ import annotations

import re
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.file_chunk import FileChunk
from app.schemas.common import ResponseLanguage
from app.schemas.tool import (
    FindSymbolRequest,
    ListRepoTreeRequest,
    ReadFileRequest,
    SearchRepoRequest,
    ToolExecutionResponse,
    ToolResultItem,
)
from app.services.indexing_service import IndexingService
from app.services.repository_service import RepositoryService, RepositoryValidationError

MAX_READ_LINES = 200

SYMBOL_PATTERNS: list[tuple[set[str], str, re.Pattern[str]]] = [
    ({".py"}, "function", re.compile(r"^\s*(?:async\s+def|def)\s+(?P<name>[A-Za-z_]\w*)\s*\(")),
    ({".py"}, "class", re.compile(r"^\s*class\s+(?P<name>[A-Za-z_]\w*)\b")),
    (
        {".js", ".jsx", ".ts", ".tsx"},
        "function",
        re.compile(r"^\s*(?:export\s+)?(?:async\s+)?function\s+(?P<name>[A-Za-z_$][\w$]*)\s*\("),
    ),
    (
        {".js", ".jsx", ".ts", ".tsx"},
        "class",
        re.compile(r"^\s*(?:export\s+)?class\s+(?P<name>[A-Za-z_$][\w$]*)\b"),
    ),
    (
        {".ts", ".tsx"},
        "interface",
        re.compile(r"^\s*(?:export\s+)?interface\s+(?P<name>[A-Za-z_$][\w$]*)\b"),
    ),
    (
        {".ts", ".tsx", ".js", ".jsx"},
        "variable",
        re.compile(
            r"^\s*(?:export\s+)?(?:const|let|var)\s+(?P<name>[A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>"
        ),
    ),
]


class RepositoryQueryService:
    def __init__(self, db: Session):
        self.db = db
        self.indexing_service = IndexingService(db)
        self.repository_service = RepositoryService(db)

    def list_repo_tree(self, payload: ListRepoTreeRequest) -> ToolExecutionResponse:
        repository = self.repository_service.get_repository(payload.repo_id, payload.response_language)
        root = self.repository_service.resolve_repository_root(repository, payload.response_language)
        tree = self.indexing_service.build_tree(
            repository,
            root=root,
            path=payload.path,
            depth=payload.depth,
            response_language=payload.response_language,
        )

        items: list[ToolResultItem] = []
        for node in tree.nodes:
            items.extend(self._flatten_tree(node, depth=1))

        return ToolExecutionResponse(
            tool_name="list_repo_tree",
            repo_id=payload.repo_id,
            items=items,
            total_matches=len(items),
            summary=self._localized_message(
                payload.response_language,
                f"已返回路径 '{tree.path or '.'}' 下的 {len(items)} 个目录树节点。",
                f"Returned {len(items)} tree nodes for path '{tree.path or '.'}'.",
            ),
        )

    def search_repo(self, payload: SearchRepoRequest) -> ToolExecutionResponse:
        repository = self.repository_service.get_repository(payload.repo_id, payload.response_language)
        self._ensure_indexed(repository.id, payload.response_language)

        normalized_query = payload.query.strip().lower()
        query_terms = [term for term in re.split(r"\s+", normalized_query) if term]
        if not query_terms:
            raise RepositoryValidationError(
                self._localized_message(
                    payload.response_language,
                    "query 至少需要包含一个可检索关键词。",
                    "query must contain at least one searchable term.",
                )
            )

        statement = select(FileChunk).where(FileChunk.repo_id == payload.repo_id)
        for term in query_terms:
            statement = statement.where(func.lower(FileChunk.text).contains(term))

        if payload.path_prefix:
            statement = statement.where(FileChunk.path.startswith(payload.path_prefix.strip().strip("/")))

        fetch_limit = min(payload.limit * 8, 200)
        candidates = list(self.db.scalars(statement.limit(fetch_limit)).all())

        ranked: list[tuple[float, FileChunk]] = []
        for chunk in candidates:
            score = self._score_chunk(chunk.text, chunk.path, normalized_query, query_terms)
            if score > 0:
                ranked.append((score, chunk))

        ranked.sort(key=lambda entry: (-entry[0], entry[1].path, entry[1].start_line))
        limited = ranked[: payload.limit]
        items = [
            ToolResultItem(
                kind="search_match",
                path=chunk.path,
                start_line=chunk.start_line,
                end_line=chunk.end_line,
                language=chunk.language,
                content=self._build_snippet(chunk.text, normalized_query, query_terms),
                score=round(score, 3),
            )
            for score, chunk in limited
        ]

        return ToolExecutionResponse(
            tool_name="search_repo",
            repo_id=payload.repo_id,
            items=items,
            truncated=len(ranked) > len(limited),
            total_matches=len(ranked),
            summary=self._localized_message(
                payload.response_language,
                f"针对查询 '{payload.query}' 找到了 {len(ranked)} 个索引片段匹配项。",
                f"Found {len(ranked)} indexed chunk matches for query '{payload.query}'.",
            ),
        )

    def read_file(self, payload: ReadFileRequest) -> ToolExecutionResponse:
        repository = self.repository_service.get_repository(payload.repo_id, payload.response_language)
        file_path = self.repository_service.resolve_relative_path(
            repository,
            payload.path,
            payload.response_language,
        )
        if not file_path.is_file():
            raise RepositoryValidationError(
                self._localized_message(
                    payload.response_language,
                    "请求的仓库路径不是文件。",
                    "The requested repository path is not a file.",
                )
            )

        try:
            lines = file_path.read_text(encoding="utf-8").splitlines()
        except UnicodeDecodeError as exc:
            raise RepositoryValidationError(
                self._localized_message(
                    payload.response_language,
                    "read_file 当前只支持 UTF-8 文本文件。",
                    "read_file currently supports UTF-8 text files only.",
                )
            ) from exc

        if payload.start_line > len(lines):
            raise RepositoryValidationError(
                self._localized_message(
                    payload.response_language,
                    "start_line 超出了文件行数范围。",
                    "start_line is outside the file range.",
                )
            )
        requested_end_line = payload.end_line or min(payload.start_line + MAX_READ_LINES - 1, len(lines))
        if requested_end_line - payload.start_line + 1 > MAX_READ_LINES:
            raise RepositoryValidationError(
                self._localized_message(
                    payload.response_language,
                    f"read_file 单次最多返回 {MAX_READ_LINES} 行。",
                    f"read_file can return at most {MAX_READ_LINES} lines at once.",
                )
            )

        end_line = min(requested_end_line, len(lines))
        start_index = payload.start_line - 1
        segment = "\n".join(lines[start_index:end_line])

        item = ToolResultItem(
            kind="file_segment",
            path=payload.path.strip().strip("/"),
            start_line=payload.start_line,
            end_line=end_line,
            language=self.indexing_service.scanner.detect_language(file_path),
            content=segment,
        )
        return ToolExecutionResponse(
            tool_name="read_file",
            repo_id=payload.repo_id,
            items=[item],
            total_matches=1,
            summary=self._localized_message(
                payload.response_language,
                f"已从 '{payload.path}' 读取 {max(0, end_line - payload.start_line + 1)} 行。",
                f"Read {max(0, end_line - payload.start_line + 1)} lines from '{payload.path}'.",
            ),
        )

    def find_symbol(self, payload: FindSymbolRequest) -> ToolExecutionResponse:
        repository = self.repository_service.get_repository(payload.repo_id, payload.response_language)
        root = self.repository_service.resolve_repository_root(repository, payload.response_language)
        indexed_paths = self._get_indexed_paths(payload.repo_id)
        if not indexed_paths:
            raise RepositoryValidationError(
                self._localized_message(
                    payload.response_language,
                    "这个仓库还没有完成索引。",
                    "The repository has not been indexed yet.",
                )
            )

        target_name = payload.name.strip().lower()
        path_hint = payload.path_hint.strip().lower() if payload.path_hint else None
        items: list[ToolResultItem] = []

        for relative_path in indexed_paths:
            if path_hint and path_hint not in relative_path.lower():
                continue

            absolute_path = (root / relative_path).resolve()
            if not absolute_path.exists() or not absolute_path.is_file():
                continue

            suffix = absolute_path.suffix.lower()
            if not any(suffix in extensions for extensions, _, _ in SYMBOL_PATTERNS):
                continue

            try:
                lines = absolute_path.read_text(encoding="utf-8").splitlines()
            except UnicodeDecodeError:
                continue

            for index, line in enumerate(lines, start=1):
                matched = self._match_symbol(suffix, line)
                if not matched:
                    continue

                symbol_type, symbol_name = matched
                if symbol_name.lower() != target_name:
                    continue

                snippet_start = max(1, index - 2)
                snippet_end = min(len(lines), index + 2)
                snippet = "\n".join(lines[snippet_start - 1 : snippet_end])
                items.append(
                    ToolResultItem(
                        kind="symbol_match",
                        path=relative_path,
                        start_line=index,
                        end_line=index,
                        language=self.indexing_service.scanner.detect_language(absolute_path),
                        content=snippet,
                        symbol=symbol_name,
                        symbol_type=symbol_type,
                        score=1.0,
                    )
                )
                if len(items) >= payload.limit:
                    return ToolExecutionResponse(
                        tool_name="find_symbol",
                        repo_id=payload.repo_id,
                        items=items,
                        truncated=True,
                        total_matches=len(items),
                        summary=self._localized_message(
                            payload.response_language,
                            f"已在找到 {len(items)} 个符号匹配后停止，目标为 '{payload.name}'。",
                            f"Stopped after {len(items)} symbol matches for '{payload.name}'.",
                        ),
                    )

        return ToolExecutionResponse(
            tool_name="find_symbol",
            repo_id=payload.repo_id,
            items=items,
            total_matches=len(items),
            summary=self._localized_message(
                payload.response_language,
                f"针对 '{payload.name}' 找到了 {len(items)} 个符号匹配项。",
                f"Found {len(items)} symbol matches for '{payload.name}'.",
            ),
        )

    def _flatten_tree(self, node, *, depth: int) -> list[ToolResultItem]:
        items = [
            ToolResultItem(
                kind="tree_node",
                path=node.path,
                node_type=node.node_type,
                depth=depth,
            )
        ]
        for child in node.children:
            items.extend(self._flatten_tree(child, depth=depth + 1))
        return items

    def _ensure_indexed(
        self,
        repo_id: int,
        response_language: ResponseLanguage | None,
    ) -> None:
        has_chunks = self.db.scalar(select(func.count(FileChunk.id)).where(FileChunk.repo_id == repo_id))
        if not has_chunks:
            raise RepositoryValidationError(
                self._localized_message(
                    response_language,
                    "这个仓库还没有完成索引。",
                    "The repository has not been indexed yet.",
                )
            )

    def _get_indexed_paths(self, repo_id: int) -> list[str]:
        statement = select(FileChunk.path).where(FileChunk.repo_id == repo_id).distinct().order_by(FileChunk.path.asc())
        return list(self.db.scalars(statement).all())

    def _score_chunk(self, text: str, path: str, query: str, query_terms: list[str]) -> float:
        lowered = text.lower()
        score = float(lowered.count(query) * 2)
        score += float(sum(lowered.count(term) for term in query_terms))
        path_lower = path.lower()
        score += float(sum(path_lower.count(term) for term in query_terms)) * 0.5
        return score

    def _build_snippet(self, text: str, query: str, query_terms: list[str], *, max_chars: int = 320) -> str:
        lowered = text.lower()
        match_index = lowered.find(query)
        if match_index < 0:
            for term in query_terms:
                match_index = lowered.find(term)
                if match_index >= 0:
                    break

        if match_index < 0 or len(text) <= max_chars:
            return text[:max_chars]

        start = max(0, match_index - 80)
        end = min(len(text), start + max_chars)
        snippet = text[start:end]
        if start > 0:
            snippet = "..." + snippet
        if end < len(text):
            snippet = snippet + "..."
        return snippet

    def _match_symbol(self, suffix: str, line: str) -> tuple[str, str] | None:
        for extensions, symbol_type, pattern in SYMBOL_PATTERNS:
            if suffix not in extensions:
                continue
            matched = pattern.search(line)
            if matched:
                return symbol_type, matched.group("name")
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
