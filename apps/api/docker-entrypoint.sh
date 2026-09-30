#!/bin/sh
# Apply database migrations (idempotent), then start the API.
set -e
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  alembic upgrade head
fi
exec "$@"
