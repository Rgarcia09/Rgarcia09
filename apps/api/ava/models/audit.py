from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from ava.db.base import Base

ACTION_TYPES = ("AUTH", "READ", "CREATE_DRAFT", "WRITE", "DESTRUCTIVE", "ADMIN")
RESULTS = ("success", "denied", "error")


class AuditLog(Base):
    """Append-only audit trail. Never stores passwords, tokens or document bodies."""

    __tablename__ = "audit_logs"
    __table_args__ = (
        CheckConstraint(
            "action_type IN (" + ", ".join(f"'{a}'" for a in ACTION_TYPES) + ")",
            name="action_type_valid",
        ),
        CheckConstraint(
            "result IN (" + ", ".join(f"'{r}'" for r in RESULTS) + ")", name="result_valid"
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    # Snapshot so the trail stays readable even if the user record changes.
    user_email: Mapped[str | None] = mapped_column(String(320))
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    action_type: Mapped[str] = mapped_column(String(20), nullable=False)
    resource_type: Mapped[str | None] = mapped_column(String(60))
    resource_id: Mapped[str | None] = mapped_column(String(100))
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), index=True
    )
    result: Mapped[str] = mapped_column(String(20), nullable=False, default="success")
    ip_address: Mapped[str | None] = mapped_column(String(64))
    detail: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
