"""Describe the text that was read, without fetching or changing Git state."""

import hashlib
import os
import re
import shutil
import subprocess
from pathlib import Path
from urllib.parse import quote, urlparse

from app.schemas.tool import SourceProvenance

MAX_BLOB_BYTES = 8 * 1024 * 1024


def github_repository_url(remote: str) -> str | None:
    if remote.startswith("git@github.com:"):
        remote = "https://github.com/" + remote.removeprefix("git@github.com:")
    parsed = urlparse(remote)
    if (
        parsed.scheme != "https" or parsed.netloc != "github.com"
        or parsed.query or parsed.fragment
    ):
        return None
    parts = parsed.path.strip("/").removesuffix(".git").split("/")
    if len(parts) != 2:
        return None
    owner, repo = parts
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9-]*", owner):
        return None
    if not re.fullmatch(r"[A-Za-z0-9_.-]+", repo) or repo in {".", ".."}:
        return None
    return f"https://github.com/{owner}/{repo}"


def describe_source(root: Path, file_path: Path, content: str) -> SourceProvenance:
    result = SourceProvenance(
        content_sha256=hashlib.sha256(content.encode("utf-8")).hexdigest(),
        state="unknown",
    )
    executable = shutil.which("git")
    if not executable:
        return result
    env = {key: value for key, value in os.environ.items() if not key.upper().startswith("GIT_")}
    env.update({
        "GIT_CONFIG_GLOBAL": os.devnull, "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_TERMINAL_PROMPT": "0", "GIT_OPTIONAL_LOCKS": "0",
        "GIT_NO_LAZY_FETCH": "1", "GIT_NO_REPLACE_OBJECTS": "1",
    })

    def git(*args: str) -> subprocess.CompletedProcess:
        return subprocess.run(
            [executable, "--no-replace-objects", "-c", "core.quotePath=false",
             "-c", "core.fsmonitor=false", "-C", str(root), *args],
            env=env, capture_output=True, timeout=3, check=False,
        )

    try:
        top = git("rev-parse", "--show-toplevel")
        if top.returncode:
            # A missing checkout differs from Git being unable to inspect one.
            if not any((parent / ".git").exists() for parent in [root, *root.parents]):
                result.state = "local"
            return result
        git_root = Path(os.fsdecode(top.stdout.rstrip(b"\r\n"))).resolve()
        git_path = file_path.relative_to(git_root).as_posix()
        head = git("rev-parse", "--verify", "HEAD")
        revision = head.stdout.decode("ascii", errors="replace").strip()
        if head.returncode or not re.fullmatch(r"[0-9a-f]{40}|[0-9a-f]{64}", revision):
            return result
        result.revision = revision
        object_name = f"{revision}:{git_path}"
        size = git("cat-file", "-s", object_name)
        if size.returncode:
            result.state = "modified"
            return result
        if int(size.stdout) > MAX_BLOB_BYTES:
            return result
        blob = git("cat-file", "blob", object_name)
        if blob.returncode:
            return result
        # read_text uses universal newlines; compare the same text representation.
        committed_text = blob.stdout.decode("utf-8").replace("\r\n", "\n").replace("\r", "\n")
        if committed_text != content:
            result.state = "modified"
            return result
        result.state = "commit"
        remote = git("config", "--get", "remote.origin.url")
        url = github_repository_url(remote.stdout.decode("utf-8").strip()) if remote.returncode == 0 else None
        # GitHub anchors count LF lines; Python splitlines also accepts other separators.
        github_lines = not any(char in content for char in "\v\f\x1c\x1d\x1e\x85\u2028\u2029")
        if url and len(revision) == 40 and github_lines:
            result.file_url = f"{url}/blob/{revision}/{quote(git_path, safe='/')}"
    except (OSError, ValueError, UnicodeError, subprocess.TimeoutExpired):
        # Reading still works when version metadata cannot be established.
        pass
    return result
