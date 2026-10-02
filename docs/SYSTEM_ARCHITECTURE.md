# AVA — System Architecture

AVA is the office's internal AI operating system: a private web application on the office
server that answers questions from the office's own records and points back to the source.

## 1. Principles

1. **Retrieve, then answer.** Office facts come from structured records or retrieved
   documents, never from model memory. If something cannot be verified, AVA says so.
2. **Local by default.** Inference, embeddings, search and storage run on office hardware.
   `STRICT_LOCAL_MODE=true` is enforced in code (§5).
3. **Nothing is faked.** A module or integration that is not built or not connected says so.
4. **Individual identity, full audit trail.** No shared accounts.
5. **The application — not the model — decides what runs.** Model output and document
   text can never trigger writes, sends or deletions.
6. **Separate source, index and generated data.** Rebuilding an index never deletes
   originals.

## 2. Network view

```
 Employee device (desktop / tablet / phone)
        │  office LAN / Wi-Fi   (remote: Fortinet VPN → office LAN)
        ▼
 https://ava.office.local  ── internal DNS A record → office server LAN IP
        │
 ┌──────┴───────────────────── office server (Docker Compose) ──────────────────────┐
 │  proxy  (Caddy, :443/:80 only published ports; TLS: internal CA or office cert) │
 │    ├── /api/*, /health*  ──► api  (FastAPI, Python)                              │
 │    └── everything else  ──► web  (Next.js)                                       │
 │                                                                                  │
 │  backend network (internal: no Internet route)                                   │
 │    db     PostgreSQL 16 + pg_trgm + unaccent (+ pgvector from Phase 2)           │
 │    redis  rate limiting now; job queue from Phase 2                              │
 │    ollama local LLM (optional profile) — or a GPU box elsewhere on the LAN       │
 └──────────────────────────────────────────────────────────────────────────────────┘
        │  outbound HTTPS only for official APIs of existing office systems (Phase 2+):
        ▼  Dropbox, Gmail, Google Calendar.  Never to external AI services in strict mode.
```

AVA is never exposed to the public Internet. There is no port forwarding; remote staff
use the existing Fortinet VPN (see DEPLOYMENT.md).

## 3. Components

| Component | Technology | Responsibility |
|---|---|---|
| `apps/web` | Next.js 16, React 19, TypeScript | UI: AVA conversation, Today, registries, search, settings. Same-origin calls to `/api`. |
| `apps/api` | FastAPI, SQLAlchemy 2, Alembic, Pydantic 2 | Auth, business logic, AVA orchestration, audit, OpenAPI at `/api/docs`. |
| PostgreSQL | 16 (`pgvector/pgvector:pg16` image) | Authoritative structured data; fuzzy search indexes; vector index from Phase 2. |
| Redis | 7 | Rate limiting (multi-process safe); background job queue from Phase 2. |
| Caddy | 2 | TLS termination, security headers, routing. |
| Ollama / vLLM | local | LLM inference behind the `AIProvider` interface. |
| Worker (Phase 2) | Python, Redis-backed queue | Dropbox/Gmail/Calendar sync, indexing, invoice aging, scheduled briefings. |

## 4. API internals

```
ava/
  main.py            app factory, security headers, router registration
  config.py          all settings from environment (validated; production guards)
  api/routes/        HTTP layer only: validation, auth dependency, audit call
  api/deps.py        session auth, CSRF check, admin guard
  services/          business logic (projects, directory, search, auth, audit, settings)
  models/            SQLAlchemy ORM (one module per domain)
  schemas/           Pydantic request/response models
  ai/                orchestrator, prompting & injection defence, action policy,
                     providers (ollama, openai-compatible, disabled), strict-local policy
  core/              passwords, tokens, rate limiting, error envelope
  cli/               create-user, seed-demo (dev only), record-job
alembic/             migrations (the only way the schema changes)
```

### Request path for an AVA question

```
POST /api/ava/chat {message, project_id?}
  → auth + CSRF (deps.get_auth)
  → Orchestrator.answer
      1. classify intent (deterministic keywords, EN + ES)
      2. resolve project: number in message › page context › fuzzy name (ambiguity → ask)
      3. run READ tools allowed by ai/actions.py (registry lookups, deadlines, search)
      4a. structured intents → exact answer built from records + sources   (no LLM)
      4b. free-form / drafting → local LLM over retrieved data wrapped as untrusted
          <office_data>; answer returned with the same sources
      5. unbuilt module or disconnected integration → say so; never guess
  → persist conversation (user-private), audit (intent/outcome only, not text)
```

## 5. Strict local mode

Enforced in `ava/ai/factory.py` and `ava/ai/policy.py`:

* `AI_PROVIDER=cloud` is rejected at start-up while strict mode is on.
* The configured AI endpoint must be loopback, a private IP range, a single-label Docker
  service name, or an internal DNS suffix (`.local`, `.lan`, `.internal`, `.home.arpa`,
  `.corp`). A public endpoint is refused and the engine reports offline.
* Embeddings (Phase 2) use the same provider abstraction and the same check.
* Office-system APIs (Dropbox, Google) are separate integration clients; they transfer
  files/messages between office systems, never to an AI service.

## 6. Data categories (§69)

| Category | Where | Authority |
|---|---|---|
| Authoritative structured data | PostgreSQL tables (projects, clients, consultants, later invoices, RFIs…) | Source of truth for AVA's answers. |
| Retrieved document data | Dropbox (source) → text/chunks/vectors in PostgreSQL (index) | Index is disposable and rebuildable; source files never modified. |
| Conversational memory | `ai_conversations`, `ai_messages` | Never authoritative. Deadlines etc. must live in structured records. |
| Generated data (Phase 5) | drafts table + output files | Always a draft until a person approves. |

## 7. Future extension points

* **Integrations** — `integrations` table + `services/integrations.py` already report
  status; each connector adds a client module and a sync job (INTEGRATIONS.md).
* **Documents / RAG** — `documents`, `document_versions`, `document_chunks` (pgvector +
  `tsvector`) with hybrid retrieval and reranking (IMPLEMENTATION_PLAN.md, Phase 2).
* **Tools** — new capabilities register a `ToolSpec` with an `ActionType`; WRITE needs a
  preview/approval, DESTRUCTIVE an explicit confirmation.
* **Voice** — a speech-to-text front end can post to `/api/ava/chat`; nothing in the
  pipeline is text-UI specific.
* **Drawing intelligence / analytics** — additional workers and tables; the registry is
  the join point for every module.
* **Scale-out** — stateless API and web containers; move to Kubernetes later without code
  changes (sessions and rate limits already live in PostgreSQL/Redis).
