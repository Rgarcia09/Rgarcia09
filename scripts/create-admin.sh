#!/usr/bin/env bash
# Create an individual administrator account (prompts for the password).
#   scripts/create-admin.sh admin@office.com "Full Name"
set -euo pipefail
cd "$(dirname "$0")/.."
email="${1:?usage: create-admin.sh EMAIL "FULL NAME"}"
name="${2:?usage: create-admin.sh EMAIL "FULL NAME"}"
docker compose exec api python -m ava.cli create-user --email "$email" --name "$name" --admin
