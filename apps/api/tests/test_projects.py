from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from ava.models import AuditLog
from tests.factories import create_client, create_consultant, create_project


def test_create_and_lookup_by_number(staff: TestClient) -> None:
    client = create_client(staff)
    created = create_project(
        staff,
        client_id=client["id"],
        location="Las Piedras, PR",
        phase="construction_documents",
        tags=["school", "school"],
    )
    assert created["client"]["name"] == "Municipality of Las Piedras"
    assert created["tags"] == ["school"]
    found = staff.get("/api/projects/by-number/25006").json()
    assert found["id"] == created["id"]
    assert staff.get("/api/projects/by-number/99999").status_code == 404


def test_duplicate_number_conflict(staff: TestClient) -> None:
    create_project(staff)
    resp = staff.post("/api/projects", json={"project_number": "25006", "name": "Other"})
    assert resp.status_code == 409
    assert "25006" in resp.json()["error"]["message"]


def test_validation(staff: TestClient) -> None:
    bad = staff.post("/api/projects", json={"project_number": "25 006; DROP", "name": "X"})
    assert bad.status_code == 422
    assert bad.json()["error"]["code"] == "validation_error"
    dates = staff.post(
        "/api/projects",
        json={
            "project_number": "25007",
            "name": "X",
            "construction_start": "2026-05-01",
            "construction_end": "2026-01-01",
        },
    )
    assert dates.status_code == 422
    status = staff.post(
        "/api/projects", json={"project_number": "25008", "name": "X", "status": "imaginary"}
    )
    assert status.status_code == 422


def test_update_audits_changed_fields(staff: TestClient, db: Session) -> None:
    p = create_project(staff)
    body = {"project_number": "25006", "name": "Las Piedras School", "phase": "bidding"}
    resp = staff.put(f"/api/projects/{p['id']}", json=body)
    assert resp.status_code == 200 and resp.json()["phase"] == "bidding"
    entry = db.scalars(select(AuditLog).where(AuditLog.action == "project.update")).one()
    assert entry.detail["fields"] == ["phase"]


def test_consultant_assignment(staff: TestClient) -> None:
    firm = create_consultant(
        staff,
        "Ramos Structural",
        "structural",
        contacts=[{"full_name": "Juan Ramón", "email": "jr@example.com"}],
    )
    other = create_consultant(staff, "Other Firm", "civil", contacts=[{"full_name": "Someone"}])
    p = create_project(
        staff,
        consultants=[
            {
                "consultant_id": firm["id"],
                "discipline": "structural",
                "contact_id": firm["contacts"][0]["id"],
            }
        ],
    )
    assert p["consultants"][0]["consultant_name"] == "Ramos Structural"
    assert p["consultants"][0]["contact"]["full_name"] == "Juan Ramón"
    mismatch = staff.put(
        f"/api/projects/{p['id']}",
        json={
            "project_number": "25006",
            "name": "Las Piedras School",
            "consultants": [
                {
                    "consultant_id": firm["id"],
                    "discipline": "structural",
                    "contact_id": other["contacts"][0]["id"],
                }
            ],
        },
    )
    assert mismatch.status_code == 400


def test_archive_hides_but_keeps_project(staff: TestClient) -> None:
    p = create_project(staff)
    assert staff.post(f"/api/projects/{p['id']}/archive").json()["is_archived"] is True
    assert staff.get("/api/projects").json()["total"] == 0
    assert staff.get("/api/projects?include_archived=true").json()["total"] == 1
    assert staff.get(f"/api/projects/{p['id']}").status_code == 200


def test_list_filters(staff: TestClient) -> None:
    c = create_client(staff, "Municipio de Caguas")
    create_project(staff, "25001", "Caguas Library", client_id=c["id"])
    create_project(staff, "25002", "Humacao Plaza", status="on_hold")
    assert staff.get("/api/projects?q=caguas").json()["total"] == 1  # matches client name
    assert staff.get("/api/projects?status=on_hold").json()["items"][0]["project_number"] == "25002"


def test_project_manager_must_exist(staff: TestClient) -> None:
    resp = staff.post(
        "/api/projects",
        json={
            "project_number": "25009",
            "name": "X",
            "project_manager_id": "00000000-0000-0000-0000-000000000000",
        },
    )
    assert resp.status_code == 400
