"""Shared FastAPI dependencies: authentication, CSRF and roles."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from ava.config import get_settings
from ava.core.errors import AppError, Forbidden, Unauthorized
from ava.core.request_info import client_ip
from ava.core.tokens import tokens_match
from ava.db.session import get_db
from ava.models import User, UserSession
from ava.services.auth import resolve_session

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}

DB = Annotated[Session, Depends(get_db)]


@dataclass
class AuthContext:
    user: User
    session: UserSession
    ip_address: str | None


def get_auth(request: Request, db: DB) -> AuthContext:
    settings = get_settings()
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        raise Unauthorized()
    session = resolve_session(db, token)
    if session is None:
        raise Unauthorized("Your session has expired. Please sign in again.")
    if request.method not in SAFE_METHODS:
        csrf = request.headers.get("x-csrf-token", "")
        if not csrf or not tokens_match(csrf, session.csrf_hash):
            raise AppError(403, "csrf_failed", "Security check failed. Please reload the page.")
    return AuthContext(user=session.user, session=session, ip_address=client_ip(request))


Auth = Annotated[AuthContext, Depends(get_auth)]


def require_admin(auth: Auth) -> AuthContext:
    if auth.user.role != "admin":
        raise Forbidden("This action requires an administrator.")
    return auth


AdminAuth = Annotated[AuthContext, Depends(require_admin)]
