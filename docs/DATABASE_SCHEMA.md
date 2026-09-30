# Database Schema

PostgreSQL 16. Created by Alembic migration `0001` (`apps/api/alembic/versions`).
Extensions: `pg_trgm` (fuzzy search), `unaccent` (accent-insensitive matching);
`vector` is added in Phase 2. Primary keys are UUIDs except `audit_logs` (bigint).
All timestamps are `timestamptz` (UTC).

## Implemented (Phase 1)

### Identity
**users** — one row per employee. `email` (unique), `full_name`, `initials`,
`role` (`admin`|`staff`), `is_active`, `auth_provider` (`local`|`oidc`|`google`|`ldap`),
`external_subject` (for SSO), `password_hash` (Argon2id; null for SSO users),
`last_login_at`.

**user_sessions** — server-side sessions. `user_id`, `token_hash` (SHA-256, unique),
`csrf_hash`, `created_at`, `expires_at`, `last_seen_at`, `revoked_at`, `ip_address`,
`user_agent`. Raw tokens are never stored.

### Directory
**clients** — `name`, `billing_name`, `billing_address`, `email`, `phone`, `notes`,
`is_active`. Trigram index on `name`.

**client_contacts** — `client_id` → clients (cascade), `full_name`, `title`, `email`,
`phone`, `is_primary`, `notes`.

**consultants** — firm: `company_name`, `discipline` (check: civil, structural,
mechanical, electrical, plumbing, landscape, geotechnical, surveying, contractor,
owner_representative, permitting, environmental, other), `email`, `phone`, `website`,
`address`, `notes`, `is_active`.

**consultant_contacts** — `consultant_id` → consultants (cascade), `full_name`, `title`,
`email`, `phone`.

### Project registry
**projects** — `project_number` (unique text), `name`, `short_name`, `client_id` →
clients (set null), `location`, `project_type`, `status` (prospect, active, on_hold,
completed, cancelled), `phase` (pre_design … closeout), `project_manager_id` → users,
`contract_number`, `contract_value numeric(14,2)`, `start_date`, `deadline` (next
deadline), `construction_start`, `construction_end`, `billing_notes`, `dropbox_path`,
`notes`, `tags text[]`, `is_archived`, `created_by_id`, `updated_by_id`.
Trigram indexes on number, name, short name, location.

**project_staff** — (`project_id`, `user_id`) PK, `role_on_project`.

**project_consultants** — `project_id`, `consultant_id`, `contact_id` (optional; must
belong to the firm — enforced in the service), `discipline`, `scope_notes`.
Unique (`project_id`, `consultant_id`, `discipline`).

### AVA
**ai_conversations** — `user_id` (owner; private), `project_id` (context), `title`.

**ai_messages** — `conversation_id`, `role` (`user`|`assistant`), `content`,
`sources jsonb` (list of `{kind,label,url}`), `produced_by` (`structured`,
`unavailable`, or `provider:model`).

### Operations
**audit_logs** — append-only: `occurred_at`, `user_id`, `user_email` (snapshot),
`action` (e.g. `project.update`), `action_type` (AUTH, READ, CREATE_DRAFT, WRITE,
DESTRUCTIVE, ADMIN), `resource_type`, `resource_id`, `project_id`, `result` (success,
denied, error), `ip_address`, `detail jsonb` (field names, intent — never secrets or
content).

**app_settings** — key/value (`jsonb`) for admin-editable, non-secret settings.

**integrations** — one row per connector (`dropbox`, `gmail`, `google_calendar`):
`status` (not_configured, connected, error, disabled), `last_sync_at`, `last_error`,
`config jsonb` (non-secret). Absent row = not configured.

**sync_jobs** — job history: `job_type`, `status` (queued, running, succeeded, failed,
cancelled), timestamps, `error`, `stats jsonb`, `triggered_by_id`.

## Planned (later phases)

| Phase | Tables |
|---|---|
| 2 | `project_folders`, `documents`, `document_versions`, `document_chunks` (`tsvector` + `vector`), `integration_tokens` (encrypted) |
| 3 | `emails`, `email_threads`, `email_project_links` (with correction history), `calendar_events`, `calendar_event_projects` |
| 4 | `invoices`, `payments`, `invoice_reviews`, `billing_validations` |
| 5 | `document_templates`, `numbering_rules`, `generated_documents` (draft/approved), `reports` |
| 6 | `rfis`, `submittals`, `meetings`, `meeting_attendees`, `action_items`, `project_milestones`, `project_contacts`, `priority_overrides` |

Relationships always go through `projects.id`; free-text copies of client or consultant
data are avoided.
