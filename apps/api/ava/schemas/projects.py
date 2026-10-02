from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints, field_validator, model_validator

from ava.models.directory import CONSULTANT_DISCIPLINES
from ava.models.project import PROJECT_PHASES, PROJECT_STATUSES
from ava.schemas.common import LongText, OptShortText, ORMModel, ShortText, blank_to_none
from ava.schemas.directory import ClientBrief, ConsultantContactOut
from ava.schemas.users import UserBrief

ProjectStatus = Literal[PROJECT_STATUSES]  # type: ignore[valid-type]
ProjectPhase = Literal[PROJECT_PHASES]  # type: ignore[valid-type]
Discipline = Literal[CONSULTANT_DISCIPLINES]  # type: ignore[valid-type]
ProjectNumber = Annotated[
    str,
    StringConstraints(strip_whitespace=True, pattern=r"^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$"),
]
Tag = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=60)]


class StaffAssignment(BaseModel):
    user_id: uuid.UUID
    role_on_project: OptShortText = None


class ConsultantAssignment(BaseModel):
    consultant_id: uuid.UUID
    discipline: Discipline
    contact_id: uuid.UUID | None = None
    scope_notes: LongText = None


class ProjectBase(BaseModel):
    @field_validator("*", mode="before")
    @classmethod
    def _blank(cls, v: object) -> object:
        return blank_to_none(v)

    name: ShortText
    short_name: OptShortText = None
    client_id: uuid.UUID | None = None
    location: OptShortText = None
    project_type: OptShortText = None
    status: ProjectStatus = "active"
    phase: ProjectPhase | None = None
    project_manager_id: uuid.UUID | None = None
    contract_number: OptShortText = None
    contract_value: Decimal | None = Field(default=None, ge=0, max_digits=14, decimal_places=2)
    start_date: date | None = None
    deadline: date | None = None
    construction_start: date | None = None
    construction_end: date | None = None
    billing_notes: LongText = None
    dropbox_path: Annotated[str, StringConstraints(max_length=1000)] | None = None
    notes: LongText = None
    tags: list[Tag] = Field(default_factory=list, max_length=30)
    staff: list[StaffAssignment] = Field(default_factory=list, max_length=50)
    consultants: list[ConsultantAssignment] = Field(default_factory=list, max_length=50)

    @field_validator("tags", "staff", "consultants", mode="before")
    @classmethod
    def _none_list(cls, v: object) -> object:
        return [] if v is None else v

    @model_validator(mode="after")
    def _dates(self) -> ProjectBase:
        start, end = self.construction_start, self.construction_end
        if start and end and end < start:
            raise ValueError("Construction end cannot be before construction start.")
        return self


class ProjectCreate(ProjectBase):
    project_number: ProjectNumber


class ProjectUpdate(ProjectBase):
    project_number: ProjectNumber


class StaffOut(ORMModel):
    user: UserBrief
    role_on_project: str | None


class ProjectConsultantOut(ORMModel):
    id: uuid.UUID
    discipline: str
    scope_notes: str | None
    consultant_id: uuid.UUID
    consultant_name: str
    contact: ConsultantContactOut | None


class ProjectSummary(ORMModel):
    id: uuid.UUID
    project_number: str
    name: str
    short_name: str | None
    client: ClientBrief | None
    location: str | None
    status: str
    phase: str | None
    deadline: date | None
    project_manager: UserBrief | None
    is_archived: bool
    updated_at: datetime


class ProjectOut(ProjectSummary):
    client_id: uuid.UUID | None
    project_type: str | None
    project_manager_id: uuid.UUID | None
    contract_number: str | None
    contract_value: Decimal | None
    start_date: date | None
    construction_start: date | None
    construction_end: date | None
    billing_notes: str | None
    dropbox_path: str | None
    notes: str | None
    tags: list[str]
    staff: list[StaffOut]
    consultants: list[ProjectConsultantOut]
    created_at: datetime
