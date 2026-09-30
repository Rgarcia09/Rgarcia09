from __future__ import annotations

from fastapi import APIRouter, Request, Response

from ava.api.deps import DB, Auth
from ava.config import get_settings
from ava.core.errors import AppError, BadRequest, Unauthorized
from ava.core.passwords import hash_password, validate_password_strength, verify_password
from ava.core.ratelimit import get_rate_limiter
from ava.core.request_info import client_ip
from ava.schemas.users import ChangePasswordRequest, LoginRequest, LoginResponse, UserOut
from ava.services import audit
from ava.services import auth as auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _set_cookies(response: Response, token: str, csrf: str) -> None:
    s = get_settings()
    max_age = s.session_ttl_hours * 3600
    response.set_cookie(
        s.session_cookie_name,
        token,
        max_age=max_age,
        httponly=True,
        secure=s.cookie_secure,
        samesite="lax",
        path="/",
    )
    # Readable by the web app so it can echo it in the X-CSRF-Token header.
    response.set_cookie(
        s.csrf_cookie_name,
        csrf,
        max_age=max_age,
        httponly=False,
        secure=s.cookie_secure,
        samesite="strict",
        path="/",
    )


def _clear_cookies(response: Response) -> None:
    s = get_settings()
    response.delete_cookie(s.session_cookie_name, path="/")
    response.delete_cookie(s.csrf_cookie_name, path="/")


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, request: Request, response: Response, db: DB) -> LoginResponse:
    if not request.headers.get("content-type", "").startswith("application/json"):
        raise BadRequest("Login requires a JSON request.")
    settings = get_settings()
    ip = client_ip(request)
    email = auth_service.normalize_email(body.email)
    limiter = get_rate_limiter()
    limit = settings.login_rate_limit_per_minute
    if not (
        limiter.hit(f"login:ip:{ip}", limit * 3, 60)
        and limiter.hit(f"login:email:{email}", limit, 60)
    ):
        audit.record(
            db,
            action="auth.login",
            action_type="AUTH",
            user_email=email,
            result="denied",
            ip_address=ip,
            detail={"reason": "rate_limited"},
            commit=True,
        )
        raise AppError(429, "rate_limited", "Too many sign-in attempts. Wait a minute and retry.")

    user = auth_service.authenticate(db, email, body.password)
    if user is None:
        audit.record(
            db,
            action="auth.login",
            action_type="AUTH",
            user_email=email,
            result="denied",
            ip_address=ip,
            commit=True,
        )
        raise Unauthorized("Email or password is incorrect.")

    issued = auth_service.issue_session(
        db, user, ip_address=ip, user_agent=request.headers.get("user-agent")
    )
    audit.record(db, action="auth.login", action_type="AUTH", user=user, ip_address=ip)
    db.commit()
    limiter.reset(f"login:email:{email}")
    _set_cookies(response, issued.token, issued.csrf_token)
    return LoginResponse(user=UserOut.model_validate(user), csrf_token=issued.csrf_token)


@router.post("/logout", status_code=204)
def logout(auth: Auth, response: Response, db: DB) -> Response:
    auth_service.revoke_session(db, auth.session)
    audit.record(
        db, action="auth.logout", action_type="AUTH", user=auth.user, ip_address=auth.ip_address
    )
    db.commit()
    response.status_code = 204
    _clear_cookies(response)
    return response


@router.get("/me", response_model=UserOut)
def me(auth: Auth) -> UserOut:
    return UserOut.model_validate(auth.user)


@router.post("/change-password", status_code=204)
def change_password(body: ChangePasswordRequest, auth: Auth, response: Response, db: DB) -> None:
    user = auth.user
    if user.auth_provider != "local":
        raise BadRequest("Your account signs in through the office directory.")
    if not verify_password(user.password_hash, body.current_password):
        audit.record(
            db,
            action="auth.change_password",
            action_type="AUTH",
            user=user,
            result="denied",
            ip_address=auth.ip_address,
            commit=True,
        )
        raise BadRequest("The current password is incorrect.")
    problems = validate_password_strength(body.new_password)
    if problems:
        raise BadRequest(" ".join(problems), code="weak_password")
    user.password_hash = hash_password(body.new_password)
    # Sign out every other device; keep the current session.
    auth_service.revoke_all_sessions(db, user)
    auth.session.revoked_at = None
    audit.record(
        db, action="auth.change_password", action_type="AUTH", user=user, ip_address=auth.ip_address
    )
    db.commit()
