#!/usr/bin/env bash
# First-time setup: checks prerequisites and creates .env with generated secrets.
# Safe to re-run: never overwrites an existing .env.
set -euo pipefail
cd "$(dirname "$0")/.."

command -v docker >/dev/null || { echo "Docker is required."; exit 1; }
docker compose version >/dev/null || { echo "Docker Compose v2 is required."; exit 1; }

if [[ -f .env ]]; then
  echo ".env already exists — leaving it unchanged."
else
  secret() { openssl rand -base64 "$1" | tr -d '\n/+=' ; }
  sed -e "s|^SECRET_KEY=.*|SECRET_KEY=$(secret 48)|" \
      -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(secret 32)|" \
      .env.example > .env
  chmod 600 .env
  echo "Created .env with generated SECRET_KEY and POSTGRES_PASSWORD."
  echo "Review AVA_HOSTNAME, AVA_BIND_ADDRESS, OFFICE_NAME and AI settings before starting."
fi

mkdir -p backups
chmod 700 backups
echo
echo "Next steps:"
echo "  docker compose up -d --build                  # add --profile local-ai to run Ollama here"
echo "  scripts/create-admin.sh                        # create the first administrator"
echo "  See docs/DEPLOYMENT.md for DNS and certificate setup."
