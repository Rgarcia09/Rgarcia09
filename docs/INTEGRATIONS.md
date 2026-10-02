# Integrations

External office systems are connected through their **official APIs**. Connecting an
office system is not the same as using an external AI: files and messages move between
office systems and AVA's local index only.

Current status (Phase 1): **no integration is connected.** AVA reports each as
"not configured" (Today page, System status, `/health/dropbox|email|calendar`) and never
returns placeholder data.

## Dropbox (Phase 2)
* Office-owned Dropbox app (scoped access). Scopes: `files.metadata.read`,
  `files.content.read` (add `files.content.write` only when saving approved reports).
* OAuth by an administrator; refresh token encrypted at rest; never in logs.
* Project mapping: `projects.dropbox_path` now; `project_folders` for multiple folders.
* Sync: cursor-based `list_folder/continue` + webhooks where possible; per-file id, rev,
  content hash and index state; only new/changed files are processed.
* Dropbox remains the source of truth; AVA stores metadata, text chunks and vectors.

## Gmail / Google Workspace (Phase 3)
* OAuth **per employee**; minimum scopes `gmail.readonly` and `gmail.compose`
  (draft creation). Sending is a separate, explicit user action in the UI, never by AVA.
* No Google passwords stored; tokens encrypted.
* Project classification signals: project number, name, client, consultant addresses,
  subject, participants, prior classifications; correction UI feeds back into rules.

## Google Calendar (Phase 3)
* Scope `calendar.readonly` (write scope only if the office wants AVA to create events,
  which are WRITE actions requiring approval).
* Events linked to projects by number/name/participants; conflicts with registry dates
  are shown side by side, not silently resolved.

## Adding a connector — checklist
1. Development OAuth app and credentials separate from production.
2. Client module under `ava/integrations/<name>/`, tokens via the encrypted token store.
3. Sync job in the worker; idempotent; writes `sync_jobs` and updates `integrations`.
4. Health reporting through `services/integrations.py`.
5. AVA tools registered with correct `ActionType`; results always carry sources.
6. Tests with recorded fixtures — never against production accounts.
