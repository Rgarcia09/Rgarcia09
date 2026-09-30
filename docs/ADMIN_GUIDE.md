# Administrator Guide

## First sign-in
1. `scripts/create-admin.sh you@office.com "Your Name"` on the server.
2. Open `https://ava.office.local`, sign in, go to **Settings**.

## Users
Settings → Users. Create one account per employee (shared accounts are not allowed).
Give a temporary password privately; users change it under Settings → Change password.
**Deactivate** (not delete) when someone leaves: their sessions end immediately and
their history remains attributable.

## Office settings
Settings → Office settings (admins can edit):
* **Assistant name** — renames AVA everywhere (sign-in page, navigation, answers).
* Office name, internal URL, AI model label, invoice thresholds (used from Phase 4).
Secrets, strict local mode and the AI engine address are set in `.env` on the server
(then `docker compose up -d`), never in the browser.

## System status
Settings → System status shows database, AI engine, Dropbox, email, calendar, indexer,
last backup and queued jobs. Messages are plain language; technical details are in
`docker compose logs api`.

## Audit log
Settings → Audit log: sign-ins (including failures), changes to projects, clients,
consultants, users and settings, and every AVA request (intent and outcome, not text).

## Loading data
Until the Phase 2 importer, enter clients and consultants first, then projects (so they
can be linked). Demo data (`python -m ava.cli seed-demo`) is refused in production.

## Routine tasks
| Task | How |
|---|---|
| Backup | nightly cron `scripts/backup.sh` (BACKUP_RESTORE.md) |
| Update | `scripts/backup.sh && git pull && docker compose up -d --build` |
| Logs | `docker compose logs --tail 200 api` |
| Restart | `docker compose restart api web` |
| Database shell | `docker compose exec db psql -U ava -d ava` |
