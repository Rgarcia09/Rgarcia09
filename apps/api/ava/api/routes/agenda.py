from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query
from pydantic import BaseModel

from ava.api.deps import DB, Auth
from ava.schemas.projects import ProjectSummary
from ava.services import integrations
from ava.services import projects as project_service
from ava.services.clock import office_today

router = APIRouter(prefix="/api/agenda", tags=["agenda"])


class DeadlineItem(BaseModel):
    project: ProjectSummary
    deadline: date
    days_remaining: int
    source: str = "Project Registry"


class IntegrationNotice(BaseModel):
    kind: str
    status: str
    message: str


class TodayResponse(BaseModel):
    today: date
    overdue: list[DeadlineItem]
    upcoming: list[DeadlineItem]
    integrations: list[IntegrationNotice]


@router.get("/today", response_model=TodayResponse)
def today(_: Auth, db: DB, days: Annotated[int, Query(ge=1, le=90)] = 14) -> TodayResponse:
    now = office_today()
    items = []
    for p in project_service.upcoming_deadlines(db, today=now, days=days):
        assert p.deadline is not None
        items.append(
            DeadlineItem(
                project=ProjectSummary.model_validate(p),
                deadline=p.deadline,
                days_remaining=(p.deadline - now).days,
            )
        )
    notices = [
        IntegrationNotice(kind=s.kind, status=s.status, message=s.message)
        for s in integrations.statuses(db).values()
    ]
    return TodayResponse(
        today=now,
        overdue=[i for i in items if i.days_remaining < 0],
        upcoming=[i for i in items if i.days_remaining >= 0],
        integrations=notices,
    )
