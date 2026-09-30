"""Test fixtures.

Tests run against a dedicated PostgreSQL database (TEST_DATABASE_URL), never the
development or production database. The schema is built with the real Alembic migrations.
"""

from __future__ import annotations

import os

os.environ.setdefault(
    "TEST_DATABASE_URL", "postgresql+psycopg://ava:ava_dev_pw@localhost:5432/ava_test"
)
os.environ["DATABASE_URL"] = os.environ["TEST_DATABASE_URL"]
os.environ["APP_ENV"] = "test"
os.environ["COOKIE_SECURE"] = "false"  # TestClient speaks plain HTTP
os.environ["REDIS_URL"] = ""
os.environ["AI_PROVIDER"] = "ollama"
os.environ["AI_BASE_URL"] = "http://127.0.0.1:9"  # nothing listens: AI is "offline"
os.environ["STRICT_LOCAL_MODE"] = "true"
os.environ["OFFICE_TIMEZONE"] = "America/Puerto_Rico"

from collections.abc import Iterator  # noqa: E402
from dataclasses import dataclass, field  # noqa: E402
from pathlib import Path  # noqa: E402

import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from ava.ai.providers.base import AIProviderError, ChatMessage, ProviderHealth  # noqa: E402
from ava.api.ai_dep import ai_provider  # noqa: E402
from ava.core.passwords import hash_password  # noqa: E402
from ava.core.ratelimit import get_rate_limiter  # noqa: E402
from ava.db.session import get_engine, get_sessionmaker  # noqa: E402
from ava.main import app  # noqa: E402
from ava.models import User  # noqa: E402

API_DIR = Path(__file__).resolve().parents[1]
PASSWORD = "Correct-Horse-9-Battery"


@pytest.fixture(scope="session", autouse=True)
def _schema() -> Iterator[None]:
    engine = get_engine()
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
    cfg = Config(str(API_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(API_DIR / "alembic"))
    command.upgrade(cfg, "head")
    yield


@pytest.fixture(autouse=True)
def _clean() -> Iterator[None]:
    yield
    with get_engine().begin() as conn:
        tables = (
            conn.execute(
                text(
                    "SELECT tablename FROM pg_tables WHERE schemaname='public' "
                    "AND tablename <> 'alembic_version'"
                )
            )
            .scalars()
            .all()
        )
        conn.execute(text(f"TRUNCATE {', '.join(tables)} RESTART IDENTITY CASCADE"))
    get_rate_limiter.cache_clear()
    app.dependency_overrides.clear()


@pytest.fixture
def db() -> Iterator[Session]:
    with get_sessionmaker()() as session:
        yield session


def make_user(
    db: Session, email: str, *, role: str = "staff", name: str | None = None, active: bool = True
) -> User:
    user = User(
        email=email,
        full_name=name or email.split("@")[0].title(),
        role=role,
        is_active=active,
        password_hash=hash_password(PASSWORD),
    )
    db.add(user)
    db.commit()
    return user


@pytest.fixture
def admin_user(db: Session) -> User:
    return make_user(db, "admin@office.test", role="admin", name="Office Admin")


@pytest.fixture
def staff_user(db: Session) -> User:
    return make_user(db, "staff@office.test", name="Staff Architect")


def login(client: TestClient, email: str, password: str = PASSWORD) -> TestClient:
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    client.headers["X-CSRF-Token"] = resp.json()["csrf_token"]
    return client


@pytest.fixture
def anon() -> TestClient:
    return TestClient(app)


@pytest.fixture
def admin(admin_user: User) -> TestClient:
    return login(TestClient(app), admin_user.email)


@pytest.fixture
def staff(staff_user: User) -> TestClient:
    return login(TestClient(app), staff_user.email)


@dataclass
class FakeProvider:
    """Deterministic stand-in for the local LLM; records what it was sent."""

    reply: str = "FAKE ANSWER"
    online: bool = True
    name: str = "fake"
    model: str = "fake-model"
    is_local: bool = True
    calls: list[list[ChatMessage]] = field(default_factory=list)

    def chat(self, messages: list[ChatMessage], *, temperature: float = 0.2) -> str:
        if not self.online:
            raise AIProviderError("offline")
        self.calls.append(messages)
        return self.reply

    def health(self) -> ProviderHealth:
        return ProviderHealth(self.online, "fake")


@pytest.fixture
def fake_ai() -> FakeProvider:
    provider = FakeProvider()
    app.dependency_overrides[ai_provider] = lambda: provider
    return provider
