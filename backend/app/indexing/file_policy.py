from pathlib import Path
from stat import FILE_ATTRIBUTE_REPARSE_POINT

from pathspec import GitIgnoreSpec


IGNORED_DIRECTORY_NAMES = {
    ".git", ".hg", ".svn", ".next", ".turbo", ".venv", ".pytest_cache",
    ".mypy_cache", ".ruff_cache", "__pycache__", "build", "coverage", "dist",
    "node_modules", "out", "target", "venv", ".ssh", ".aws", ".gnupg",
}
SENSITIVE_FILE_NAMES = {
    ".npmrc", ".pypirc", ".netrc", "id_rsa", "id_dsa", "id_ecdsa", "id_ed25519",
}
ENV_EXAMPLE_NAMES = {".env.example", ".env.sample", ".env.template"}
SENSITIVE_SUFFIXES = {".pem", ".key", ".p12", ".pfx"}


class RepositoryFilePolicy:
    """File access rules shared by indexing and repository tools.

    Create one instance per scan or request so edited ignore files take effect.
    """

    def __init__(self, root: Path):
        self.root = root.resolve()
        self._specs: dict[Path, GitIgnoreSpec | None] = {}

    def allows(self, path: Path) -> bool:
        try:
            relative = path.relative_to(self.root)
            if ".." in relative.parts:
                return False

            current = self.root
            rules: list[tuple[Path, GitIgnoreSpec]] = []
            for part in relative.parts:
                spec = self._load_ignore(current)
                if spec is None:
                    return False
                rules.append((current, spec))
                current = current / part
                attributes = getattr(current.lstat(), "st_file_attributes", 0)
                if current.is_symlink() or attributes & FILE_ATTRIBUTE_REPARSE_POINT:
                    return False
                if not current.exists():
                    return False

                is_directory = current.is_dir()
                name = current.name.lower()
                if ":" in name or name.endswith((".", " ")):
                    return False
                if is_directory and name in IGNORED_DIRECTORY_NAMES:
                    return False
                if name in SENSITIVE_FILE_NAMES or current.suffix.lower() in SENSITIVE_SUFFIXES:
                    return False
                if (name == ".env" or name.startswith(".env.")) and name not in ENV_EXAMPLE_NAMES:
                    return False

                ignored = False
                for base, rule in rules:
                    rule_path = current.relative_to(base).as_posix()
                    if is_directory:
                        rule_path += "/"
                    match = rule.check_file(rule_path).include
                    if match is not None:
                        ignored = match
                # Git cannot re-include a child of an excluded directory.
                if ignored:
                    return False
            return True
        except (OSError, ValueError):
            return False

    def _load_ignore(self, directory: Path) -> GitIgnoreSpec | None:
        if directory not in self._specs:
            ignore_file = directory / ".gitignore"
            try:
                if ignore_file.is_symlink():
                    self._specs[directory] = None
                else:
                    lines = ignore_file.read_text(encoding="utf-8-sig").splitlines()
                    self._specs[directory] = GitIgnoreSpec.from_lines(lines)
            except FileNotFoundError:
                self._specs[directory] = GitIgnoreSpec.from_lines([])
            except (OSError, UnicodeDecodeError, ValueError):
                # An unreadable rule file must not silently expose its subtree.
                self._specs[directory] = None
        return self._specs[directory]
