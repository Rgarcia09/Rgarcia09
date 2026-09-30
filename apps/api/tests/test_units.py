from __future__ import annotations

from datetime import date

from ava.ai.orchestrator import relative
from ava.core.passwords import hash_password, validate_password_strength, verify_password
from ava.core.ratelimit import MemoryRateLimiter
from ava.services.audit import _scrub
from ava.services.projects import extract_number_tokens


def test_password_hashing() -> None:
    h = hash_password("Some-Password-1")
    assert h.startswith("$argon2id$")
    assert verify_password(h, "Some-Password-1")
    assert not verify_password(h, "wrong")
    assert not verify_password(None, "anything")


def test_password_strength() -> None:
    assert validate_password_strength("Strong-Password-1") == []
    assert len(validate_password_strength("weak")) == 3


def test_rate_limiter() -> None:
    rl = MemoryRateLimiter()
    assert all(rl.hit("k", 3, 60) for _ in range(3))
    assert not rl.hit("k", 3, 60)
    rl.reset("k")
    assert rl.hit("k", 3, 60)


def test_audit_scrubs_secrets() -> None:
    assert _scrub({"password": "x", "api_key": "y", "fields": ["a"]}) == {
        "password": "[redacted]",
        "api_key": "[redacted]",
        "fields": ["a"],
    }


def test_project_number_extraction() -> None:
    assert extract_number_tokens("Prepare the report for 25006.") == ["25006"]
    assert extract_number_tokens("Door 109 on A-101 for 25006") == ["109", "A-101", "25006"]
    assert extract_number_tokens("no numbers here") == []


def test_relative_dates() -> None:
    t = date(2026, 9, 30)
    assert relative(date(2026, 9, 30), t) == "today"
    assert relative(date(2026, 10, 1), t) == "tomorrow"
    assert relative(date(2026, 9, 27), t) == "3 days overdue"
    assert relative(date(2026, 10, 10), t) == "in 10 days"


def test_cli_record_job(db) -> None:  # type: ignore[no-untyped-def]
    from sqlalchemy import select

    from ava.cli.__main__ import main
    from ava.models import SyncJob

    assert (
        main(
            ["record-job", "--type", "backup", "--status", "succeeded", "--stat", "path=/backups/x"]
        )
        == 0
    )
    job = db.scalars(select(SyncJob)).one()
    assert job.job_type == "backup" and job.stats == {"path": "/backups/x"}


def test_cli_seed_demo_refused_without_demo_mode() -> None:
    from ava.cli.__main__ import main

    assert main(["seed-demo"]) == 1
