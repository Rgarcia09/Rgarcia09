from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

from ava.models.directory import CONSULTANT_DISCIPLINES
from ava.schemas.common import LongText, OptShortText, ORMModel, Phone, ShortText, blank_to_none

Discipline = Literal[CONSULTANT_DISCIPLINES]  # type: ignore[valid-type]


class _Blankable(BaseModel):
    @field_validator("*", mode="before")
    @classmethod
    def _blank(cls, v: object) -> object:
        return blank_to_none(v)


# --- Clients ------------------------------------------------------------------


class ClientContactIn(_Blankable):
    full_name: ShortText
    title: OptShortText = None
    email: EmailStr | None = None
    phone: Phone = None
    is_primary: bool = False
    notes: LongText = None


class ClientContactOut(ORMModel):
    id: uuid.UUID
    full_name: str
    title: str | None
    email: str | None
    phone: str | None
    is_primary: bool
    notes: str | None


class ClientIn(_Blankable):
    name: ShortText
    billing_name: OptShortText = None
    billing_address: LongText = None
    email: EmailStr | None = None
    phone: Phone = None
    notes: LongText = None
    is_active: bool = True
    contacts: list[ClientContactIn] = Field(default_factory=list, max_length=100)


class ClientOut(ORMModel):
    id: uuid.UUID
    name: str
    billing_name: str | None
    billing_address: str | None
    email: str | None
    phone: str | None
    notes: str | None
    is_active: bool
    contacts: list[ClientContactOut]


class ClientBrief(ORMModel):
    id: uuid.UUID
    name: str


# --- Consultants --------------------------------------------------------------


class ConsultantContactIn(_Blankable):
    full_name: ShortText
    title: OptShortText = None
    email: EmailStr | None = None
    phone: Phone = None


class ConsultantContactOut(ORMModel):
    id: uuid.UUID
    full_name: str
    title: str | None
    email: str | None
    phone: str | None


class ConsultantIn(_Blankable):
    company_name: ShortText
    discipline: Discipline
    email: EmailStr | None = None
    phone: Phone = None
    website: OptShortText = None
    address: LongText = None
    notes: LongText = None
    is_active: bool = True
    contacts: list[ConsultantContactIn] = Field(default_factory=list, max_length=100)


class ConsultantOut(ORMModel):
    id: uuid.UUID
    company_name: str
    discipline: str
    email: str | None
    phone: str | None
    website: str | None
    address: str | None
    notes: str | None
    is_active: bool
    contacts: list[ConsultantContactOut]
