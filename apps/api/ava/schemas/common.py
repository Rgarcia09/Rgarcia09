from __future__ import annotations

from typing import Annotated, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, StringConstraints

T = TypeVar("T")

ShortText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=300)]
OptShortText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=300)] | None
LongText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=20000)] | None
Phone = Annotated[str, StringConstraints(strip_whitespace=True, max_length=64)] | None


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    limit: int
    offset: int


def blank_to_none(value: object) -> object:
    if isinstance(value, str) and not value.strip():
        return None
    return value
