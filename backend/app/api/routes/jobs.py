from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.schemas.jobs import JobRunRead
from app.services.job_service import JobService

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/{job_id}", response_model=JobRunRead)
def get_job(job_id: int, db: Session = Depends(get_db)) -> JobRunRead:
    service = JobService(db)
    return service.get_job(job_id)
