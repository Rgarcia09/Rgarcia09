from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Query

from ava.api.deps import DB, Auth
from ava.core.errors import NotFound
from ava.models import Project
from ava.schemas.common import Page
from ava.schemas.projects import ProjectCreate, ProjectOut, ProjectSummary, ProjectUpdate
from ava.services import audit
from ava.services import projects as service

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=Page[ProjectSummary])
def list_projects(
    _: Auth,
    db: DB,
    q: Annotated[str | None, Query(max_length=200)] = None,
    status: Annotated[str | None, Query(max_length=20)] = None,
    client_id: uuid.UUID | None = None,
    include_archived: bool = False,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[ProjectSummary]:
    rows, total = service.list_projects(
        db,
        q=q,
        status=status,
        client_id=client_id,
        include_archived=include_archived,
        limit=limit,
        offset=offset,
    )
    return Page(
        items=[ProjectSummary.model_validate(p) for p in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/by-number/{number}", response_model=ProjectOut)
def get_by_number(number: str, _: Auth, db: DB) -> ProjectOut:
    project = service.get_by_number(db, number)
    if project is None:
        raise NotFound(f"No project with number {number} is in the Project Registry.")
    return service.to_out(project)


@router.post("", response_model=ProjectOut, status_code=201)
def create_project(body: ProjectCreate, auth: Auth, db: DB) -> ProjectOut:
    project = service.create_project(db, body, auth.user)
    audit.record(
        db,
        action="project.create",
        action_type="WRITE",
        user=auth.user,
        resource_type="project",
        resource_id=project.id,
        project_id=project.id,
        ip_address=auth.ip_address,
        detail={"project_number": project.project_number},
    )
    db.commit()
    return service.to_out(service.get_project(db, project.id))


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: uuid.UUID, _: Auth, db: DB) -> ProjectOut:
    return service.to_out(service.get_project(db, project_id))


@router.put("/{project_id}", response_model=ProjectOut)
def update_project(project_id: uuid.UUID, body: ProjectUpdate, auth: Auth, db: DB) -> ProjectOut:
    project = service.get_project(db, project_id)
    changed = service.update_project(db, project, body, auth.user)
    if changed:
        audit.record(
            db,
            action="project.update",
            action_type="WRITE",
            user=auth.user,
            resource_type="project",
            resource_id=project.id,
            project_id=project.id,
            ip_address=auth.ip_address,
            detail={"fields": changed},
        )
    db.commit()
    return service.to_out(service.get_project(db, project_id))


def _set_archived(project_id: uuid.UUID, archived: bool, auth: Auth, db: DB) -> ProjectOut:
    project: Project = service.get_project(db, project_id)
    if project.is_archived != archived:
        project.is_archived = archived
        project.updated_by_id = auth.user.id
        audit.record(
            db,
            action="project.archive" if archived else "project.unarchive",
            action_type="WRITE",
            user=auth.user,
            resource_type="project",
            resource_id=project.id,
            project_id=project.id,
            ip_address=auth.ip_address,
        )
        db.commit()
    return service.to_out(service.get_project(db, project_id))


@router.post("/{project_id}/archive", response_model=ProjectOut)
def archive_project(project_id: uuid.UUID, auth: Auth, db: DB) -> ProjectOut:
    """Projects are archived, never deleted: office history is retained."""
    return _set_archived(project_id, True, auth, db)


@router.post("/{project_id}/unarchive", response_model=ProjectOut)
def unarchive_project(project_id: uuid.UUID, auth: Auth, db: DB) -> ProjectOut:
    return _set_archived(project_id, False, auth, db)
