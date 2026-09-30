"""Audit trail writer.

Records who did what. Callers must pass only minimal, non-secret detail: never passwords,
tokens, email bodies or document contents.
"""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.orm import Session

from ava.models import AuditLog, User

_FORBIDDEN_DETAIL_KEYS = {"password", "token", "secret", "api_key", "authorization", "cookie"}


def _scrub(detail: dict[str, Any]) -> dict[str, Any]:
    return {
        k: ("[redacted]" if any(f in k.lower() for f in _FORBIDDEN_DETAIL_KEYS) else v)
        for k, v in detail.items()
    }


def record(
    db: Session,
    *,
    action: str,
    action_type: str,
    user: User | None = None,
    user_email: str | None = None,
    resource_type: str | None = None,
    resource_id: str | uuid.UUID | None = None,
    project_id: uuid.UUID | None = None,
    result: str = "success",
    ip_address: str | None = None,
    detail: dict[str, Any] | None = None,
    commit: bool = False,
) -> AuditLog:
    entry = AuditLog(
        user_id=user.id if user else None,
        user_email=user.email if user else user_email,
        action=action,
        action_type=action_type,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id is not None else None,
        project_id=project_id,
        result=result,
        ip_address=ip_address,
        detail=_scrub(detail or {}),
    )
    db.add(entry)
    if commit:
        db.commit()
    return entry
