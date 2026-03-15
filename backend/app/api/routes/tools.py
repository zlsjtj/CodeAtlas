from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.language import get_response_language
from app.core.db import get_db
from app.schemas.common import ResponseLanguage
from app.schemas.tool import (
    FindSymbolRequest,
    ListRepoTreeRequest,
    ReadFileRequest,
    SearchRepoRequest,
    ToolExecutionResponse,
)
from app.services.repository_service import RepositoryValidationError
from app.tools.repository_tools import RepositoryTools

router = APIRouter(prefix="/tools", tags=["tools"])


@router.post("/list-tree", response_model=ToolExecutionResponse)
def list_repo_tree(
    payload: ListRepoTreeRequest,
    db: Session = Depends(get_db),
    response_language: ResponseLanguage | None = Depends(get_response_language),
) -> ToolExecutionResponse:
    tools = RepositoryTools(db)
    try:
        if payload.response_language is None:
            payload.response_language = response_language
        return tools.list_repo_tree(payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except (RepositoryValidationError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/search", response_model=ToolExecutionResponse)
def search_repo(
    payload: SearchRepoRequest,
    db: Session = Depends(get_db),
    response_language: ResponseLanguage | None = Depends(get_response_language),
) -> ToolExecutionResponse:
    tools = RepositoryTools(db)
    try:
        if payload.response_language is None:
            payload.response_language = response_language
        return tools.search_repo(payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except (RepositoryValidationError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/read", response_model=ToolExecutionResponse)
def read_file(
    payload: ReadFileRequest,
    db: Session = Depends(get_db),
    response_language: ResponseLanguage | None = Depends(get_response_language),
) -> ToolExecutionResponse:
    tools = RepositoryTools(db)
    try:
        if payload.response_language is None:
            payload.response_language = response_language
        return tools.read_file(payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except (RepositoryValidationError, ValueError, UnicodeDecodeError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/find-symbol", response_model=ToolExecutionResponse)
def find_symbol(
    payload: FindSymbolRequest,
    db: Session = Depends(get_db),
    response_language: ResponseLanguage | None = Depends(get_response_language),
) -> ToolExecutionResponse:
    tools = RepositoryTools(db)
    try:
        if payload.response_language is None:
            payload.response_language = response_language
        return tools.find_symbol(payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except (RepositoryValidationError, ValueError, UnicodeDecodeError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
