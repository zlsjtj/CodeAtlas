import hashlib

import pytest

from app.core.db import get_session_factory
from app.models.file_chunk import FileChunk


@pytest.fixture
def access_repo(client, tmp_path):
    root = tmp_path / "access-repo"
    root.mkdir()
    files = {
        ".gitignore": "*.log\n!keep.log\n/private/\n!private/keep.py\n*.generated.py\n",
        "public.py": "def public_symbol():\n    return 'visible'\n",
        "debug.log": "excluded-marker\n",
        "keep.log": "visible\n",
        "private/keep.py": "def hidden_symbol():\n    return 'excluded-marker'\n",
        "nested/.gitignore": "!keep.generated.py\n/local.py\n",
        "nested/drop.generated.py": "excluded-marker\n",
        "nested/keep.generated.py": "visible\n",
        "nested/local.py": "excluded-marker\n",
        "nested/deeper/local.py": "visible\n",
        "nested/private/visible.py": "visible\n",
        ".env": "TOKEN=excluded-marker\n",
        "nested/.env.local": "TOKEN=excluded-marker\n",
        ".env.example": "TOKEN=\n",
        "nested/.env.sample": "TOKEN=\n",
        "server.pem": "excluded-marker\n",
        "server.key": "excluded-marker\n",
        "id_ed25519": "excluded-marker\n",
        ".npmrc": "excluded-marker\n",
        ".aws/credentials": "excluded-marker\n",
        "node_modules/module.py": "excluded-marker\n",
    }
    for name, content in files.items():
        path = root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    response = client.post(
        "/api/repositories", json={"source_type": "local", "root_path": str(root)}
    )
    assert response.status_code == 201
    return root, response.json()["id"]


def tree_paths(nodes):
    return {
        path
        for node in nodes
        for path in [node["path"], *tree_paths(node.get("children", []))]
    }


def test_index_and_tree_share_nested_ignore_rules(client, access_repo):
    root, repo_id = access_repo
    indexed = client.post(f"/api/repositories/{repo_id}/index")
    assert indexed.status_code == 200
    expected = {
        ".gitignore", "public.py", "keep.log", ".env.example", "nested/.gitignore",
        "nested/keep.generated.py", "nested/deeper/local.py",
        "nested/private/visible.py", "nested/.env.sample",
    }
    chunks = client.get(f"/api/repositories/{repo_id}/chunks", params={"limit": 200})
    assert {item["path"] for item in chunks.json()["items"]} == expected
    assert indexed.json()["file_count"] == len(expected)

    response = client.get(f"/api/repositories/{repo_id}/tree", params={"depth": 8})
    paths = tree_paths(response.json()["nodes"])
    assert paths == expected | {"nested", "nested/deeper", "nested/private"}
    tool_tree = client.post("/api/tools/list-tree", json={"repo_id": repo_id, "depth": 8})
    assert {item["path"] for item in tool_tree.json()["items"]} == paths

    # An excluded parent cannot be reopened with a child exception.
    assert client.get(f"/api/repositories/{repo_id}/tree", params={"path": "private"}).status_code == 400


@pytest.mark.parametrize("path", [
    ".env", "nested/.env.local", "server.pem", "server.key", "id_ed25519", ".npmrc",
    ".aws/credentials", "private/keep.py", "debug.log", "nested/local.py",
    "node_modules/module.py",
])
def test_direct_read_cannot_bypass_exclusions(client, access_repo, path):
    _, repo_id = access_repo
    response = client.post("/api/tools/read", json={"repo_id": repo_id, "path": path})
    assert response.status_code == 400
    assert "excluded" in response.json()["detail"].lower()
    assert "excluded-marker" not in response.text


def test_examples_and_gitignore_exceptions_remain_readable(client, access_repo):
    _, repo_id = access_repo
    for path in (".env.example", "nested/.env.sample", "keep.log", "nested/keep.generated.py"):
        response = client.post("/api/tools/read", json={"repo_id": repo_id, "path": path})
        assert response.status_code == 200
        assert response.json()["items"][0]["path"] == path


def test_gitignore_exceptions_do_not_override_sensitive_defaults(client, access_repo):
    root, repo_id = access_repo
    (root / ".gitignore").write_text("!.env\n!server.key\n!.aws/\n", encoding="utf-8")
    for path in (".env", "server.key", ".aws/credentials"):
        response = client.post("/api/tools/read", json={"repo_id": repo_id, "path": path})
        assert response.status_code == 400
    (root / ".gitignore").write_text(".env*\n", encoding="utf-8")
    assert client.post("/api/tools/read", json={"repo_id": repo_id, "path": ".env.example"}).status_code == 400


def test_unreadable_ignore_file_does_not_expose_subtree(client, access_repo):
    root, repo_id = access_repo
    (root / "nested/.gitignore").write_bytes(b"\xff\xfe\xff")
    assert client.post(f"/api/repositories/{repo_id}/index").status_code == 200
    chunks = client.get(f"/api/repositories/{repo_id}/chunks", params={"limit": 200})
    assert not any(item["path"].startswith("nested/") for item in chunks.json()["items"])
    assert client.post("/api/tools/read", json={"repo_id": repo_id, "path": "nested/keep.generated.py"}).status_code == 400
    assert client.post("/api/tools/read", json={"repo_id": repo_id, "path": "public.py"}).status_code == 200


