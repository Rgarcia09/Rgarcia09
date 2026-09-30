from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from ava.main import app
from ava.models import AuditLog, User
from tests.conftest import PASSWORD, login, make_user


def test_login_sets_httponly_session_and_csrf(anon: TestClient, staff_user: User) -> None:
    resp = anon.post("/api/auth/login", json={"email": "STAFF@office.test", "password": PASSWORD})
    assert resp.status_code == 200
    cookies = resp.headers.get_list("set-cookie")
    session_cookie = next(c for c in cookies if c.startswith("ava_session="))
    assert "HttpOnly" in session_cookie and "SameSite=lax" in session_cookie
    assert resp.json()["user"]["email"] == "staff@office.test"
    assert "password_hash" not in resp.json()["user"]


def test_wrong_password_is_rejected_and_audited(
    anon: TestClient, staff_user: User, db: Session
) -> None:
    resp = anon.post("/api/auth/login", json={"email": staff_user.email, "password": "nope"})
    assert resp.status_code == 401
    assert resp.json()["error"]["message"] == "Email or password is incorrect."
    entry = db.scalars(select(AuditLog).where(AuditLog.action == "auth.login")).one()
    assert entry.result == "denied"
    assert "nope" not in str(entry.detail)


def test_unknown_user_gets_same_message(anon: TestClient) -> None:
    resp = anon.post("/api/auth/login", json={"email": "ghost@office.test", "password": "x"})
    assert resp.status_code == 401
    assert resp.json()["error"]["message"] == "Email or password is incorrect."


def test_inactive_user_cannot_login(anon: TestClient, db: Session) -> None:
    make_user(db, "former@office.test", active=False)
    resp = anon.post("/api/auth/login", json={"email": "former@office.test", "password": PASSWORD})
    assert resp.status_code == 401


def test_login_rate_limited(anon: TestClient, staff_user: User) -> None:
    codes = [
        anon.post(
            "/api/auth/login", json={"email": staff_user.email, "password": "bad"}
        ).status_code
        for _ in range(12)
    ]
    assert codes[-1] == 429


def test_requires_authentication(anon: TestClient) -> None:
    for path in ("/api/auth/me", "/api/projects", "/api/search?q=x", "/api/agenda/today"):
        assert anon.get(path).status_code == 401


def test_csrf_required_for_mutations(staff: TestClient) -> None:
    token = staff.headers.pop("X-CSRF-Token")
    resp = staff.post("/api/projects", json={"project_number": "1", "name": "X"})
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "csrf_failed"
    staff.headers["X-CSRF-Token"] = "forged"
    assert staff.post("/api/projects", json={"project_number": "1", "name": "X"}).status_code == 403
    staff.headers["X-CSRF-Token"] = token
    assert staff.post("/api/projects", json={"project_number": "1", "name": "X"}).status_code == 201


def test_logout_revokes_session(staff: TestClient) -> None:
    cookie = staff.cookies.get("ava_session")
    assert staff.post("/api/auth/logout").status_code == 204
    other = TestClient(app)
    other.cookies.set("ava_session", cookie)
    assert other.get("/api/auth/me").status_code == 401


def test_change_password(staff: TestClient, staff_user: User) -> None:
    weak = staff.post(
        "/api/auth/change-password", json={"current_password": PASSWORD, "new_password": "short"}
    )
    assert weak.status_code == 400
    ok = staff.post(
        "/api/auth/change-password",
        json={"current_password": PASSWORD, "new_password": "New-Password-2026"},
    )
    assert ok.status_code == 204
    assert staff.get("/api/auth/me").status_code == 200  # current session kept
    login(TestClient(app), staff_user.email, "New-Password-2026")


def test_individual_identity_in_audit(staff: TestClient, db: Session) -> None:
    staff.post("/api/projects", json={"project_number": "25006", "name": "Las Piedras"})
    entry = db.scalars(select(AuditLog).where(AuditLog.action == "project.create")).one()
    assert entry.user_email == "staff@office.test"
    assert entry.action_type == "WRITE"
    assert entry.project_id is not None


def test_admin_only_endpoints(staff: TestClient, admin: TestClient) -> None:
    assert staff.get("/api/admin/audit").status_code == 403
    assert staff.get("/api/admin/status").status_code == 403
    assert (
        staff.post(
            "/api/users",
            json={"email": "n@office.test", "full_name": "N", "password": "Strong-Password-1"},
        ).status_code
        == 403
    )
    assert admin.get("/api/admin/audit").status_code == 200


def test_admin_creates_and_deactivates_user(admin: TestClient, db: Session) -> None:
    resp = admin.post(
        "/api/users",
        json={
            "email": "New@Office.test",
            "full_name": "New Person",
            "password": "Strong-Password-1",
        },
    )
    assert resp.status_code == 201
    uid = resp.json()["id"]
    assert resp.json()["email"] == "new@office.test"
    user_client = login(TestClient(app), "new@office.test", "Strong-Password-1")
    assert admin.patch(f"/api/users/{uid}", json={"is_active": False}).status_code == 200
    assert user_client.get("/api/auth/me").status_code == 401


def test_admin_cannot_demote_self(admin: TestClient, admin_user: User) -> None:
    resp = admin.patch(f"/api/users/{admin_user.id}", json={"role": "staff"})
    assert resp.status_code == 400
