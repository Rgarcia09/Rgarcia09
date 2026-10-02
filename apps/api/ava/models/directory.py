"""Client registry and consultant directory."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ava.db.base import Base, Timestamps, UUIDPk

CONSULTANT_DISCIPLINES = (
    "civil",
    "structural",
    "mechanical",
    "electrical",
    "plumbing",
    "landscape",
    "geotechnical",
    "surveying",
    "contractor",
    "owner_representative",
    "permitting",
    "environmental",
    "other",
)


class Client(UUIDPk, Timestamps, Base):
    __tablename__ = "clients"
    __table_args__ = (
        Index(
            "ix_clients_name_trgm",
            "name",
            postgresql_using="gin",
            postgresql_ops={"name": "gin_trgm_ops"},
        ),
    )

    name: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    billing_name: Mapped[str | None] = mapped_column(String(300))
    billing_address: Mapped[str | None] = mapped_column(Text)
    email: Mapped[str | None] = mapped_column(String(320))
    phone: Mapped[str | None] = mapped_column(String(64))
    notes: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    contacts: Mapped[list[ClientContact]] = relationship(
        back_populates="client", cascade="all, delete-orphan", order_by="ClientContact.full_name"
    )


class ClientContact(UUIDPk, Timestamps, Base):
    __tablename__ = "client_contacts"
    __table_args__ = (
        Index(
            "ix_client_contacts_name_trgm",
            "full_name",
            postgresql_using="gin",
            postgresql_ops={"full_name": "gin_trgm_ops"},
        ),
    )

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    title: Mapped[str | None] = mapped_column(String(200))
    email: Mapped[str | None] = mapped_column(String(320))
    phone: Mapped[str | None] = mapped_column(String(64))
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notes: Mapped[str | None] = mapped_column(Text)

    client: Mapped[Client] = relationship(back_populates="contacts")


class Consultant(UUIDPk, Timestamps, Base):
    """A consultant firm (structural engineer, surveyor, contractor, ...)."""

    __tablename__ = "consultants"
    __table_args__ = (
        Index(
            "ix_consultants_company_trgm",
            "company_name",
            postgresql_using="gin",
            postgresql_ops={"company_name": "gin_trgm_ops"},
        ),
        CheckConstraint(
            "discipline IN (" + ", ".join(f"'{d}'" for d in CONSULTANT_DISCIPLINES) + ")",
            name="discipline_valid",
        ),
    )

    company_name: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    discipline: Mapped[str] = mapped_column(String(40), nullable=False)
    email: Mapped[str | None] = mapped_column(String(320))
    phone: Mapped[str | None] = mapped_column(String(64))
    website: Mapped[str | None] = mapped_column(String(400))
    address: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    contacts: Mapped[list[ConsultantContact]] = relationship(
        back_populates="consultant",
        cascade="all, delete-orphan",
        order_by="ConsultantContact.full_name",
    )


class ConsultantContact(UUIDPk, Timestamps, Base):
    __tablename__ = "consultant_contacts"
    __table_args__ = (
        Index(
            "ix_consultant_contacts_name_trgm",
            "full_name",
            postgresql_using="gin",
            postgresql_ops={"full_name": "gin_trgm_ops"},
        ),
    )

    consultant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("consultants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    title: Mapped[str | None] = mapped_column(String(200))
    email: Mapped[str | None] = mapped_column(String(320))
    phone: Mapped[str | None] = mapped_column(String(64))

    consultant: Mapped[Consultant] = relationship(back_populates="contacts")
