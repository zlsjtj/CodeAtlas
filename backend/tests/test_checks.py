import json


def test_check_profiles_and_run_pytest(client, tmp_path):
    repository_dir = tmp_path / "check-repo"
    backend_dir = repository_dir / "backend"
    tests_dir = backend_dir / "tests"
    tests_dir.mkdir(parents=True)
    (backend_dir / "pyproject.toml").write_text("[project]\nname='demo'\nversion='0.1.0'\n", encoding="utf-8")
    (tests_dir / "test_sample.py").write_text(
        "def test_truth():\n    assert 1 + 1 == 2\n",
        encoding="utf-8",
    )
    frontend_dir = repository_dir / "frontend"
    frontend_dir.mkdir()
    (frontend_dir / "package.json").write_text(
        json.dumps(
            {
                "name": "demo-frontend",
                "scripts": {
                    "typecheck": "echo typecheck",
                },
            }
        ),
        encoding="utf-8",
    )

    create_response = client.post(
        "/api/repositories",
        json={"source_type": "local", "root_path": str(repository_dir)},
    )
    repo_id = create_response.json()["id"]

    profiles_response = client.get(f"/api/checks/repositories/{repo_id}/profiles")
    assert profiles_response.status_code == 200
    payload = profiles_response.json()
    ids = {item["id"] for item in payload["items"]}
    assert "backend_pytest" in ids
    assert "frontend_npm-typecheck" in ids

    run_response = client.post(
        "/api/checks/run",
        json={"repo_id": repo_id, "profile_ids": ["backend_pytest"]},
    )
    assert run_response.status_code == 200
    run_payload = run_response.json()
    assert run_payload["status"] == "passed"
    assert run_payload["results"][0]["status"] == "passed"
    assert run_payload["results"][0]["command_preview"].endswith("-m pytest tests")


def test_checks_run_rejects_unknown_profile(client, tmp_path):
    repository_dir = tmp_path / "unknown-check-repo"
    repository_dir.mkdir()
    (repository_dir / "tests").mkdir()
    (repository_dir / "tests" / "test_sample.py").write_text(
        "def test_ok():\n    assert True\n",
        encoding="utf-8",
    )

    create_response = client.post(
        "/api/repositories",
        json={"source_type": "local", "root_path": str(repository_dir)},
    )
    repo_id = create_response.json()["id"]

    run_response = client.post(
        "/api/checks/run",
        json={
            "repo_id": repo_id,
            "profile_ids": ["missing_profile"],
            "response_language": "zh-CN",
        },
    )
    assert run_response.status_code == 400
    assert "存在未知的检查项 ID" in run_response.json()["detail"]


def test_checks_recommend_profiles_by_changed_path(client, tmp_path):
    repository_dir = tmp_path / "recommend-repo"
    backend_dir = repository_dir / "backend"
    tests_dir = backend_dir / "tests"
    tests_dir.mkdir(parents=True)
    (backend_dir / "pyproject.toml").write_text("[project]\nname='demo'\nversion='0.1.0'\n", encoding="utf-8")
    (tests_dir / "test_sample.py").write_text(
        "def test_truth():\n    assert 1 + 1 == 2\n",
        encoding="utf-8",
    )
    frontend_dir = repository_dir / "frontend"
    frontend_dir.mkdir()
    (frontend_dir / "package.json").write_text(
        json.dumps(
            {
                "name": "demo-frontend",
                "scripts": {
                    "typecheck": "echo typecheck",
                    "lint": "echo lint",
                },
            }
        ),
        encoding="utf-8",
    )

    create_response = client.post(
        "/api/repositories",
        json={"source_type": "local", "root_path": str(repository_dir)},
    )
    repo_id = create_response.json()["id"]

    recommend_response = client.post(
        "/api/checks/recommend",
        json={"repo_id": repo_id, "changed_paths": ["frontend/app/page.tsx"]},
    )
    assert recommend_response.status_code == 200
    payload = recommend_response.json()
    ids = [item["id"] for item in payload["items"]]
    assert payload["strategy"] == "matched"
    assert "frontend_npm-typecheck" in ids
    assert "frontend_npm-lint" in ids
    assert "backend_pytest" not in ids


def test_checks_respect_response_language(client, tmp_path):
    repository_dir = tmp_path / "localized-check-repo"
    backend_dir = repository_dir / "backend"
    tests_dir = backend_dir / "tests"
    tests_dir.mkdir(parents=True)
    (backend_dir / "pyproject.toml").write_text("[project]\nname='demo'\nversion='0.1.0'\n", encoding="utf-8")
    (tests_dir / "test_sample.py").write_text(
        "def test_truth():\n    assert True\n",
        encoding="utf-8",
    )
    frontend_dir = repository_dir / "frontend"
    frontend_dir.mkdir()
    (frontend_dir / "package.json").write_text(
        json.dumps(
            {
                "name": "demo-frontend",
                "scripts": {
                    "typecheck": "echo typecheck",
                    "lint": "echo lint",
                },
            }
        ),
        encoding="utf-8",
    )

    create_response = client.post(
        "/api/repositories",
        json={"source_type": "local", "root_path": str(repository_dir)},
    )
    repo_id = create_response.json()["id"]

    recommend_response = client.post(
        "/api/checks/recommend",
        json={
            "repo_id": repo_id,
            "changed_paths": ["frontend/app/page.tsx"],
            "response_language": "zh-CN",
        },
    )
    assert recommend_response.status_code == 200
    recommend_payload = recommend_response.json()
    assert recommend_payload["summary"] == "已根据 1 个变更路径推荐 2 项检查。"
    assert any("前端文件改动通常应该运行 npm 检查。" in item["reason"] for item in recommend_payload["items"])

    run_response = client.post(
        "/api/checks/run",
        json={
            "repo_id": repo_id,
            "profile_ids": ["backend_pytest"],
            "response_language": "zh-CN",
        },
    )
    assert run_response.status_code == 200
    run_payload = run_response.json()
    assert run_payload["status"] == "passed"
    assert run_payload["summary"] == "已完成 1 项检查，全部通过。"
