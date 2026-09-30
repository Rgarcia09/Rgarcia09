from __future__ import annotations

import uuid

from fastapi import APIRouter
from sqlalchemy import func, select

from ava.api.deps import DB, AdminAuth, Auth
from ava.core.errors import BadRequest, Conflict, NotFound
from ava.core.passwords import hash_password, validate_password_strength
from ava.models import User
from ava.schemas.users import UserBrief, UserCreate, UserOut, UserUpdate
from ava.services import audit
from ava.services.auth import normalize_email, revoke_all_sessions

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[UserBrief])
def list_active_users(_: Auth, db: DB) -> list[User]:
    """Minimal directory used for pickers (project manager, staff)."""
    return list(db.scalars(select(User).where(User.is_active).order_by(User.full_name)))


@router.get("/admin", response_model=list[UserOut])
def list_all_users(_: AdminAuth, db: DB) -> list[User]:
    return list(db.scalars(select(User).order_by(User.full_name)))


@router.post("", response_model=UserOut, status_code=201)
def create_user(body: UserCreate, auth: AdminAuth, db: DB) -> User:
    email = normalize_email(body.email)
    if db.scalar(select(User.id).where(func.lower(User.email) == email)):
        raise Conflict("A user with this email already exists.")
    problems = validate_password_strength(body.password)
    if problems:
        raise BadRequest(" ".join(problems), code="weak_password")
    user = User(
        email=email,
        full_name=body.full_name,
        initials=body.initials,
        role=body.role,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.flush()
    audit.record(
        db,
        action="user.create",
        action_type="ADMIN",
        user=auth.user,
        resource_type="user",
        resource_id=user.id,
        ip_address=auth.ip_address,
        detail={"email": email, "role": body.role},
    )
    db.commit()
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: uuid.UUID, body: UserUpdate, auth: AdminAuth, db: DB) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise NotFound("User not found.")
    changes = body.model_dump(exclude_unset=True)
    if user.id == auth.user.id and (
        changes.get("is_active") is False or changes.get("role") == "staff"
    ):
        raise BadRequest("You cannot deactivate or demote your own account.")
    for key, value in changes.items():
        setattr(user, key, value)
    if changes.get("is_active") is False:
        revoke_all_sessions(db, user)
    audit.record(
        db,
        action="user.update",
        action_type="ADMIN",
        user=auth.user,
        resource_type="user",
        resource_id=user.id,
        ip_address=auth.ip_address,
        detail={"fields": sorted(changes)},
    )
    db.commit()
    return user
