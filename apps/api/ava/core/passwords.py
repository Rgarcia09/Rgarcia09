"""Password hashing (Argon2id). Plain-text passwords are never stored or logged."""

from __future__ import annotations

import contextlib

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

_hasher = PasswordHasher()

MIN_PASSWORD_LENGTH = 12


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str | None, password: str) -> bool:
    if not password_hash:
        # Burn comparable CPU time so response timing does not reveal unknown users.
        with contextlib.suppress(VerifyMismatchError, VerificationError, InvalidHashError):
            _hasher.verify(_DUMMY_HASH, password)
        return False
    try:
        return _hasher.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(password_hash: str) -> bool:
    return _hasher.check_needs_rehash(password_hash)


def validate_password_strength(password: str) -> list[str]:
    problems: list[str] = []
    if len(password) < MIN_PASSWORD_LENGTH:
        problems.append(f"Password must be at least {MIN_PASSWORD_LENGTH} characters.")
    if password.lower() == password or password.upper() == password:
        problems.append("Password must mix upper- and lower-case letters.")
    if not any(c.isdigit() for c in password):
        problems.append("Password must include a digit.")
    return problems


_DUMMY_HASH = _hasher.hash("ava-dummy-password-for-timing")
