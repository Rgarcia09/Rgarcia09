from __future__ import annotations

from typing import Any

from fastapi.testclient import TestClient


def create_client(api: TestClient, name: str = "Municipality of Las Piedras", **kw: Any) -> dict:
    resp = api.post("/api/clients", json={"name": name, **kw})
    assert resp.status_code == 201, resp.text
    return resp.json()


def create_consultant(api: TestClient, name: str, discipline: str, **kw: Any) -> dict:
    resp = api.post("/api/consultants", json={"company_name": name, "discipline": discipline, **kw})
    assert resp.status_code == 201, resp.text
    return resp.json()


def create_project(
    api: TestClient, number: str = "25006", name: str = "Las Piedras School", **kw: Any
) -> dict:
    resp = api.post("/api/projects", json={"project_number": number, "name": name, **kw})
    assert resp.status_code == 201, resp.text
    return resp.json()
