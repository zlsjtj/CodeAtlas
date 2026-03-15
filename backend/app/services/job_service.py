from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor

from sqlalchemy.orm import Session

from app.core.db import get_session_factory, utc_now
from app.models.job_run import JobRun
from app.schemas.common import ResponseLanguage
from app.schemas.jobs import JobRunRead
from app.services.indexing_service import IndexingService
from app.services.repository_service import RepositoryService

logger = logging.getLogger(__name__)


class JobService:
    _executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="code-agent-jobs")

    def __init__(self, db: Session):
        self.db = db
        self.repository_service = RepositoryService(db)

    def enqueue_repository_index_job(
        self,
        repo_id: int,
        response_language: ResponseLanguage | None = None,
    ) -> JobRunRead:
        repository = self.repository_service.get_repository(repo_id, response_language)
        job = JobRun(
            repo_id=repository.id,
            job_type="repository_index",
            status="queued",
            message=self._localized_message(
                response_language,
                "索引任务已进入队列。",
                "Index job queued.",
            ),
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        self._submit_job(job.id, response_language)
        return JobRunRead.model_validate(job)

    def get_job(self, job_id: int) -> JobRunRead:
        job = self.db.get(JobRun, job_id)
        if job is None:
            raise LookupError(f"Job {job_id} was not found.")
        return JobRunRead.model_validate(job)

    def _submit_job(self, job_id: int, response_language: ResponseLanguage | None) -> None:
        self._executor.submit(self._run_repository_index_job, job_id, response_language)

    def _run_repository_index_job(
        self,
        job_id: int,
        response_language: ResponseLanguage | None,
    ) -> None:
        session = get_session_factory()()
        try:
            job = session.get(JobRun, job_id)
            if job is None:
                logger.warning("jobs.missing job_id=%s", job_id)
                return

            repository_service = RepositoryService(session)
            indexing_service = IndexingService(session)

            job.status = "running"
            job.started_at = utc_now()
            job.message = self._localized_message(
                response_language,
                "索引任务正在执行。",
                "Index job is running.",
            )
            session.add(job)
            session.commit()
            session.refresh(job)

            repository = repository_service.get_repository(job.repo_id, response_language)
            result = indexing_service.request_index(repository, response_language)

            job.status = "succeeded"
            job.message = result.message
            job.file_count = result.file_count
            job.chunk_count = result.chunk_count
            job.skipped_file_count = result.skipped_file_count
            job.finished_at = utc_now()
            session.add(job)
            session.commit()
        except Exception as exc:
            session.rollback()
            job = session.get(JobRun, job_id)
            if job is not None:
                job.status = "failed"
                job.message = str(exc)
                job.finished_at = utc_now()
                session.add(job)
                session.commit()
            logger.exception("jobs.repository_index.failed job_id=%s", job_id)
        finally:
            session.close()

    def _localized_message(
        self,
        response_language: ResponseLanguage | None,
        zh_cn_message: str,
        en_message: str,
    ) -> str:
        if response_language == ResponseLanguage.ZH_CN:
            return zh_cn_message
        return en_message
