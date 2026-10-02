"""Project registry business logic."""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass
from datetime import date, timedelta

from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session, selectinload

from ava.core.errors import BadRequest, Conflict, NotFound
from ava.models import (
    Client,
    Consultant,
    ConsultantContact,
    Project,
    ProjectConsultant,
    ProjectStaff,
    User,
)
from ava.schemas.projects import ProjectCreate, ProjectOut, ProjectUpdate

# Tokens that look like project numbers inside free text (e.g. "report for 25006").
_NUMBER_TOKEN = re.compile(r"(?<![\w-])([A-Za-z]{0,3}-?\d{3,8}(?:[.-]\d{1,4})?)(?![\w-])")


def _with_relations():
    return (
        selectinload(Project.staff).joinedload(ProjectStaff.user),
        selectinload(Project.consultants).joinedload(ProjectConsultant.consultant),
        selectinload(Project.consultants).joinedload(ProjectConsultant.contact),
    )


def get_project(db: Session, project_id: uuid.UUID) -> Project:
    project = db.scalar(select(Project).options(*_with_relations()).where(Project.id == project_id))
    if project is None:
        raise NotFound("Project not found.")
    return project


def get_by_number(db: Session, number: str) -> Project | None:
    return db.scalar(
        select(Project)
        .options(*_with_relations())
        .where(func.lower(Project.project_number) == number.strip().lower())
    )


def list_projects(
    db: Session,
    *,
    q: str | None = None,
    status: str | None = None,
    client_id: uuid.UUID | None = None,
    include_archived: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Project], int]:
    stmt = select(Project).outerjoin(Client, Project.client_id == Client.id)
    if not include_archived:
        stmt = stmt.where(Project.is_archived.is_(False))
    if status:
        stmt = stmt.where(Project.status == status)
    if client_id:
        stmt = stmt.where(Project.client_id == client_id)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Project.project_number.ilike(like),
                Project.name.ilike(like),
                Project.short_name.ilike(like),
                Project.location.ilike(like),
                Client.name.ilike(like),
            )
        )
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.order_by(Project.project_number.desc()).limit(limit).offset(offset)
    ).unique()
    return list(rows), total


def _validate_refs(db: Session, data: ProjectCreate | ProjectUpdate) -> None:
    if data.client_id and db.get(Client, data.client_id) is None:
        raise BadRequest("The selected client does not exist.")
    if data.project_manager_id and db.get(User, data.project_manager_id) is None:
        raise BadRequest("The selected project manager does not exist.")
    for s in data.staff:
        if db.get(User, s.user_id) is None:
            raise BadRequest("A selected staff member does not exist.")
    for c in data.consultants:
        if db.get(Consultant, c.consultant_id) is None:
            raise BadRequest("A selected consultant does not exist.")
        if c.contact_id:
            contact = db.get(ConsultantContact, c.contact_id)
            if contact is None or contact.consultant_id != c.consultant_id:
                raise BadRequest("A consultant contact does not belong to the selected firm.")
    seen: set[tuple[uuid.UUID, str]] = set()
    for c in data.consultants:
        key = (c.consultant_id, c.discipline)
        if key in seen:
            raise BadRequest("The same consultant is assigned twice for one discipline.")
        seen.add(key)


_SCALAR_FIELDS = (
    "project_number",
    "name",
    "short_name",
    "client_id",
    "location",
    "project_type",
    "status",
    "phase",
    "project_manager_id",
    "contract_number",
    "contract_value",
    "start_date",
    "deadline",
    "construction_start",
    "construction_end",
    "billing_notes",
    "dropbox_path",
    "notes",
)


def _apply(project: Project, data: ProjectCreate | ProjectUpdate) -> None:
    for field in _SCALAR_FIELDS:
        setattr(project, field, getattr(data, field))
    project.tags = sorted({t for t in data.tags})
    project.staff = [
        ProjectStaff(user_id=s.user_id, role_on_project=s.role_on_project) for s in data.staff
    ]
    project.consultants = [
        ProjectConsultant(
            consultant_id=c.consultant_id,
            contact_id=c.contact_id,
            discipline=c.discipline,
            scope_notes=c.scope_notes,
        )
        for c in data.consultants
    ]


