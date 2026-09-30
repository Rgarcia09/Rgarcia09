"""Health endpoints.

Public endpoints return only a coarse status (suitable for Docker / reverse-proxy checks).
Detailed diagnostics are at /api/admin/status and require an administrator.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Response
from sqlalchemy import text

from ava.ai.providers.base import AIProvider
from ava.api.ai_dep import ai_provider
from ava.api.deps import DB
from ava.services import integrations

router = APIRouter(tags=["health"])


def _status(response: Response, ok: bool, status: str | None = None) -> dict[str, str]:
    if not ok:
        response.status_code = 503
    return {"status": status or ("ok" if ok else "unavailable")}


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/db")
def health_db(response: Response, db: DB) -> dict[str, str]:
    try:
        db.execute(text("SELECT 1"))
        return _status(response, True)
    except Exception:
        return _status(response, False)


@router.get("/health/ai")
def health_ai(response: Response, provider: Annotated[AIProvider, Depends(ai_provider)]) -> dict:
    return _status(response, provider.health().online)


def _integration(kind: str, db: DB) -> dict[str, str]:
    # Not being configured is a valid state, not a failure: report it with HTTP 200.
    return {"status": integrations.statuses(db)[kind].status}


@router.get("/health/dropbox")
def health_dropbox(db: DB) -> dict[str, str]:
    return _integration("dropbox", db)


@router.get("/health/email")
def health_email(db: DB) -> dict[str, str]:
    return _integration("gmail", db)


@router.get("/health/calendar")
def health_calendar(db: DB) -> dict[str, str]:
    return _integration("google_calendar", db)
