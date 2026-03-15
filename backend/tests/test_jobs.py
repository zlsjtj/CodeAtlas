from app.services.job_service import JobService


def test_create_index_job_and_query_status(client, tmp_path, monkeypatch):
    repository_dir = tmp_path / "job-repo"
    repository_dir.mkdir()
    (repository_dir / "main.py").write_text("print('hello')\n", encoding="utf-8")

    create_response = client.post(
        "/api/repositories",
        json={"source_type": "local", "root_path": str(repository_dir)},
    )
    repo_id = create_response.json()["id"]

    def run_inline(self, job_id, response_language):
        self._run_repository_index_job(job_id, response_language)

    monkeypatch.setattr(JobService, "_submit_job", run_inline)

    job_response = client.post(
        f"/api/repositories/{repo_id}/index-jobs",
        headers={"X-Response-Language": "zh-CN"},
    )
    assert job_response.status_code == 202
    payload = job_response.json()
    assert payload["job_type"] == "repository_index"
    assert payload["status"] == "queued"

    get_response = client.get(f"/api/jobs/{payload['id']}")
    assert get_response.status_code == 200
    fetched = get_response.json()
    assert fetched["status"] == "succeeded"
    assert fetched["file_count"] == 1
    assert fetched["chunk_count"] >= 1
