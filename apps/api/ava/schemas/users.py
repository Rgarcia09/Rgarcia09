from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, Field

from ava.schemas.common import ORMModel, ShortText

Role = Literal["admin", "staff"]

_EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$")


def _office_email(value: str) -> str:
    value = value.strip().lower()
    if len(value) > 320 or not _EMAIL_RE.match(value):
        raise ValueError("Enter a valid email address.")
    return value


# Staff identities may use internal domains (e.g. name@office.local for Active Directory),
# which strict public-email validation would reject.
OfficeEmail = Annotated[str, AfterValidator(_office_email)]


class UserOut(ORMModel):
    id: uuid.UUID
    email: str
    full_name: str
    initials: str | None
    role: Role
    is_active: bool
    last_login_at: datetime | None


class UserBrief(ORMModel):
    id: uuid.UUID
    full_name: str
    initials: str | None


class UserCreate(BaseModel):
    email: OfficeEmail
    full_name: ShortText
    initials: str | None = Field(default=None, max_length=8)
    role: Role = "staff"
    password: str = Field(min_length=1, max_length=256)


class UserUpdate(BaseModel):
    full_name: ShortText | None = None
    initials: str | None = Field(default=None, max_length=8)
    role: Role | None = None
    is_active: bool | None = None


class LoginRequest(BaseModel):
    email: OfficeEmail
    password: str = Field(min_length=1, max_length=256)


class LoginResponse(BaseModel):
    user: UserOut
    csrf_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=256)
    new_password: str = Field(min_length=1, max_length=256)
