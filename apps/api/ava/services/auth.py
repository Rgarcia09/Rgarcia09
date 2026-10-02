"""Authentication: local accounts with server-side sessions.

Designed so OIDC / Google Workspace / LDAP can be added later by creating sessions for
users whose `auth_provider` is not "local".
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from ava.config import get_settings
from ava.core.passwords import hash_password, needs_rehash, verify_password
from ava.core.tokens import hash_token, new_token
from ava.models import User, UserSession


@dataclass(frozen=True)
class IssuedSession:
    session: UserSession
    token: str
    csrf_token: str


def normalize_email(email: str) -> str:
    return email.strip().lower()


def authenticate(db: Session, email: str, password: str) -> User | None:
    user = db.scalar(select(User).where(User.email == normalize_email(email)))
    if user is None or user.auth_provider != "local":
        verify_password(None, password)
        return None
    if not verify_password(user.password_hash, password) or not user.is_active:
        return None
    if user.password_hash and needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)
    return user


def issue_session(
    db: Session, user: User, *, ip_address: str | None, user_agent: str | None
) -> IssuedSession:
    now = datetime.now(UTC)
    token, csrf = new_token(), new_token()
    session = UserSession(
        user_id=user.id,
        token_hash=hash_token(token),
        csrf_hash=hash_token(csrf),
        created_at=now,
        last_seen_at=now,
        expires_at=now + timedelta(hours=get_settings().session_ttl_hours),
        ip_address=ip_address,
        user_agent=(user_agent or "")[:400] or None,
    )
    user.last_login_at = now
    db.add(session)
    db.flush()
    return IssuedSession(session=session, token=token, csrf_token=csrf)


def resolve_session(db: Session, token: str) -> UserSession | None:
    now = datetime.now(UTC)
    session = db.scalar(
        select(UserSession).where(
            UserSession.token_hash == hash_token(token),
            UserSession.revoked_at.is_(None),
            UserSession.expires_at > now,
        )
    )
    if session is None or not session.user.is_active:
        return None
    # Throttle last_seen writes to once a minute.
    if (now - session.last_seen_at).total_seconds() > 60:
        session.last_seen_at = now
        db.commit()
    return session


def revoke_session(db: Session, session: UserSession) -> None:
    session.revoked_at = datetime.now(UTC)


def revoke_all_sessions(db: Session, user: User) -> None:
    db.execute(
        update(UserSession)
        .where(UserSession.user_id == user.id, UserSession.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )
