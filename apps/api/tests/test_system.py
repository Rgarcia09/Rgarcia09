from __future__ import annotations

from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from fastapi.testclient import TestClient

import ava.models  # noqa: F401
from ava.db.base import Base
from ava.db.session import get_engine
from tests.conftest import FakeProvider


def test_public_health_is_minimal(anon: TestClient) -> None:
    assert anon.get("/health").json() == {"status": "ok"}
    assert anon.get("/health/db").json() == {"status": "ok"}
    assert anon.get("/health/dropbox").json() == {"status": "not_configured"}
    assert anon.get("/health/email").json() == {"status": "not_configured"}
    assert anon.get("/health/calendar").json() == {"status": "not_configured"}


def test_health_ai_reports_offline(anon: TestClient) -> None:
    resp = anon.get("/health/ai")  # tests point the AI engine at a closed port
    assert resp.status_code == 503 and resp.json() == {"status": "unavailable"}


def test_admin_status(admin: TestClient, fake_ai: FakeProvider) -> None:
    body = admin.get("/api/admin/status").json()
    names = {c["name"]: c for c in body["components"]}
    assert names["Database"]["status"] == "online"
    assert names["AI Engine"]["status"] == "online"
    assert names["Dropbox"]["detail"] == "Dropbox not configured."
    assert body["strict_local_mode"] is True


def test_security_headers(anon: TestClient) -> None:
    headers = anon.get("/health").headers
    assert headers["x-frame-options"] == "DENY"
    assert headers["x-content-type-options"] == "nosniff"


def test_settings_rename_assistant(admin: TestClient, staff: TestClient) -> None:
    current = admin.get("/api/admin/settings").json()
    assert current["ava_name"] == "AVA"
    current["ava_name"] = "Vera"
    assert admin.put("/api/admin/settings", json=current).json()["ava_name"] == "Vera"
    assert staff.get("/api/meta").json()["ava_name"] == "Vera"
    assert staff.put("/api/admin/settings", json=current).status_code == 403


def test_settings_validation(admin: TestClient) -> None:
    current = admin.get("/api/admin/settings").json()
    current["invoice_review_frequency_days"] = 0
    assert admin.put("/api/admin/settings", json=current).status_code == 422


def test_agenda_today(staff: TestClient) -> None:
    body = staff.get("/api/agenda/today").json()
    assert body["overdue"] == [] and body["upcoming"] == []
    assert {i["kind"] for i in body["integrations"]} == {"dropbox", "gmail", "google_calendar"}


def test_unexpected_errors_are_friendly(anon: TestClient) -> None:
    resp = anon.get("/api/projects/not-a-uuid")
    assert resp.status_code in (401, 422)
    assert "error" in resp.json()


def test_migrations_match_models() -> None:
    with get_engine().connect() as conn:
        diff = compare_metadata(MigrationContext.configure(conn), Base.metadata)
    assert diff == [], diff
