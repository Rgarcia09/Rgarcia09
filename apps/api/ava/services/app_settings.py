"""Admin-editable settings layered over environment defaults.

Only non-secret values live here. Secrets (API keys, OAuth client secrets, DB passwords)
stay in the environment / secrets manager.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ava.config import get_settings
from ava.models import AppSetting, User


class EditableSettings(BaseModel):
    ava_name: str = Field(min_length=1, max_length=40)
    office_name: str = Field(min_length=1, max_length=200)
    internal_url: str = Field(min_length=1, max_length=300)
    invoice_alert_threshold_days: int = Field(ge=1, le=365)
    invoice_review_frequency_days: int = Field(ge=1, le=90)
    ai_model: str = Field(min_length=1, max_length=200)
    embedding_model: str = Field(min_length=1, max_length=200)


def _defaults() -> dict[str, Any]:
    s = get_settings()
    return {
        "ava_name": s.ava_name,
        "office_name": s.office_name,
        "internal_url": s.internal_url,
        "invoice_alert_threshold_days": s.invoice_alert_threshold_days,
        "invoice_review_frequency_days": s.invoice_review_frequency_days,
        "ai_model": s.ai_model,
        "embedding_model": s.embedding_model,
    }


def load(db: Session) -> EditableSettings:
    values = _defaults()
    for row in db.scalars(select(AppSetting).where(AppSetting.key.in_(values.keys()))):
        values[row.key] = row.value
    return EditableSettings(**values)


def save(db: Session, data: EditableSettings, actor: User) -> list[str]:
    current = load(db).model_dump()
    changed: list[str] = []
    for key, value in data.model_dump().items():
        if current.get(key) == value:
            continue
        row = db.get(AppSetting, key) or AppSetting(key=key)
        row.value = value
        row.updated_by_id = actor.id
        db.add(row)
        changed.append(key)
    db.flush()
    return changed
