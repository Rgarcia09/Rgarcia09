# Environment Audit (Phase 0)

## Important: where this audit was performed

The initial implementation was built in a **cloud development container**, not on the
office server. The figures below describe that container only. They are recorded so
the test results in this repository can be interpreted, **not** to size production.

Before deploying, run the read-only audit on the office server:

```bash
scripts/audit-environment.sh > environment-report.txt
```

and complete the "Office server" section below. The AI model choice (docs/AI.md)
depends on it.

## Development container (2026-09-30)

| Item | Value |
|---|---|
| OS | Ubuntu 24.04.4 LTS, kernel 6.18 |
| CPU | Intel Xeon @ 2.10 GHz, 4 cores, AVX-512 |
| RAM | 15 GiB, no swap |
| GPU | None |
| Storage | 252 GB volume, ~26 GB free |
| Docker | 29.6.2, Compose v5.3.1 |
| Python / Node | 3.11.15 / 22.22.0 |
| PostgreSQL | 16 (local cluster, pgvector 0.6 installed for tests) |
| Redis | local `redis-server` |
| Network | Outbound HTTPS through an egress proxy; Docker Hub rate-limited (images were pulled via `mirror.gcr.io`); Debian package mirrors blocked inside Docker builds |

### Repository state found

The repository contained a small Vite + React prototype named "Archi.AI" (an
architectural-render SaaS mock with client-side state only, no backend). It is unrelated
to AVA. It was **moved unchanged** to `legacy/archi-ai-renders/` rather than deleted.

### What was verified in this container

* API: 92 automated tests against PostgreSQL (auth, CSRF, audit, registry CRUD,
  search, AVA acceptance tests A–G, prompt-injection handling, strict-local policy,
  migrations ↔ models consistency).
* Web: type-check, lint, unit tests, production build.
* Full Docker Compose stack (db, redis, api, web, Caddy) served over HTTPS at
  `https://ava.office.local` (hostname mapped locally), with a Playwright browser smoke
  test passing end to end.
* `scripts/backup.sh` → change data → `scripts/restore.sh` round trip.

### What could not be verified here

* A real local LLM (no GPU; model weights not downloaded). AVA's structured answers do
  not need the LLM; free-form answers were tested with a fake provider and report
  "AI engine not available" when the engine is offline.
* Fortinet, internal DNS and office certificates (office infrastructure).

## Office server (to complete)

| Item | Value |
|---|---|
| OS | |
| CPU (model, cores, AVX2/AVX-512) | |
| RAM | |
| GPU / VRAM | |
| Free disk for Docker volumes | |
| Docker / Compose versions | |
| Existing services on 80/443/5432 | |
| LAN IP / VLAN | |
| Internal DNS server | |
