def test_search_read_and_find_symbol_tools(client, tmp_path):
    repository_dir = tmp_path / "tool-repo"
    (repository_dir / "src").mkdir(parents=True)
    (repository_dir / "src" / "service.py").write_text(
        "\n".join(
            [
                "class DemoService:",
                "    def __init__(self):",
                "        self.name = 'demo'",
                "",
                "    def fetch_user(self, user_id: int):",
                "        return {'id': user_id, 'name': self.name}",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    (repository_dir / "src" / "helper.ts").write_text(
        "\n".join(
            [
                "export interface UserDto {",
                "  id: number;",
                "}",
                "",
                "export function buildGreeting(name: string) {",
                "  return `hello ${name}`;",
                "}",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    create_response = client.post(
        "/api/repositories",
        json={"source_type": "local", "root_path": str(repository_dir)},
    )
    repo_id = create_response.json()["id"]

    index_response = client.post(f"/api/repositories/{repo_id}/index")
    assert index_response.status_code == 200

    tree_response = client.post("/api/tools/list-tree", json={"repo_id": repo_id, "depth": 2})
    assert tree_response.status_code == 200
    tree_payload = tree_response.json()
    assert tree_payload["tool_name"] == "list_repo_tree"
    assert any(item["path"] == "src/service.py" for item in tree_payload["items"])

    search_response = client.post(
        "/api/tools/search",
        json={"repo_id": repo_id, "query": "fetch_user", "limit": 5},
    )
    assert search_response.status_code == 200
    search_payload = search_response.json()
    assert search_payload["tool_name"] == "search_repo"
    assert search_payload["items"][0]["path"] == "src/service.py"
    assert "fetch_user" in search_payload["items"][0]["content"]

    read_response = client.post(
        "/api/tools/read",
        json={"repo_id": repo_id, "path": "src/service.py", "start_line": 1, "end_line": 6},
    )
    assert read_response.status_code == 200
    read_payload = read_response.json()
    assert read_payload["tool_name"] == "read_file"
    assert read_payload["items"][0]["start_line"] == 1
    assert "DemoService" in read_payload["items"][0]["content"]

    symbol_response = client.post(
        "/api/tools/find-symbol",
        json={"repo_id": repo_id, "name": "buildGreeting"},
    )
    assert symbol_response.status_code == 200
    symbol_payload = symbol_response.json()
    assert symbol_payload["tool_name"] == "find_symbol"
    assert symbol_payload["items"][0]["symbol"] == "buildGreeting"
    assert symbol_payload["items"][0]["symbol_type"] == "function"
    assert symbol_payload["items"][0]["path"] == "src/helper.ts"


def test_read_file_limits_range_size(client, tmp_path):
    repository_dir = tmp_path / "limits-repo"
    repository_dir.mkdir()
    (repository_dir / "long.py").write_text(
        "\n".join(f"line_{index} = {index}" for index in range(250)) + "\n",
        encoding="utf-8",
    )

    create_response = client.post(
        "/api/repositories",
        json={"source_type": "local", "root_path": str(repository_dir)},
    )
    repo_id = create_response.json()["id"]

    too_large_response = client.post(
        "/api/tools/read",
        json={
            "repo_id": repo_id,
            "path": "long.py",
            "start_line": 1,
            "end_line": 220,
            "response_language": "zh-CN",
        },
    )
    assert too_large_response.status_code == 400
    assert "单次最多返回 200 行" in too_large_response.json()["detail"]


def test_tools_respect_language_header(client, tmp_path):
    repository_dir = tmp_path / "localized-tool-repo"
    (repository_dir / "src").mkdir(parents=True)
    (repository_dir / "src" / "service.py").write_text(
        "\n".join(
            [
                "def fetch_user(user_id: int):",
                "    return {'id': user_id}",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    create_response = client.post(
        "/api/repositories",
        json={"source_type": "local", "root_path": str(repository_dir)},
    )
    repo_id = create_response.json()["id"]
    index_response = client.post(f"/api/repositories/{repo_id}/index")
    assert index_response.status_code == 200

    search_response = client.post(
        "/api/tools/search",
        json={"repo_id": repo_id, "query": "fetch_user", "limit": 5},
        headers={"X-Response-Language": "zh-CN"},
    )
    assert search_response.status_code == 200
    assert "找到了 1 个索引片段匹配项" in search_response.json()["summary"]

    read_response = client.post(
        "/api/tools/read",
        json={"repo_id": repo_id, "path": "src/service.py", "start_line": 1, "end_line": 2},
        headers={"X-Response-Language": "zh-CN"},
    )
    assert read_response.status_code == 200
    assert read_response.json()["summary"] == "已从 'src/service.py' 读取 2 行。"
