"""Connection state of external office systems.

No integration is ever faked: until an administrator connects one, it reports
`not_configured` and AVA says so instead of returning invented results.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from ava.models import Integration

KNOWN = {
    "dropbox": ("Dropbox", 2),
    "gmail": ("Email (Gmail)", 3),
    "google_calendar": ("Calendar (Google)", 3),
}


@dataclass(frozen=True)
class IntegrationStatus:
    kind: str
    label: str
    status: str
    last_sync_at: datetime | None
    last_error: str | None
    planned_phase: int

    @property
    def message(self) -> str:
        if self.status == "connected":
            return f"{self.label}: connected."
        if self.status == "error":
            when = (
                f" Last successful sync: {self.last_sync_at:%b %d, %I:%M %p}."
                if (self.last_sync_at)
                else ""
            )
            return f"{self.label} could not be reached.{when}"
        if self.status == "disabled":
            return f"{self.label}: disabled by an administrator."
        return f"{self.label} not configured."


def statuses(db: Session) -> dict[str, IntegrationStatus]:
    rows = {r.kind: r for r in db.scalars(select(Integration))}
    out: dict[str, IntegrationStatus] = {}
    for kind, (label, phase) in KNOWN.items():
        row = rows.get(kind)
        out[kind] = IntegrationStatus(
            kind=kind,
            label=label,
            status=row.status if row else "not_configured",
            last_sync_at=row.last_sync_at if row else None,
            last_error=row.last_error if row else None,
            planned_phase=phase,
        )
    return out
