from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ava.db.base import Base, Timestamps, UUIDPk


class User(UUIDPk, Timestamps, Base):
    """An individual employee identity. AVA never uses shared accounts."""

    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('admin', 'staff')", name="role_valid"),
        CheckConstraint(
            "auth_provider IN ('local', 'oidc', 'google', 'ldap')", name="provider_valid"
        ),
    )

    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    initials: Mapped[str | None] = mapped_column(String(8))
    # V1 has two roles only; the column exists so finer RBAC can be added later.
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="staff")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    auth_provider: Mapped[str] = mapped_column(String(20), nullable=False, default="local")
    external_subject: Mapped[str | None] = mapped_column(String(255))
    password_hash: Mapped[str | None] = mapped_column(Text)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    sessions: Mapped[list[UserSession]] = relationship(back_populates="user")


class UserSession(UUIDPk, Base):
    """Server-side session. Only SHA-256 hashes of the tokens are stored."""

    __tablename__ = "user_sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    csrf_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ip_address: Mapped[str | None] = mapped_column(String(64))
    user_agent: Mapped[str | None] = mapped_column(String(400))

    user: Mapped[User] = relationship(back_populates="sessions")
