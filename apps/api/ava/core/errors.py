"""Consistent, human-readable API errors.

Clients receive `{"error": {"code": ..., "message": ...}}`. Technical details go to the
server log only.
"""

from __future__ import annotations

import logging
import uuid

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

log = logging.getLogger("ava.errors")


class AppError(Exception):
    def __init__(self, status_code: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


class NotFound(AppError):
    def __init__(self, message: str = "The requested record was not found.") -> None:
        super().__init__(404, "not_found", message)


class Conflict(AppError):
    def __init__(self, message: str) -> None:
        super().__init__(409, "conflict", message)


class Forbidden(AppError):
    def __init__(self, message: str = "You do not have permission to perform this action.") -> None:
        super().__init__(403, "forbidden", message)


class Unauthorized(AppError):
    def __init__(self, message: str = "Please sign in to continue.") -> None:
        super().__init__(401, "unauthorized", message)


class BadRequest(AppError):
    def __init__(self, message: str, code: str = "bad_request") -> None:
        super().__init__(400, code, message)


def _body(code: str, message: str, **extra: object) -> dict[str, object]:
    return {"error": {"code": code, "message": message, **extra}}


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content=_body(exc.code, exc.message))

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        message = exc.detail if isinstance(exc.detail, str) else "Request could not be completed."
        return JSONResponse(
            status_code=exc.status_code, content=_body(f"http_{exc.status_code}", message)
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        fields = [
            {"field": ".".join(str(p) for p in err["loc"][1:]), "message": err["msg"]}
            for err in exc.errors()
        ]
        return JSONResponse(
            status_code=422,
            content=_body("validation_error", "Some fields are invalid.", fields=fields),
        )

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
        reference = uuid.uuid4().hex[:12]
        log.exception("Unhandled error ref=%s path=%s", reference, request.url.path)
        return JSONResponse(
            status_code=500,
            content=_body(
                "internal_error",
                f"An unexpected error occurred. The technical details were logged "
                f"(reference {reference}).",
            ),
        )
