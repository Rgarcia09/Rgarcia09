# AVA — Internal AI Operating System for the Architecture Office

AVA is a private, on-premise assistant that knows the office's projects, clients,
consultants and deadlines, answers from the office's own records, and cites its sources.
It runs on the office server, is reached at `https://ava.office.local` from the office
network (or Fortinet VPN), and keeps AI processing local (`STRICT_LOCAL_MODE=true`).

> **Status: Phase 1 (core foundation) complete.** Authentication, audit log, Project
> Registry, Client Registry, Consultant Directory, global search, the AVA conversation
> interface with source citations, health checks, Docker deployment, backups.
> Dropbox, email, calendar, invoices, reports, RFIs and submittals are planned
> (docs/IMPLEMENTATION_PLAN.md) and are shown as *not yet available* — never faked.

The name "AVA" is provisional: change `AVA_NAME` in `.env` or **Settings → Assistant name**.

## Quick start (office server)

Requirements: Linux, Docker Engine with Compose v2, ports 80/443 free.

```bash
git clone <repository-url> /opt/ava && cd /opt/ava
scripts/audit-environment.sh > environment-report.txt   # read-only; see docs/ENVIRONMENT.md
scripts/setup.sh                 # creates .env with generated secrets (never overwrites)
nano .env                        # set AVA_HOSTNAME, AVA_BIND_ADDRESS, OFFICE_NAME, AI_* values
docker compose up -d --build     # add --profile local-ai to also run Ollama here
scripts/create-admin.sh you@office.com "Your Name"
```

Then:
1. Create the internal DNS record `ava.office.local → <server LAN IP>` (docs/DEPLOYMENT.md).
2. Trust the HTTPS certificate on office devices (Caddy internal CA or an office-issued
   certificate — docs/DEPLOYMENT.md §4).
3. Open `https://ava.office.local`, sign in, create staff accounts under **Settings**.
4. Pull a local model: `docker compose exec ollama ollama pull llama3.1:8b-instruct-q4_K_M`
   (choose per docs/AI.md). Without a model AVA still answers registry questions.

Before DNS exists you can test from the server itself:
```bash
docker compose cp proxy:/data/caddy/pki/authorities/local/root.crt ./ava-root-ca.crt
curl --resolve ava.office.local:443:127.0.0.1 --cacert ava-root-ca.crt https://ava.office.local/health
```

## Development

```bash
# Data services (dev + test databases on 127.0.0.1 only)
docker compose -f docker-compose.dev.yml up -d

# API
cd apps/api
python3 -m venv .venv && .venv/bin/pip install -e '.[dev]'
export DATABASE_URL=postgresql+psycopg://ava:ava_dev_pw@localhost:5432/ava_dev \
       APP_ENV=development COOKIE_SECURE=false DEMO_MODE=true AI_BASE_URL=http://localhost:11434
.venv/bin/alembic upgrade head
.venv/bin/python -m ava.cli create-user --email dev@office.local --name "Developer" --admin
.venv/bin/python -m ava.cli seed-demo          # fictional DEMO records, dev only
.venv/bin/uvicorn ava.main:app --reload --port 8000

# Web (in another terminal)
cd apps/web && npm install && npm run dev      # http://localhost:3000 (proxies /api to :8000)
```

### Checks
```bash
cd apps/api && .venv/bin/ruff check . && .venv/bin/mypy ava && .venv/bin/pytest
cd apps/web && npm run lint && npm run typecheck && npm test && npm run build
# End-to-end against a running stack:
cd apps/web && AVA_EMAIL=dev@office.local AVA_PASSWORD=... npm run e2e
```
API tests use a separate database (`TEST_DATABASE_URL`, default `ava_test`) which is
rebuilt from migrations on each run.

## Repository

```
apps/api        FastAPI service, Alembic migrations, tests
apps/web        Next.js web app, unit tests, Playwright smoke test
infrastructure  Caddy reverse proxy, certificate folder, dev DB init
scripts         setup, environment audit, create-admin, backup, restore
docs            architecture, security, deployment and user documentation
legacy          previous unrelated prototype (kept unchanged)
```

API documentation (OpenAPI): `https://ava.office.local/api/docs`.

## Documentation

| Document | Contents |
|---|---|
| [docs/SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md) | components, network, data flow, strict local mode |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | code layout, layering rules, adding modules |
| [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) | phases 0–7 and status |
| [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) · [docs/DATABASE.md](docs/DATABASE.md) | tables; migrations and operations |
| [docs/SECURITY_MODEL.md](docs/SECURITY_MODEL.md) · [SECURITY.md](SECURITY.md) | threat model and controls |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | server install, DNS, HTTPS, Fortinet VPN |
| [docs/BACKUP_RESTORE.md](docs/BACKUP_RESTORE.md) | backup, restore, disaster recovery |
| [docs/AI.md](docs/AI.md) | local AI providers and model selection |
| [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) | Dropbox, Gmail, Calendar plans and rules |
| [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) | Phase 0 audit |
| [docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md) | decisions made where information was missing |
| [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) · [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | how to operate and use AVA |
