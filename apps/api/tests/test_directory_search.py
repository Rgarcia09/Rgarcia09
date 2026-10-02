from __future__ import annotations

from fastapi.testclient import TestClient

from tests.factories import create_client, create_consultant, create_project


def test_client_contacts_round_trip(staff: TestClient) -> None:
    c = create_client(
        staff, contacts=[{"full_name": "Ana Pérez", "email": "ana@example.com", "is_primary": True}]
    )
    contact_id = c["contacts"][0]["id"]
    updated = staff.put(
        f"/api/clients/{c['id']}",
        json={
            "name": c["name"],
            "contacts": [
                {"full_name": "Ana Pérez", "email": "ana@example.com", "phone": "787-555-0100"},
                {"full_name": "Luis Rivera"},
            ],
        },
    ).json()
    assert {x["full_name"] for x in updated["contacts"]} == {"Ana Pérez", "Luis Rivera"}
    assert next(x for x in updated["contacts"] if x["full_name"] == "Ana Pérez")["id"] == contact_id


def test_client_projects_listing(staff: TestClient) -> None:
    c = create_client(staff)
    create_project(staff, client_id=c["id"])
    rows = staff.get(f"/api/clients/{c['id']}/projects").json()
    assert [r["project_number"] for r in rows] == ["25006"]


def test_consultant_discipline_filter_and_validation(staff: TestClient) -> None:
    create_consultant(staff, "Ramos Structural", "structural")
    create_consultant(staff, "Volt Electric", "electrical")
    assert len(staff.get("/api/consultants?discipline=structural").json()) == 1
    bad = staff.post("/api/consultants", json={"company_name": "X", "discipline": "astrology"})
    assert bad.status_code == 422


def test_search_exact_number_ranks_first(staff: TestClient) -> None:
    create_project(staff, "25006", "Las Piedras School")
    create_project(staff, "25060", "Another 25006 related name")
    hits = staff.get("/api/search?q=25006").json()["hits"]
    assert hits[0]["title"].startswith("25006 —")


def test_search_is_accent_insensitive_and_fuzzy(staff: TestClient) -> None:
    create_consultant(
        staff, "Ramos Structural", "structural", contacts=[{"full_name": "Juan Ramón Ortiz"}]
    )
    hits = staff.get("/api/search?q=Juan Ramon").json()["hits"]
    assert hits and hits[0]["title"] == "Juan Ramón Ortiz"
    fuzzy = staff.get("/api/search?q=Structral Ramos").json()["hits"]
    assert any(h["title"] == "Ramos Structural" for h in fuzzy)


def test_search_reports_unsearched_sources(staff: TestClient) -> None:
    body = staff.get("/api/search?q=anything").json()
    assert "Email" in body["not_searched"]
