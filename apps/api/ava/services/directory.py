"""Client registry and consultant directory logic."""

from __future__ import annotations

import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from ava.core.errors import NotFound
from ava.models import Client, ClientContact, Consultant, ConsultantContact, Project
from ava.schemas.directory import ClientIn, ConsultantIn


def list_clients(db: Session, q: str | None, include_inactive: bool) -> list[Client]:
    stmt = select(Client).options(selectinload(Client.contacts))
    if not include_inactive:
        stmt = stmt.where(Client.is_active.is_(True))
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Client.name.ilike(like), Client.billing_name.ilike(like)))
    return list(db.scalars(stmt.order_by(func.lower(Client.name))))


def get_client(db: Session, client_id: uuid.UUID) -> Client:
    client = db.scalar(
        select(Client).options(selectinload(Client.contacts)).where(Client.id == client_id)
    )
    if client is None:
        raise NotFound("Client not found.")
    return client


def upsert_client(db: Session, data: ClientIn, client: Client | None = None) -> Client:
    client = client or Client()
    for field in ("name", "billing_name", "billing_address", "phone", "notes", "is_active"):
        setattr(client, field, getattr(data, field))
    client.email = str(data.email) if data.email else None
    existing = {c.full_name.lower(): c for c in client.contacts}
    keep: list[ClientContact] = []
    for c in data.contacts:
        contact = existing.pop(c.full_name.lower(), None) or ClientContact()
        contact.full_name = c.full_name
        contact.title = c.title
        contact.email = str(c.email) if c.email else None
        contact.phone = c.phone
        contact.is_primary = c.is_primary
        contact.notes = c.notes
        keep.append(contact)
    client.contacts[:] = keep
    db.add(client)
    db.flush()
    return client


def client_projects(db: Session, client_id: uuid.UUID) -> list[Project]:
    return list(
        db.scalars(
            select(Project)
            .where(Project.client_id == client_id)
            .order_by(Project.project_number.desc())
        ).unique()
    )


def list_consultants(
    db: Session, q: str | None, discipline: str | None, include_inactive: bool
) -> list[Consultant]:
    stmt = select(Consultant).options(selectinload(Consultant.contacts))
    if not include_inactive:
        stmt = stmt.where(Consultant.is_active.is_(True))
    if discipline:
        stmt = stmt.where(Consultant.discipline == discipline)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Consultant.company_name.ilike(like),
                Consultant.id.in_(
                    select(ConsultantContact.consultant_id).where(
                        ConsultantContact.full_name.ilike(like)
                    )
                ),
            )
        )
    return list(db.scalars(stmt.order_by(func.lower(Consultant.company_name))))


def get_consultant(db: Session, consultant_id: uuid.UUID) -> Consultant:
    consultant = db.scalar(
        select(Consultant)
        .options(selectinload(Consultant.contacts))
        .where(Consultant.id == consultant_id)
    )
    if consultant is None:
        raise NotFound("Consultant not found.")
    return consultant


def upsert_consultant(
    db: Session, data: ConsultantIn, consultant: Consultant | None = None
) -> Consultant:
    """Create or update. Existing contacts are matched by name so project links survive."""
    consultant = consultant or Consultant()
    for field in ("company_name", "discipline", "phone", "website", "address", "notes"):
        setattr(consultant, field, getattr(data, field))
    consultant.is_active = data.is_active
    consultant.email = str(data.email) if data.email else None
    existing = {c.full_name.lower(): c for c in consultant.contacts}
    keep: list[ConsultantContact] = []
    for c in data.contacts:
        contact = existing.pop(c.full_name.lower(), None) or ConsultantContact()
        contact.full_name = c.full_name
        contact.title = c.title
        contact.email = str(c.email) if c.email else None
        contact.phone = c.phone
        keep.append(contact)
    consultant.contacts[:] = keep
    db.add(consultant)
    db.flush()
    return consultant
