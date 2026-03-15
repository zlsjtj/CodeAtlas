def test_list_jobs_returns_recent_items(client, tmp_path):
    first_repo = tmp_path / "jobs-first"
    second_repo = tmp_path / "jobs-second"
    first_repo.mkdir()
    second_repo.mkdir()

    first_response = client.post(
        "/api/repositories",
        json={"source_type": "local", "root_path": str(first_repo)},
    )
    second_response = client.post(
        "/api/repositories",
        json={"source_type": "local", "root_path": str(second_repo)},
    )

    first_id = first_response.json()["id"]
    second_id = second_response.json()["id"]

    client.post(f"/api/repositories/{first_id}/index-jobs")
    client.post(f"/api/repositories/{second_id}/index-jobs")

    list_response = client.get("/api/jobs?limit=5")
    assert list_response.status_code == 200
    items = list_response.json()["items"]
    assert len(items) >= 2
    assert items[0]["repo_id"] in {first_id, second_id}

    filtered_response = client.get(f"/api/jobs?repo_id={first_id}&limit=5")
    assert filtered_response.status_code == 200
    filtered_items = filtered_response.json()["items"]
    assert filtered_items
    assert all(item["repo_id"] == first_id for item in filtered_items)