def _ensure_unique_number(db: Session, number: str, exclude: uuid.UUID | None = None) -> None:
    stmt = select(Project.id).where(func.lower(Project.project_number) == number.lower())
    if exclude:
        stmt = stmt.where(Project.id != exclude)
    if db.scalar(stmt) is not None:
        raise Conflict(f"Project number {number} is already in use.")


def create_project(db: Session, data: ProjectCreate, actor: User) -> Project:
    _ensure_unique_number(db, data.project_number)
    _validate_refs(db, data)
    project = Project(created_by_id=actor.id, updated_by_id=actor.id)
    _apply(project, data)
    db.add(project)
    db.flush()
    return project


def update_project(db: Session, project: Project, data: ProjectUpdate, actor: User) -> list[str]:
    """Apply an update and return the names of the fields that changed."""
    _ensure_unique_number(db, data.project_number, exclude=project.id)
    _validate_refs(db, data)
    before = {f: getattr(project, f) for f in _SCALAR_FIELDS}
    before_tags = list(project.tags)
    before_staff = {(s.user_id, s.role_on_project) for s in project.staff}
    before_consultants = {
        (c.consultant_id, c.discipline, c.contact_id, c.scope_notes) for c in project.consultants
    }
    # Replace child collections: flush the removals first to avoid PK collisions.
    project.staff.clear()
    project.consultants.clear()
    db.flush()
    _apply(project, data)
    project.updated_by_id = actor.id
    changed = [f for f in _SCALAR_FIELDS if before[f] != getattr(project, f)]
    if before_tags != project.tags:
        changed.append("tags")
    if before_staff != {(s.user_id, s.role_on_project) for s in project.staff}:
        changed.append("staff")
    after_consultants = {
        (c.consultant_id, c.discipline, c.contact_id, c.scope_notes) for c in project.consultants
    }
    if before_consultants != after_consultants:
        changed.append("consultants")
    db.flush()
    return changed


def to_out(project: Project) -> ProjectOut:
    out = ProjectOut.model_validate(project)
    out.consultants.sort(key=lambda c: (c.discipline, c.consultant_name.lower()))
    return out


# --- Reference resolution -----------------------------------------------------


@dataclass(frozen=True)
class ProjectMatch:
    project: Project
    matched_on: str  # "project_number" | "name"
    score: float


def extract_number_tokens(text: str) -> list[str]:
    return [m.group(1) for m in _NUMBER_TOKEN.finditer(text)]


def resolve_reference(
    db: Session, text: str, *, limit: int = 5, min_score: float = 0.55
) -> list[ProjectMatch]:
    """Resolve free text ("the report for 25006", "Las Piedras") to project records.

    Exact project-number matches win outright. Otherwise a trigram similarity search over
    project names is used. Callers must surface ambiguity rather than pick silently.
    """
    for token in extract_number_tokens(text):
        project = get_by_number(db, token)
        if project is not None:
            return [ProjectMatch(project, "project_number", 1.0)]

    cleaned = text.strip()
    if len(cleaned) < 3:
        return []
    needle = func.unaccent(func.lower(cleaned))
    name_expr = func.unaccent(func.lower(Project.name))
    short_expr = func.unaccent(func.lower(func.coalesce(Project.short_name, "")))
    # Both directions: a short query inside a long name ("Las Piedras"), and a project
    # name mentioned inside a longer sentence ("what is pending on Las Piedras school?").
    score = func.greatest(
        func.word_similarity(needle, name_expr),
        func.word_similarity(needle, short_expr),
        func.word_similarity(name_expr, needle),
        case((short_expr == "", 0.0), else_=func.word_similarity(short_expr, needle)),
    )
    rows = db.execute(
        select(Project, score.label("score"))
        .where(score >= min_score, Project.is_archived.is_(False))
        .order_by(score.desc())
        .limit(limit)
    ).all()
    return [ProjectMatch(p, "name", float(s)) for p, s in rows]


def upcoming_deadlines(db: Session, *, today: date, days: int) -> list[Project]:
    return list(
        db.scalars(
            select(Project)
            .where(
                Project.is_archived.is_(False),
                Project.status.in_(("active", "on_hold", "prospect")),
                Project.deadline.is_not(None),
                Project.deadline <= today + timedelta(days=days),
            )
            .order_by(Project.deadline)
        ).unique()
    )
