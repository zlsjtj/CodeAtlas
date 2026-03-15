from __future__ import annotations

from pathlib import Path

from app.checks.discovery import ResolvedCheckProfile
from app.schemas.common import ResponseLanguage


class PathBasedCheckRecommendation:
    def score(
        self,
        profile: ResolvedCheckProfile,
        changed_paths: list[str],
        *,
        root: Path,
        response_language: ResponseLanguage | None = None,
    ) -> tuple[int, str]:
        profile_scope = self._display_dir(root, profile.working_dir)
        score = 0
        reasons: list[str] = []

        for changed_path in changed_paths:
            suffix = Path(changed_path).suffix.lower()
            is_python_change = suffix == ".py"
            is_frontend_change = suffix in {".js", ".jsx", ".ts", ".tsx", ".css", ".scss", ".mjs", ".cjs"}

            if profile_scope != "root" and (
                changed_path == profile_scope or changed_path.startswith(f"{profile_scope}/")
            ):
                score += 6
                reasons.append(
                    self._message(
                        response_language,
                        f"`{changed_path}` 位于 `{profile_scope}/` 目录内。",
                        f"`{changed_path}` is inside `{profile_scope}/`.",
                    )
                )
            elif profile_scope == "root" and "/" not in changed_path:
                score += 2
                reasons.append(
                    self._message(
                        response_language,
                        f"`{changed_path}` 位于仓库根目录。",
                        f"`{changed_path}` is at the repository root.",
                    )
                )

            if profile.id.endswith("pytest") and is_python_change:
                score += 3
                reasons.append(
                    self._message(
                        response_language,
                        "Python 文件改动通常应该运行 pytest。",
                        "Python file changes should run pytest.",
                    )
                )

            if "npm-" in profile.id and is_frontend_change:
                score += 3
                reasons.append(
                    self._message(
                        response_language,
                        "前端文件改动通常应该运行 npm 检查。",
                        "Frontend file changes should run npm checks.",
                    )
                )
                if profile.category == "typecheck" and suffix in {".ts", ".tsx"}:
                    score += 1
                    reasons.append(
                        self._message(
                            response_language,
                            "TypeScript 文件改动通常应该运行类型检查。",
                            "TypeScript file changes should run typecheck.",
                        )
                    )

        if not reasons:
            return 0, ""

        deduped_reasons: list[str] = []
        for reason in reasons:
            if reason not in deduped_reasons:
                deduped_reasons.append(reason)

        return score, " ".join(deduped_reasons[:2])

    def _display_dir(self, root: Path, directory: Path) -> str:
        if directory == root:
            return "root"
        return directory.relative_to(root).as_posix()

    def _message(
        self,
        response_language: ResponseLanguage | None,
        zh_cn_message: str,
        en_message: str,
    ) -> str:
        if response_language == ResponseLanguage.ZH_CN:
            return zh_cn_message
        return en_message
