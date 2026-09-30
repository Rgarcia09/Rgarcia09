"""Administrative command line.

python -m ava.cli create-user --email a@office.com --name "Full Name" --admin
python -m ava.cli seed-demo          # development/demo only, requires DEMO_MODE=true
"""

from __future__ import annotations

import argparse
import getpass
import sys

from sqlalchemy import select

from ava.config import get_settings
from ava.core.passwords import hash_password, validate_password_strength
from ava.db.session import get_sessionmaker
from ava.models import User
from ava.services import audit
from ava.services.auth import normalize_email


def create_user(args: argparse.Namespace) -> int:
    password = args.password_stdin and sys.stdin.readline().rstrip("\n")
    if not password:
        password = getpass.getpass("Password: ")
        if password != getpass.getpass("Repeat password: "):
            print("Passwords do not match.", file=sys.stderr)
            return 1
    problems = validate_password_strength(password)
    if problems:
        print("\n".join(problems), file=sys.stderr)
        return 1
    with get_sessionmaker()() as db:
        email = normalize_email(args.email)
        if db.scalar(select(User).where(User.email == email)):
            print(f"User {email} already exists.", file=sys.stderr)
            return 1
        user = User(
            email=email,
            full_name=args.name,
            initials=args.initials,
            role="admin" if args.admin else "staff",
            password_hash=hash_password(password),
        )
        db.add(user)
        db.flush()
        audit.record(
            db,
            action="user.create",
            action_type="ADMIN",
            user_email="cli",
            resource_type="user",
            resource_id=user.id,
            detail={"email": email, "role": user.role, "via": "cli"},
        )
        db.commit()
        print(f"Created {user.role} {email}.")
    return 0


def seed_demo(_: argparse.Namespace) -> int:
    settings = get_settings()
    if settings.is_production or not settings.demo_mode:
        print(
            "Refusing: demo data requires DEMO_MODE=true and a non-production APP_ENV.",
            file=sys.stderr,
        )
        return 1
    from ava.cli.demo import seed

    with get_sessionmaker()() as db:
        created = seed(db)
        db.commit()
    print(f"Demo data loaded ({created} projects). All demo records are tagged 'demo'.")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="ava.cli")
    sub = parser.add_subparsers(dest="command", required=True)
    cu = sub.add_parser("create-user", help="Create an individual user account")
    cu.add_argument("--email", required=True)
    cu.add_argument("--name", required=True)
    cu.add_argument("--initials")
    cu.add_argument("--admin", action="store_true")
    cu.add_argument(
        "--password-stdin",
        action="store_true",
        help="Read the password from standard input (for scripts)",
    )
    cu.set_defaults(func=create_user)
    sd = sub.add_parser("seed-demo", help="Load clearly-labelled demo data (dev only)")
    sd.set_defaults(func=seed_demo)
    args = parser.parse_args(argv)
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
