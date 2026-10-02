# Backup and Restore

## What is backed up
| Item | Included | Notes |
|---|---|---|
| PostgreSQL (`ava` database) | ✅ | projects, clients, consultants, users, audit log, conversations, settings, job history; from Phase 2 also document metadata and vector index |
| Compose file and Caddy config | ✅ | |
| `.env` (secrets) | only with `INCLUDE_ENV=true` | store such backups encrypted |
| Caddy internal CA (`caddy_data` volume) | ❌ by default | back up once after installation (below) |
| Dropbox files | ❌ | Dropbox stays the source of truth; AVA never duplicates the repository |
| Ollama models | ❌ | re-downloadable |

## Running a backup
```bash
scripts/backup.sh
```
Creates `backups/ava-YYYYMMDD-HHMMSS/` with `ava.dump` (pg_dump custom format, verified
readable), config copies and `SHA256SUMS`, records the run in AVA (Settings → System
status → Last backup), and removes backup folders older than `BACKUP_RETENTION_DAYS`
(default 30).

Schedule nightly (host crontab):
```
30 1 * * *  cd /opt/ava && scripts/backup.sh >> /var/log/ava-backup.log 2>&1
```
Copy `backups/` to a second location (NAS, encrypted offsite) — a backup on the same
disk does not protect against disk failure.

Once after installation, keep the internal CA so device trust survives a rebuild:
```bash
docker compose cp proxy:/data/caddy ./backups/caddy-data-$(date +%F)
```

## Restoring
```bash
scripts/restore.sh backups/ava-20260930-013000
```
1. Verifies checksums.
2. Asks you to type `RESTORE` (anything else aborts).
3. Stops `api` and `web`, restores the database with `pg_restore --clean`, restarts them
   (migrations then bring an older backup up to the current schema).

Everything recorded after the backup (including the record of that backup itself) is
replaced by the backup's contents. Dropbox files are not affected.

## Full server loss
1. Install Docker; `git clone` the repository at the same version (or newer).
2. Restore `.env` from secure storage (or run `scripts/setup.sh` and reset passwords).
3. Restore `caddy_data` if you kept it, else re-distribute the new root CA.
4. `docker compose up -d --build`, then `scripts/restore.sh <backup>`.
5. Verify in Settings → System status and with a few AVA questions.

## Verified
The backup → modify → restore round trip was tested on 2026-09-30 in the development
environment (ENVIRONMENT.md). Repeat a test restore quarterly on a spare machine.
