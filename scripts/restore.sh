#!/usr/bin/env bash
# Restore AVA's database from a backup folder created by scripts/backup.sh.
# DESTRUCTIVE: replaces the current AVA database contents. Requires typing RESTORE.
#
#   scripts/restore.sh backups/ava-20260930-013000
set -euo pipefail
cd "$(dirname "$0")/.."
. scripts/lib.sh
src="${1:?usage: restore.sh BACKUP_FOLDER}"
[[ -f "$src/ava.dump" ]] || { echo "No ava.dump in $src"; exit 1; }
( cd "$src" && sha256sum -c SHA256SUMS ) || { echo "Checksum mismatch — aborting."; exit 1; }

echo "This will REPLACE the current AVA database with the backup in: $src"
echo "Original Dropbox files are not affected."
read -r -p "Type RESTORE to continue: " answer
[[ "$answer" == "RESTORE" ]] || { echo "Aborted."; exit 1; }

echo "Stopping application containers…"
docker compose stop api web
echo "Restoring database…"
docker compose exec -T db pg_restore -U ava -d ava --clean --if-exists --no-owner < "$src/ava.dump"
echo "Starting application containers (migrations run automatically)…"
docker compose start api web
echo "Restore complete. Verify at https://$(env_get AVA_HOSTNAME ava.office.local)/settings (System status)."
