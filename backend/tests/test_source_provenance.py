import hashlib
import os
import shutil
import subprocess
from pathlib import Path

import pytest

from app.services import source_provenance


def git(root: Path, *args: str) -> str:
    env = {key: value for key, value in os.environ.items() if not key.upper().startswith("GIT_")}
    env.update({"GIT_CONFIG_GLOBAL": os.devnull, "GIT_CONFIG_NOSYSTEM": "1"})
    return subprocess.check_output(
        ["git", "-c", "user.name=Test", "-c", "user.email=test@example.invalid",
         "-c", "commit.gpgSign=false", "-c", "core.autocrlf=false", "-C", str(root), *args],
        env=env, text=True, encoding="utf-8",
    ).strip()


@pytest.fixture
def checkout(tmp_path):
    if not shutil.which("git"):
        pytest.skip("Git is required for source provenance tests")
    root = tmp_path / "repo"
    root.mkdir()
    git(root, "init")
    (root / "src").mkdir()
    (root / "src" / "a #.py").write_text("def greet():\n    return 'hello'\n", encoding="utf-8")
    git(root, "add", ".")
    git(root, "commit", "-m", "fixture")
    git(root, "remote", "add", "origin", "https://github.com/example/reading.git")
    return root


def read(client, root, relative="src/a #.py", **kwargs):
    repo = client.post("/api/repositories", json={"source_type": "local", "root_path": str(root)}).json()
    return client.post("/api/tools/read", json={
        "repo_id": repo["id"], "path": relative, "include_provenance": True, **kwargs,
    })


def test_commit_link_uses_the_git_root_and_the_text_read(client, checkout):
    response = read(client, checkout / "src", "a #.py")
    assert response.status_code == 200
    item = response.json()["items"][0]
    info = item["provenance"]
    revision = git(checkout, "rev-parse", "HEAD")
    assert info["state"] == "commit"
    assert info["revision"] == revision
    assert info["file_url"] == f"https://github.com/example/reading/blob/{revision}/src/a%20%23.py"
    text = (checkout / "src" / "a #.py").read_text(encoding="utf-8")
    assert info["content_sha256"] == hashlib.sha256(text.encode()).hexdigest()
    assert str(checkout) not in str(info)


@pytest.mark.parametrize("staged", [False, True])
def test_modified_files_never_get_a_commit_link(client, checkout, staged):
    (checkout / "src" / "a #.py").write_text("changed = True\n", encoding="utf-8")
    if staged:
        git(checkout, "add", ".")
    info = read(client, checkout).json()["items"][0]["provenance"]
    assert info["state"] == "modified"
    assert info["revision"] == git(checkout, "rev-parse", "HEAD")
    assert info["file_url"] is None


def test_untracked_and_non_git_sources_are_not_pinned(client, checkout, tmp_path):
    (checkout / "new.py").write_text("value = 1\n", encoding="utf-8")
    info = read(client, checkout, "new.py").json()["items"][0]["provenance"]
    assert info["state"] == "modified"
    assert info["file_url"] is None
    local = tmp_path / "local"
    local.mkdir()
    (local / "main.py").write_text("value = 2\n", encoding="utf-8")
    info = read(client, local, "main.py").json()["items"][0]["provenance"]
    assert info["state"] == "local"
    assert info["revision"] is None


def test_crlf_and_unrelated_changes_do_not_invalidate_this_file(client, checkout):
    file = checkout / "src" / "a #.py"
    file.write_bytes(file.read_text(encoding="utf-8").encode("utf-8").replace(b"\n", b"\r\n"))
    (checkout / "other.py").write_text("other = True\n", encoding="utf-8")
    assert read(client, checkout).json()["items"][0]["provenance"]["state"] == "commit"


def test_credentials_and_non_github_remotes_are_not_exposed(client, checkout):
    git(checkout, "remote", "set-url", "origin", "https://token:do-not-export@github.com/example/reading.git")
    result = read(client, checkout).json()
    assert "do-not-export" not in str(result)
    assert result["items"][0]["provenance"]["file_url"] is None
    assert source_provenance.github_repository_url("git@github.com:example/reading.git") == "https://github.com/example/reading"
    assert source_provenance.github_repository_url("https://github.com.evil.test/example/reading") is None
    assert source_provenance.github_repository_url("https://github.com/example/reading?token=secret") is None


def test_metadata_failure_preserves_reading_and_opt_in(client, checkout, monkeypatch):
    def timeout(*args, **kwargs):
        raise subprocess.TimeoutExpired("git", 3)
    monkeypatch.setattr(source_provenance.subprocess, "run", timeout)
    info = read(client, checkout).json()["items"][0]["provenance"]
    assert info["state"] == "unknown"
    assert info["file_url"] is None
    response = read(client, checkout, include_provenance=False)
    assert response.status_code == 200
    assert response.json()["items"][0]["provenance"] is None


def test_access_policy_and_read_limit_still_apply(client, checkout):
    (checkout / ".env").write_text("SECRET=hidden\n", encoding="utf-8")
    assert read(client, checkout, ".env").status_code == 400
    assert read(client, checkout, "../outside.py").status_code == 400
    assert read(client, checkout, end_line=201).status_code == 400


def test_git_replacement_objects_cannot_create_a_false_permalink(client, checkout):
    original = git(checkout, "rev-parse", "HEAD:src/a #.py")
    (checkout / "src" / "a #.py").write_text("replacement = True\n", encoding="utf-8")
    replacement = git(checkout, "hash-object", "-w", "src/a #.py")
    git(checkout, "replace", original, replacement)
    info = read(client, checkout).json()["items"][0]["provenance"]
    assert info["state"] == "modified"
    assert info["file_url"] is None


def test_non_lf_line_separators_do_not_generate_misaligned_links(client, checkout):
    (checkout / "src" / "a #.py").write_text("one\u2028two\n", encoding="utf-8")
    git(checkout, "add", ".")
    git(checkout, "commit", "-m", "line separator fixture")
    info = read(client, checkout).json()["items"][0]["provenance"]
    assert info["state"] == "commit"
    assert info["file_url"] is None
