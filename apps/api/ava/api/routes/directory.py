from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Query

from ava.api.deps import DB, Auth
from ava.schemas.directory import ClientIn, ClientOut, ConsultantIn, ConsultantOut
from ava.schemas.projects import ProjectSummary
from ava.services import audit
from ava.services import directory as service

clients = APIRouter(prefix="/api/clients", tags=["clients"])
consultants = APIRouter(prefix="/api/consultants", tags=["consultants"])

Q = Annotated[str | None, Query(max_length=200)]


@clients.get("", response_model=list[ClientOut])
def list_clients(_: Auth, db: DB, q: Q = None, include_inactive: bool = False) -> list:
    return service.list_clients(db, q, include_inactive)


@clients.post("", response_model=ClientOut, status_code=201)
def create_client(body: ClientIn, auth: Auth, db: DB) -> object:
    client = service.upsert_client(db, body)
    audit.record(
        db,
        action="client.create",
        action_type="WRITE",
        user=auth.user,
        resource_type="client",
        resource_id=client.id,
        ip_address=auth.ip_address,
    )
    db.commit()
    return service.get_client(db, client.id)


@clients.get("/{client_id}", response_model=ClientOut)
def get_client(client_id: uuid.UUID, _: Auth, db: DB) -> object:
    return service.get_client(db, client_id)


@clients.get("/{client_id}/projects", response_model=list[ProjectSummary])
def get_client_projects(client_id: uuid.UUID, _: Auth, db: DB) -> list:
    service.get_client(db, client_id)
    return service.client_projects(db, client_id)


@clients.put("/{client_id}", response_model=ClientOut)
def update_client(client_id: uuid.UUID, body: ClientIn, auth: Auth, db: DB) -> object:
    client = service.upsert_client(db, body, service.get_client(db, client_id))
    audit.record(
        db,
        action="client.update",
        action_type="WRITE",
        user=auth.user,
        resource_type="client",
        resource_id=client.id,
        ip_address=auth.ip_address,
    )
    db.commit()
    return service.get_client(db, client_id)


@consultants.get("", response_model=list[ConsultantOut])
def list_consultants(
    _: Auth,
    db: DB,
    q: Q = None,
    discipline: Annotated[str | None, Query(max_length=40)] = None,
    include_inactive: bool = False,
) -> list:
    return service.list_consultants(db, q, discipline, include_inactive)


@consultants.post("", response_model=ConsultantOut, status_code=201)
def create_consultant(body: ConsultantIn, auth: Auth, db: DB) -> object:
    consultant = service.upsert_consultant(db, body)
    audit.record(
        db,
        action="consultant.create",
        action_type="WRITE",
        user=auth.user,
        resource_type="consultant",
        resource_id=consultant.id,
        ip_address=auth.ip_address,
    )
    db.commit()
    return service.get_consultant(db, consultant.id)


@consultants.get("/{consultant_id}", response_model=ConsultantOut)
def get_consultant(consultant_id: uuid.UUID, _: Auth, db: DB) -> object:
    return service.get_consultant(db, consultant_id)


@consultants.put("/{consultant_id}", response_model=ConsultantOut)
def update_consultant(consultant_id: uuid.UUID, body: ConsultantIn, auth: Auth, db: DB) -> object:
    consultant = service.upsert_consultant(db, body, service.get_consultant(db, consultant_id))
    audit.record(
        db,
        action="consultant.update",
        action_type="WRITE",
        user=auth.user,
        resource_type="consultant",
        resource_id=consultant.id,
        ip_address=auth.ip_address,
    )
    db.commit()
    return service.get_consultant(db, consultant_id)
