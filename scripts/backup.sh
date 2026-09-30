#!/usr/bin/env bash
# Back up AVA's database (projects, clients, audit log, conversations, settings and — from
# Phase 2 — vector index data) plus non-secret configuration. Dropbox files are NOT copied:
# Dropbox remains their source of truth.
#
#   scripts/backup.sh                 # database + config
#   INCLUDE_ENV=true scripts/backup.sh   # also copy .env (contains secrets: store securely)
#
# Schedule with cron, e.g.:  30 1 * * *  /opt/ava/scripts/backup.sh >> /var/log/ava-backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."
. scripts/lib.sh

BACKUP_DIR="${BACKUP_DIR:-$(env_get BACKUP_DIR ./backups)}"
RETENTION="${BACKUP_RETENTION_DAYS:-$(env_get BACKUP_RETENTION_DAYS 30)}"
stamp="$(date +%Y%m%d-%H%M%S)"
dest="$BACKUP_DIR/ava-$stamp"
umask 077
mkdir -p "$dest"

echo "[$(date -Is)] Backing up database…"
docker compose exec -T db pg_dump -U ava -d ava --format=custom --no-owner > "$dest/ava.dump"
docker compose exec -T db pg_restore --list < "$dest/ava.dump" > /dev/null   # verify readability

cp docker-compose.yml "$dest/"
cp -r infrastructure/caddy "$dest/caddy"
if [[ "${INCLUDE_ENV:-false}" == "true" && -f .env ]]; then
  cp .env "$dest/env"
  echo "WARNING: backup includes secrets (.env). Store it encrypted."
fi
( cd "$dest" && sha256sum ava.dump > SHA256SUMS )

size="$(du -sh "$dest" | cut -f1)"
docker compose exec -T api python -m ava.cli record-job --type backup --status succeeded \
  --stat "path=$dest" --stat "size=$size" >/dev/null || true
echo "[$(date -Is)] Backup complete: $dest ($size)"

# Retention: remove backup folders older than RETENTION days (only inside BACKUP_DIR).
find "$BACKUP_DIR" -maxdepth 1 -type d -name 'ava-*' -mtime "+$RETENTION" -print -exec rm -rf {} + || true
