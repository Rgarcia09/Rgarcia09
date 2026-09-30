# Code Architecture and Conventions

System-level design (network, components, data categories) is in
[SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md). This file covers how the code is organised
and how to extend it.

## Repository layout

```
apps/api/            FastAPI service (Python package `ava`) + Alembic migrations + tests
apps/web/            Next.js web app (+ Vitest unit tests, Playwright smoke test in e2e/)
infrastructure/      Caddy config, certificate drop folder, dev database init
scripts/             setup, environment audit, admin creation, backup, restore
docs/                all documentation
legacy/              the previous unrelated prototype, kept unchanged
docker-compose.yml   production-style deployment; docker-compose.dev.yml for development
```

Differences from the suggested monorepo layout, and why:

* **No `services/worker` yet.** Phase 1 has no background work; an empty worker would be a
  fake component. It is added in Phase 2 as `services/worker`, importing `ava.services`.
* **No `packages/shared` / `packages/ui` yet.** There is one frontend. API types are in
  `apps/web/src/lib/types.ts`; when a second consumer appears (worker, voice client),
  generate a typed client from `/api/openapi.json` into `packages/shared`.
* **Tests live next to each app** (`apps/api/tests`, `apps/web/src/**/*.test.ts`,
  `apps/web/e2e`) so each app can be tested in isolation and in CI.

## Backend layering rules

| Layer | May import | Must not |
|---|---|---|
| `api/routes` | `services`, `schemas`, `api/deps` | contain business rules or raw SQL beyond trivial reads |
| `services` | `models`, `schemas`, `core` | know about HTTP (no `Request`, no status codes except `AppError`) |
| `ai` | `services`, `models` | write to the database (except via services that are READ/DRAFT tools) |
| `models` | `db` | import services |

* All SQL goes through SQLAlchemy expressions (parameterised). No string-built queries
  with user input.
* Errors raised to users are `AppError` subclasses with plain-language messages.
  Unexpected exceptions become a generic message with a log reference.
* Every state-changing route calls `audit.record(...)` before `commit()`.

## Adding a module (example: RFIs, Phase 6)

1. Model in `ava/models/rfi.py`, export it in `ava/models/__init__.py`.
2. `alembic revision --autogenerate -m "rfis"`; review the migration by hand.
3. Schemas in `ava/schemas/rfis.py`; service in `ava/services/rfis.py`.
4. Routes in `ava/api/routes/rfis.py`; register in `ava/main.py`.
5. AVA: add a `ToolSpec` (`rfi.search`, READ) in `ava/ai/actions.py` and replace the
   `_intent_rfis` "not available" handler with a real one that returns sources.
6. Tests: service + API + an AVA conversation test.
7. Web: replace the planned-module entry in `components/nav.ts` with real pages.

## Frontend conventions

* All API access goes through `lib/api.ts` (adds CSRF header, readable errors, redirects
  to sign-in on 401).
* AVA text is rendered through `lib/messageFormat.ts` into typed blocks — never as HTML.
* No external fonts, scripts or CDNs: AVA must work on a LAN without Internet access.
* Pages are client components that load data with `useApi`; forms use plain controlled
  inputs. Keep components under ~300 lines; split when larger.
