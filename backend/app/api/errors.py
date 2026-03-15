from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.services.chat_service import ChatConfigurationError
from app.services.patch_service import PatchConfigurationError, PatchConflictError
from app.services.repository_service import RepositoryValidationError


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(LookupError)
    async def handle_lookup_error(_: Request, exc: LookupError) -> JSONResponse:
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    @app.exception_handler(RepositoryValidationError)
    @app.exception_handler(ChatConfigurationError)
    @app.exception_handler(PatchConfigurationError)
    async def handle_bad_request_error(_: Request, exc: ValueError) -> JSONResponse:
        return JSONResponse(status_code=400, content={"detail": str(exc)})

    @app.exception_handler(PatchConflictError)
    async def handle_patch_conflict(_: Request, exc: PatchConflictError) -> JSONResponse:
        return JSONResponse(status_code=409, content={"detail": str(exc)})
