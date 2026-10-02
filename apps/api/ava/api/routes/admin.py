from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select, text

from ava.ai.providers.base import AIProvider
from ava.api.ai_dep import ai_provider
from ava.api.deps import DB, AdminAuth, Auth
from ava.config import get_settings
from ava.models import AuditLog, SyncJob
from ava.schemas.common import ORMModel, Page
from ava.services import app_settings, audit, integrations

router = APIRouter(prefix="/api/admin", tags=["admin"])
meta = APIRouter(prefix="/api", tags=["meta"])


class MetaOut(BaseModel):
    ava_name: str
    office_name: str
    strict_local_mode: bool
    environment: str
    demo_mode: bool


@meta.get("/meta", response_model=MetaOut)
def get_meta(db: DB) -> MetaOut:
    """Public, non-sensitive branding used by the sign-in page."""
    prefs = app_settings.load(db)
    s = get_settings()
    return MetaOut(
        ava_name=prefs.ava_name,
        office_name=prefs.office_name,
        strict_local_mode=s.strict_local_mode,
        environment=s.app_env,
        demo_mode=s.demo_mode,
    )


@router.get("/settings", response_model=app_settings.EditableSettings)
def get_app_settings(_: Auth, db: DB) -> app_settings.EditableSettings:
    return app_settings.load(db)


@router.put("/settings", response_model=app_settings.EditableSettings)
def put_app_settings(
    body: app_settings.EditableSettings, auth: AdminAuth, db: DB
) -> app_settings.EditableSettings:
    changed = app_settings.save(db, body, auth.user)
    if changed:
        audit.record(
            db,
            action="settings.update",
            action_type="ADMIN",
            user=auth.user,
            resource_type="settings",
            ip_address=auth.ip_address,
            detail={"fields": changed},
        )
    db.commit()
    return app_settings.load(db)


class ComponentStatus(BaseModel):
    name: str
    status: str
    detail: str
    last_sync_at: datetime | None = None


class SystemStatus(BaseModel):
    components: list[ComponentStatus]
    strict_local_mode: bool
    ai_provider: str
    ai_model: str
    ai_is_local: bool
    last_backup_at: datetime | None
    queued_jobs: int


@router.get("/status", response_model=SystemStatus)
def system_status(
    _: AdminAuth, db: DB, provider: Annotated[AIProvider, Depends(ai_provider)]
) -> SystemStatus:
    components: list[ComponentStatus] = []
    try:
        version = db.execute(text("SHOW server_version")).scalar()
        components.append(
            ComponentStatus(name="Database", status="online", detail=f"PostgreSQL {version}")
        )
    except Exception:
        components.append(
            ComponentStatus(name="Database", status="offline", detail="Database is not reachable.")
        )
    ai = provider.health()
    components.append(
        ComponentStatus(
            name="AI Engine", status="online" if ai.online else "offline", detail=ai.detail
        )
    )
    for st in integrations.statuses(db).values():
        components.append(
            ComponentStatus(
                name=st.label, status=st.status, detail=st.message, last_sync_at=st.last_sync_at
            )
        )
    components.append(
        ComponentStatus(
            name="Indexer", status="not_configured", detail="Document indexing starts in Phase 2."
        )
    )
    last_backup = db.scalar(
        select(func.max(SyncJob.finished_at)).where(
            SyncJob.job_type == "backup", SyncJob.status == "succeeded"
        )
    )
    queued = (
        db.scalar(
            select(func.count())
            .select_from(SyncJob)
            .where(SyncJob.status.in_(("queued", "running")))
        )
        or 0
    )
    s = get_settings()
    return SystemStatus(
        components=components,
        strict_local_mode=s.strict_local_mode,
        ai_provider=provider.name,
        ai_model=provider.model,
        ai_is_local=provider.is_local,
        last_backup_at=last_backup,
        queued_jobs=queued,
    )


class AuditOut(ORMModel):
    id: int
    occurred_at: datetime
    user_email: str | None
    action: str
    action_type: str
    resource_type: str | None
    resource_id: str | None
    project_id: Any | None
    result: str
    ip_address: str | None
    detail: dict[str, Any]


@router.get("/audit", response_model=Page[AuditOut])
def audit_log(
    _: AdminAuth,
    db: DB,
    action: Annotated[str | None, Query(max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[AuditOut]:
    stmt = select(AuditLog)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(AuditLog.id.desc()).limit(limit).offset(offset))
    return Page(
        items=[AuditOut.model_validate(r) for r in rows], total=total, limit=limit, offset=offset
    )