def test_excluded_chunks_do_not_consume_result_limit(client, access_repo):
    _, repo_id = access_repo
    with get_session_factory()() as db:
        for index in range(210):
            db.add(FileChunk(
                repo_id=repo_id, path=".env", chunk_index=index,
                start_line=index + 1, end_line=index + 1, text="limit-marker", hash=str(index),
            ))
        db.add(FileChunk(
            repo_id=repo_id, path="public.py", chunk_index=0,
            start_line=1, end_line=1, text="limit-marker", hash="visible",
        ))
        db.commit()
    search = client.post("/api/tools/search", json={"repo_id": repo_id, "query": "limit-marker", "limit": 1})
    assert search.status_code == 200
    assert [item["path"] for item in search.json()["items"]] == ["public.py"]
    chunks = client.get(f"/api/repositories/{repo_id}/chunks", params={"limit": 1})
    assert [item["path"] for item in chunks.json()["items"]] == ["public.py"]


def test_new_rules_hide_previously_indexed_content(client, access_repo):
    root, repo_id = access_repo
    (root / "later.py").write_text("def later_symbol():\n    return 'old-index-marker'\n", encoding="utf-8")
    assert client.post(f"/api/repositories/{repo_id}/index").status_code == 200
    (root / ".gitignore").write_text("later.py\n", encoding="utf-8")
    search = client.post("/api/tools/search", json={"repo_id": repo_id, "query": "old-index-marker"})
    assert search.status_code == 200
    assert search.json()["items"] == []
    assert search.json()["total_matches"] == 0
    symbols = client.post("/api/tools/find-symbol", json={"repo_id": repo_id, "name": "later_symbol"})
    assert symbols.status_code == 200
    assert symbols.json()["items"] == []
    for params in ({"path": "later.py"}, {"limit": 200}):
        chunks = client.get(f"/api/repositories/{repo_id}/chunks", params=params)
        assert all(item["path"] != "later.py" for item in chunks.json()["items"])
    (root / ".gitignore").write_text("!later.py\n", encoding="utf-8")
    search = client.post("/api/tools/search", json={"repo_id": repo_id, "query": "old-index-marker"})
    assert [item["path"] for item in search.json()["items"]] == ["later.py"]


def test_legacy_secret_chunks_are_hidden_and_removed_by_reindex(client, access_repo):
    _, repo_id = access_repo
    with get_session_factory()() as db:
        db.add(FileChunk(
            repo_id=repo_id, path=".env", language=None, chunk_index=0,
            start_line=1, end_line=1, text="legacy-secret-marker", hash="legacy",
        ))
        db.commit()
    assert client.post("/api/tools/search", json={"repo_id": repo_id, "query": "legacy-secret-marker"}).json()["items"] == []
    assert client.get(f"/api/repositories/{repo_id}/chunks").json()["items"] == []
    assert client.post(f"/api/repositories/{repo_id}/index").status_code == 200
    with get_session_factory()() as db:
        assert db.query(FileChunk).filter_by(repo_id=repo_id, path=".env").count() == 0


def test_patch_read_and_apply_respect_exclusions(client, access_repo, monkeypatch):
    root, repo_id = access_repo
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    from app.services.patch_service import PatchService

    async def unexpected_model_call(*args, **kwargs):
        raise AssertionError("Excluded files must be rejected before reaching the model")

    monkeypatch.setattr(PatchService, "_run_agent", unexpected_model_call)
    response = client.post("/api/patches/draft", json={
        "repo_id": repo_id, "target_path": ".env", "instruction": "Read this file",
    })
    assert response.status_code == 400
    original = (root / ".env").read_text(encoding="utf-8")
    response = client.post("/api/patches/apply", json={
        "repo_id": repo_id, "target_path": ".env",
        "expected_base_sha256": hashlib.sha256(original.encode()).hexdigest(),
        "proposed_content": "TOKEN=changed\n",
    })
    assert response.status_code == 400
    assert (root / ".env").read_text(encoding="utf-8") == original


def test_symlinks_do_not_bypass_exclusions(client, access_repo, tmp_path):
    root, repo_id = access_repo
    external = tmp_path / "outside.py"
    external.write_text("def external_symbol():\n    return 'external-marker'\n", encoding="utf-8")
    try:
        (root / "alias.txt").symlink_to(root / ".env")
        (root / "outside.py").symlink_to(external)
        (root / "private-alias").symlink_to(root / "private", target_is_directory=True)
    except OSError:
        pytest.skip("Creating symlinks requires OS support or privileges")

    assert client.post(f"/api/repositories/{repo_id}/index").status_code == 200
    for path in ("alias.txt", "outside.py", "private-alias/keep.py"):
        assert client.post("/api/tools/read", json={"repo_id": repo_id, "path": path}).status_code == 400
    paths = tree_paths(client.get(f"/api/repositories/{repo_id}/tree", params={"depth": 8}).json()["nodes"])
    assert not {"alias.txt", "outside.py", "private-alias"} & paths
    assert client.post("/api/tools/find-symbol", json={"repo_id": repo_id, "name": "external_symbol"}).json()["items"] == []
