from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.language import get_response_language
from app.core.db import get_db
from app.schemas.common import ResponseLanguage
from app.schemas.patch import (
    PatchApplyAndCheckRequest,
    PatchApplyAndCheckResponse,
    PatchApplyRequest,
    PatchApplyResponse,
    PatchBatchApplyAndCheckRequest,
    PatchBatchApplyAndCheckResponse,
    PatchBatchApplyRequest,
    PatchBatchApplyResponse,
    PatchBatchDraftRequest,
    PatchBatchDraftResponse,
    PatchDraftRequest,
    PatchDraftResponse,
)
from app.services.patch_service import PatchConfigurationError, PatchConflictError, PatchService
from app.services.repository_service import RepositoryValidationError

router = APIRouter(prefix="/patches", tags=["patches"])


@router.post("/draft", response_model=PatchDraftResponse)
async def draft_patch(
    payload: PatchDraftRequest,
    db: Session = Depends(get_db),
    response_language: ResponseLanguage | None = Depends(get_response_language),
) -> PatchDraftResponse:
    service = PatchService(db)
    try:
        return await service.draft_patch(payload, response_language)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except (RepositoryValidationError, PatchConfigurationError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/draft-batch", response_model=PatchBatchDraftResponse)
async def draft_patch_batch(
    payload: PatchBatchDraftRequest,
    db: Session = Depends(get_db),
    response_language: ResponseLanguage | None = Depends(get_response_language),
) -> PatchBatchDraftResponse:
    service = PatchService(db)
    try:
        return await service.draft_patch_batch(payload, response_language)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except (RepositoryValidationError, PatchConfigurationError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/apply", response_model=PatchApplyResponse)
def apply_patch(
    payload: PatchApplyRequest,
    db: Session = Depends(get_db),
    response_language: ResponseLanguage | None = Depends(get_response_language),
) -> PatchApplyResponse:
    service = PatchService(db)
    try:
        return service.apply_patch(payload, response_language)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PatchConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except (RepositoryValidationError, PatchConfigurationError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/apply-batch", response_model=PatchBatchApplyResponse)
def apply_patch_batch(
    payload: PatchBatchApplyRequest,
    db: Session = Depends(get_db),
    response_language: ResponseLanguage | None = Depends(get_response_language),
) -> PatchBatchApplyResponse:
    service = PatchService(db)
    try:
        return service.apply_patch_batch(payload, response_language)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PatchConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except (RepositoryValidationError, PatchConfigurationError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/apply-and-checks", response_model=PatchApplyAndCheckResponse)
def apply_patch_and_run_checks(
    payload: PatchApplyAndCheckRequest,
    db: Session = Depends(get_db),
    response_language: ResponseLanguage | None = Depends(get_response_language),
) -> PatchApplyAndCheckResponse:
    service = PatchService(db)
    try:
        return service.apply_patch_and_run_checks(payload, response_language)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PatchConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except (RepositoryValidationError, PatchConfigurationError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/apply-batch-and-checks", response_model=PatchBatchApplyAndCheckResponse)
def apply_patch_batch_and_run_checks(
    payload: PatchBatchApplyAndCheckRequest,
    db: Session = Depends(get_db),
    response_language: ResponseLanguage | None = Depends(get_response_language),
) -> PatchBatchApplyAndCheckResponse:
    service = PatchService(db)
    try:
        return service.apply_patch_batch_and_run_checks(payload, response_language)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PatchConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except (RepositoryValidationError, PatchConfigurationError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
