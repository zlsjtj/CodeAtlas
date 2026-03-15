from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.language import get_response_language
from app.core.db import get_db
from app.schemas.common import ResponseLanguage
from app.schemas.chat import ChatAskRequest, ChatAskResponse
from app.services.chat_service import ChatService

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/ask", response_model=ChatAskResponse)
async def ask_repository_question(
    payload: ChatAskRequest,
    db: Session = Depends(get_db),
    response_language: ResponseLanguage | None = Depends(get_response_language),
) -> ChatAskResponse:
    service = ChatService(db)
    if payload.response_language is None:
        payload.response_language = response_language
    return await service.ask(payload)
