# Assumptions

Where information was missing, the safest reasonable assumption was made and recorded
here. Each can be changed; the "Where to change" column says how.

| # | Assumption | Why | Where to change |
|---|---|---|---|
| 1 | The existing Vite "Archi.AI" prototype is unrelated to AVA; it was moved to `legacy/` (not deleted). | Never delete existing work. | Delete `legacy/` when no longer needed. |
| 2 | Office time zone is `America/Puerto_Rico`. | References to Las Piedras and Spanish-language office workflows. | `OFFICE_TIMEZONE` in `.env`. |
| 3 | Project numbers are free-form text up to 32 characters (letters, digits, `.`, `-`, `_`), e.g. `25006`. No scheme is enforced. | §14: numbering must not be hard-coded before inspecting office conventions. | Phase 5 numbering rules layer. |
| 4 | Two roles only (`admin`, `staff`); all staff have the same functional access. | §5. The `role` column allows RBAC later. | `users.role`. |
| 5 | Projects are archived, never deleted, from the UI/API. | Office history must be retained (§68). | — |
| 6 | Default local model: `llama3.1:8b-instruct-q4_K_M` via Ollama; no GPU assumed. | Runs on CPU with ~16 GB RAM. | `AI_MODEL`, `AI_PROVIDER`, `AI_BASE_URL`; see docs/AI.md. |
| 7 | AVA's registry answers (projects, deadlines, consultants) are deterministic and do not use the LLM. | Exactness; works when the AI engine is offline; no fabrication. | `ava/ai/orchestrator.py`. |
| 8 | Only one deadline per project is tracked in Phase 1 (`projects.deadline` = next deadline). | Phase 3/6 add calendar events, milestones and action items. | Later migrations. |
| 9 | Staff accounts may use internal email domains such as `name@office.local`. | Active Directory setups. Client/consultant emails use strict validation. | `ava/schemas/users.py`. |
| 10 | Chat messages are stored per user and visible only to their author. Admins cannot read others' conversations through the API. | Privacy by default. | `ava/api/routes/ava_chat.py`. |
| 11 | Audit log records user, action, resource, project and outcome; it does **not** store chat text, passwords or tokens. | §35 minimise sensitive content. | `ava/services/audit.py`. |
| 12 | Read-only page views are not audited individually; writes, sign-ins, admin actions and every AVA request are. | Useful signal without flooding the log. | Route handlers. |
| 13 | Caddy's internal CA is the default TLS option until the office supplies a certificate. | HTTPS everywhere without Internet exposure (§67). | `AVA_TLS` in `.env`. |
| 14 | Session lifetime 12 hours; login limited to 10 attempts/minute per email (30 per IP). | Reasonable office defaults. | `SESSION_TTL_HOURS`, `LOGIN_RATE_LIMIT_PER_MINUTE`. |
| 15 | Browser UI is English; AVA's keyword routing also understands common Spanish phrasing (hoy, factura, informe, correo…). | Mixed-language office. | `INTENTS` in `orchestrator.py`. |
| 16 | Redis is used for rate limiting now and for the job queue from Phase 2. | Stack preference §40. | `REDIS_URL`. |
| 17 | The API documentation (`/api/docs`) is reachable by anyone on the LAN (it reveals no data; all data endpoints require sign-in). | Developer convenience on an internal network. | `docs_url` in `ava/main.py`. |
