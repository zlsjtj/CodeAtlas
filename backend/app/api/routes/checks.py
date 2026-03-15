from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.language import get_response_language
from app.core.db import get_db
from app.schemas.common import ResponseLanguage
from app.schemas.checks import (
    CheckProfileListResponse,
    CheckRecommendationRequest,
    CheckRecommendationResponse,
    CheckRunRequest,
    CheckRunResponse,
)
from app.services.checks_service import CheckService

router = APIRouter(prefix="/checks", tags=["checks"])


@router.get("/repositories/{repo_id}/profiles", response_model=CheckProfileListResponse)
def list_check_profiles(
    repo_id: int,
    db: Session = Depends(get_db),
    response_language: ResponseLanguage | None = Depends(get_response_language),
) -> CheckProfileListResponse:
    service = CheckService(db)
    return service.list_profiles(repo_id, response_language)


@router.post("/recommend", response_model=CheckRecommendationResponse)
def recommend_checks(
    payload: CheckRecommendationRequest,
    db: Session = Depends(get_db),
    response_language: ResponseLanguage | None = Depends(get_response_language),
) -> CheckRecommendationResponse:
    service = CheckService(db)
    if payload.response_language is None:
        payload.response_language = response_language
    return service.recommend_profiles(payload)


@router.post("/run", response_model=CheckRunResponse)
def run_checks(
    payload: CheckRunRequest,
    db: Session = Depends(get_db),
    response_language: ResponseLanguage | None = Depends(get_response_language),
) -> CheckRunResponse:
    service = CheckService(db)
    if payload.response_language is None:
        payload.response_language = response_language
    return service.run_checks(payload)
