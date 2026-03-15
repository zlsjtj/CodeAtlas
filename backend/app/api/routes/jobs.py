from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.schemas.jobs import JobRunListResponse, JobRunRead
from app.services.job_service import JobService

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=JobRunListResponse)
def list_jobs(
    repo_id: int | None = Query(default=None),
    limit: int = Query(default=12, ge=1, le=50),
    db: Session = Depends(get_db),
) -> JobRunListResponse:
    service = JobService(db)
    return service.list_jobs(repo_id=repo_id, limit=limit)


@router.get("/{job_id}", response_model=JobRunRead)
def get_job(job_id: int, db: Session = Depends(get_db)) -> JobRunRead:
    service = JobService(db)
    return service.get_job(job_id)
