"""Project registry — the central record every other module links to."""

from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ava.db.base import Base, Timestamps, UUIDPk
from ava.models.directory import Client, Consultant, ConsultantContact
from ava.models.user import User

PROJECT_STATUSES = ("prospect", "active", "on_hold", "completed", "cancelled")
PROJECT_PHASES = (
    "pre_design",
    "schematic_design",
    "design_development",
    "construction_documents",
    "permitting",
    "bidding",
    "construction_administration",
    "closeout",
)


class Project(UUIDPk, Timestamps, Base):
    __tablename__ = "projects"
    __table_args__ = (
        # Trigram indexes for fuzzy search (pg_trgm, created in migration 0001).
        Index(
            "ix_projects_name_trgm",
            "name",
            postgresql_using="gin",
            postgresql_ops={"name": "gin_trgm_ops"},
        ),
        Index(
            "ix_projects_short_name_trgm",
            "short_name",
            postgresql_using="gin",
            postgresql_ops={"short_name": "gin_trgm_ops"},
        ),
        Index(
            "ix_projects_number_trgm",
            "project_number",
            postgresql_using="gin",
            postgresql_ops={"project_number": "gin_trgm_ops"},
        ),
        Index(
            "ix_projects_location_trgm",
            "location",
            postgresql_using="gin",
            postgresql_ops={"location": "gin_trgm_ops"},
        ),
        CheckConstraint(
            "status IN (" + ", ".join(f"'{s}'" for s in PROJECT_STATUSES) + ")",
            name="status_valid",
        ),
        CheckConstraint(
            "phase IS NULL OR phase IN (" + ", ".join(f"'{p}'" for p in PROJECT_PHASES) + ")",
            name="phase_valid",
        ),
    )

    # Office project number, e.g. "25006". Stored as text: numbering rules are configurable.
    project_number: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(120))
    client_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="SET NULL"), index=True
    )
    location: Mapped[str | None] = mapped_column(String(300))
    project_type: Mapped[str | None] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    phase: Mapped[str | None] = mapped_column(String(40))
    project_manager_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    contract_number: Mapped[str | None] = mapped_column(String(120))
    contract_value: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    start_date: Mapped[date | None] = mapped_column(Date)
    deadline: Mapped[date | None] = mapped_column(Date, index=True)
    construction_start: Mapped[date | None] = mapped_column(Date)
    construction_end: Mapped[date | None] = mapped_column(Date)
    billing_notes: Mapped[str | None] = mapped_column(Text)
    # Primary Dropbox folder; Phase 2 adds a project_folders table for multiple mappings.
    dropbox_path: Mapped[str | None] = mapped_column(String(1000))
    notes: Mapped[str | None] = mapped_column(Text)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String(60)), nullable=False, default=list)
    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    updated_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    client: Mapped[Client | None] = relationship(lazy="joined")
    project_manager: Mapped[User | None] = relationship(
        foreign_keys=[project_manager_id], lazy="joined"
    )
    staff: Mapped[list[ProjectStaff]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    consultants: Mapped[list[ProjectConsultant]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )


class ProjectStaff(Base):
    """Office staff assigned to a project (architects, designers, ...)."""

    __tablename__ = "project_staff"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    role_on_project: Mapped[str | None] = mapped_column(String(120))

    project: Mapped[Project] = relationship(back_populates="staff")
    user: Mapped[User] = relationship(lazy="joined")


class ProjectConsultant(UUIDPk, Timestamps, Base):
    """Links a consultant firm (and optionally a contact person) to a project."""

    __tablename__ = "project_consultants"
    __table_args__ = (UniqueConstraint("project_id", "consultant_id", "discipline"),)

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    consultant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("consultants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    contact_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("consultant_contacts.id", ondelete="SET NULL")
    )
    # Discipline on this project (a firm may cover several disciplines).
    discipline: Mapped[str] = mapped_column(String(40), nullable=False)
    scope_notes: Mapped[str | None] = mapped_column(Text)

    project: Mapped[Project] = relationship(back_populates="consultants")
    consultant: Mapped[Consultant] = relationship(lazy="joined")
    contact: Mapped[ConsultantContact | None] = relationship(lazy="joined")

    @property
    def consultant_name(self) -> str:
        return self.consultant.company_name
