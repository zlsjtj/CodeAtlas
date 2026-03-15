from app.agents.code_assistant import CodeAssistantFinalOutput
from app.core.db import get_session_factory
from app.models.conversation_trace import ConversationTrace
from app.schemas.chat import ChatCitation
from app.services.chat_service import ChatService


def test_chat_ask_respects_response_language_and_persists_trace(client, tmp_path, monkeypatch):
    repository_dir = tmp_path / "chat-repo"
    repository_dir.mkdir()
    (repository_dir / "service.py").write_text(
        "\n".join(
            [
                "def request_index(repo_id: int):",
                "    return repo_id",
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

    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    async def fake_run_agent(self, *, user_input, run_context, model, response_language):
        assert response_language == "zh-CN"
        assert "Preferred response language: Simplified Chinese" in user_input
        run_context.tool_events.extend(
            [
                {
                    "tool_name": "search_repo",
                    "args_summary": "query=request_index, limit=8",
                    "item_count": 1,
                    "summary": "Found 1 indexed chunk matches for query 'request_index'.",
                },
                {
                    "tool_name": "read_file",
                    "args_summary": "path=service.py, start_line=1, end_line=2",
                    "item_count": 1,
                    "summary": "Read 2 lines from 'service.py'.",
                },
            ]
        )
        return (
            CodeAssistantFinalOutput(
                answer="## 结论\n`request_index` 当前是示例函数，定义在 `service.py`。\n\n## 依据\n函数直接返回传入的 `repo_id`。",
                citations=[
                    ChatCitation(
                        path="service.py",
                        start_line=1,
                        end_line=2,
                        symbol="request_index",
                        note="函数定义和返回逻辑都在这里。",
                        excerpt="def request_index(repo_id: int):\n    return repo_id",
                    )
                ],
            ),
            "CodeAssistant",
        )

    monkeypatch.setattr(ChatService, "_run_agent", fake_run_agent)

    ask_response = client.post(
        "/api/chat/ask",
        json={
            "repo_id": repo_id,
            "question": "request_index 这个入口做什么？",
            "response_language": "zh-CN",
        },
    )

    assert ask_response.status_code == 200
    payload = ask_response.json()
    assert "结论" in payload["answer"]
    assert payload["citations"][0]["path"] == "service.py"
    assert payload["trace_summary"]["tool_call_count"] == 2
    assert payload["trace_summary"]["steps"][0]["tool_name"] == "search_repo"

    session = get_session_factory()()
    try:
        traces = session.query(ConversationTrace).all()
        assert len(traces) == 1
        assert traces[0].repo_id == repo_id
        assert "request_index" in traces[0].final_answer
    finally:
        session.close()
