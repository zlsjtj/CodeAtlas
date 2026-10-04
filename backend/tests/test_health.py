def test_health_check(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_meta_does_not_require_model_configuration(client, monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = client.get("/api/meta")
    assert response.status_code == 200
    assert response.json()["model_configured"] is False


def test_meta_reports_configuration_without_returning_secrets(client, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-secret-not-a-real-key")
    response = client.get("/api/meta")
    assert response.json()["model_configured"] is True
    assert "test-secret-not-a-real-key" not in response.text
    monkeypatch.setenv("OPENAI_API_KEY", "   ")
    assert client.get("/api/meta").json()["model_configured"] is False
