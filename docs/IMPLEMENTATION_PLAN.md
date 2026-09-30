# Implementation Plan

Status legend: ✅ done · 🔜 next · ⏳ later

## Phase 0 — Environment audit ✅ (container) / 🔜 (office server)
* ✅ Development container audited (ENVIRONMENT.md); repository inspected, previous
  prototype moved to `legacy/`.
* 🔜 Run `scripts/audit-environment.sh` on the office server; choose the model (AI.md).

## Phase 1 — Core foundation ✅
* ✅ Monorepo, Docker Compose, Caddy HTTPS, `.env.example`, setup/backup/restore scripts
* ✅ PostgreSQL schema + Alembic migration 0001
* ✅ Individual local accounts, Argon2id, server-side sessions, CSRF, rate limiting
* ✅ Project Registry, Client Registry, Consultant Directory (CRUD, archive not delete)
* ✅ Global fuzzy search (projects, clients, consultants, contacts)
* ✅ AVA chat: deterministic registry answers with sources; LLM over retrieved data;
  project context from project pages; honest "not available" for unbuilt modules
* ✅ AI provider abstraction (Ollama, vLLM/OpenAI-compatible, disabled cloud) + strict
  local enforcement; prompt-injection defences; action safety model
* ✅ Audit log, admin settings, system status, health endpoints
* ✅ Tests: 92 API tests, web unit tests, Playwright smoke test

Remaining Phase 1 hardening before first office use:
* 🔜 Office server deployment, DNS record, certificate (DEPLOYMENT.md)
* 🔜 Import existing project/client/consultant lists (Phase 2 includes a mapped
  spreadsheet importer; until then use the UI)
* 🔜 Optional: OIDC / Google Workspace sign-in (the `auth_provider` column is ready)

## Phase 2 — Dropbox + knowledge 🔜
1. `services/worker` with a Redis-backed queue (RQ or Dramatiq) + scheduler; `sync_jobs`
   records every run; jobs idempotent.
2. Dropbox connector (official API, OAuth app owned by the office, minimum scopes
   `files.metadata.read`, `files.content.read`), token encrypted at rest.
3. `project_folders` table (project → one or more Dropbox paths); folder browser.
4. Tables: `documents` (Dropbox file id, path, rev, content hash, index state),
   `document_versions`, `document_chunks` (text, page, `tsvector`, `vector(768)`).
5. Extraction: PDF (pypdf / pdfminer), DOCX, XLSX, TXT, CSV; metadata capture; chunking
   by headings/pages; local embeddings via the provider interface.
6. Incremental indexing by file id + rev + hash; deleting the index never touches Dropbox.
7. Hybrid retrieval: metadata filter → full-text (exact tokens like "RFI 46", "A-101",
   "08 11 13") + vector search → reciprocal-rank fusion → optional local reranker.
8. Citations with file path and page; version awareness (filename/revision parsing,
   issue dates; uncertainty stated).
9. Spreadsheet importer with column mapping + preview for projects/clients/consultants.

## Phase 3 — Email + calendar ⏳
Gmail (per-employee OAuth, `gmail.readonly` + `gmail.compose`; drafts only, sending is a
separate explicit user action), thread summaries, project classification with correction
UI; Google Calendar read; Agenda page; calendar-aware Today briefing.

## Phase 4 — Billing ⏳
`invoices`, `payments`; importer for the existing invoice log; aging buckets (31–45,
46–60, 61–90, 90+); scheduled review every `invoice_review_frequency_days`; independent
arithmetic validation (expected vs current, difference, likely cause); collection email
drafts (never sent automatically).

## Phase 5 — Reports ⏳
Template registry (never modify originals), historical report detection, configurable
numbering engine (`next_number(kind, project)` checks existing documents), DOCX/PDF
generation, draft → review → approve workflow with sources appendix.

## Phase 6 — Project operations ⏳
RFIs, submittals, meetings + attendees, minutes drafting with continuity, action items
with source links, consultant tracking, explainable priority engine with overrides.

## Phase 7 — Automation ⏳
Daily/weekly briefings (Monday summary), deadline alerts, billing monitor, pending-response
detection.

## Working method per phase
Inspect → brief design note → implement → lint/type-check → tests → run stack → browser
verification → docs → logical commits.
