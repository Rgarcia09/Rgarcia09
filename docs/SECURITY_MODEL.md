# Security Model

## Threats considered
1. Unauthorised LAN users or devices reaching office data.
2. Leakage of office data to third parties (especially external AI services).
3. Prompt injection through documents/emails/records steering AVA into harmful actions.
4. Account compromise (password guessing, session theft, CSRF, XSS).
5. Accidental destructive actions; loss of data.
6. Secrets exposure (repository, logs, backups).

## Controls

### Network
* Not exposed to the Internet; no port forwarding. Remote access only via the existing
  Fortinet VPN into the office network.
* Only the reverse proxy publishes ports (443, and 80 for redirect). Bind to the server's
  LAN address with `AVA_BIND_ADDRESS`.
* Database, Redis and AI engine sit on a Docker network marked `internal` (no route out).
* Host-header allow-list (`ALLOWED_HOSTS`) and TLS SNI restrict requests to AVA's name.

### Transport
* HTTPS everywhere via Caddy — internal CA or office-issued certificate. HSTS enabled.
* Caddy never contacts public ACME CAs. TLS verification is never disabled in the product
  (the smoke test has an explicit test-only flag).

### Identity and sessions
* Individual accounts only; Argon2id password hashes; minimum 12 characters, mixed case,
  digit.
* Server-side sessions: random 256-bit tokens, only SHA-256 digests stored; cookie is
  `HttpOnly`, `Secure`, `SameSite=Lax`; 12-hour lifetime; revocable (sign-out, password
  change signs out other devices, deactivation ends all sessions immediately).
* Login rate limiting per email and per IP (Redis-backed in Compose); identical error for
  unknown user and wrong password; constant-work verification.
* SSO (OIDC / Google Workspace / LDAP) planned; schema ready (`auth_provider`).

### Request integrity
* CSRF: per-session token (hash stored) required in `X-CSRF-Token` on every non-GET
  request; CSRF cookie is `SameSite=Strict`. Login requires a JSON body.
* Input validation with Pydantic (lengths, enumerations, formats) on every field.
* Parameterised SQL only (SQLAlchemy expressions).
* XSS: React escapes all output; AVA answers are parsed into typed text blocks, never
  injected as HTML; strict Content-Security-Policy (`default-src 'self'`,
  `frame-ancestors 'none'`); `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`.
* Open-redirect protection on the sign-in `next` parameter.

### Authorisation
* All data endpoints require a session. Admin-only: user management, settings changes,
  audit log, detailed system status.
* Conversations are private to their author.
* Public endpoints expose only coarse health (`{"status": "ok"}`) and branding.

### AI-specific
* **Strict local mode** refuses external AI providers and non-private AI endpoints (in
  code, at start-up and per request).
* **Prompt-injection defence** (`ava/ai/prompting.py`): fixed system prompt; retrieved
  content wrapped in `<office_data>` blocks declared as untrusted data; forged delimiters
  neutralised; common injection phrases flagged; bounded context size.
* **Action safety model** (`ava/ai/actions.py`): READ and CREATE_DRAFT may run
  automatically; WRITE requires a preview and approval; DESTRUCTIVE requires explicit
  confirmation. The model never selects tools — the application does. Tools not in the
  registry cannot run. AVA never sends email.
* No fabrication: unbuilt modules and disconnected integrations are reported, not guessed.

### Audit
* Every sign-in (success and failure), write, admin action and AVA request is recorded
  with user, time, action type, resource, project, IP and result.
* Audit detail is scrubbed of keys containing password/token/secret/api_key/cookie and
  never contains chat text, email bodies or document content.

### Secrets
* No credentials in source. `.env` (mode 600, git-ignored) or a secrets manager;
  `.env.example` has no values. Production refuses to start without a ≥32-char
  `SECRET_KEY`, with `DEMO_MODE`, or without secure cookies.
* Integration tokens (Phase 2+) will be encrypted at rest with a key from the environment.
* Backups exclude `.env` unless explicitly requested (then flagged as sensitive).

### Data protection
* Source, index and generated data are separated; deleting an index never deletes
  originals. Projects are archived, not deleted.
* Nightly database backups with checksums and retention; tested restore procedure.

## Residual risks / follow-ups
* `script-src 'unsafe-inline'` is required by Next.js without nonces; move to nonce-based
  CSP when adopting middleware.
* In-process rate limiting applies when Redis is not configured (development only).
* Any LAN user can reach the sign-in page; consider restricting to office VLANs in
  Fortinet policy.
* Server disk encryption and OS hardening are the office's infrastructure responsibility.
