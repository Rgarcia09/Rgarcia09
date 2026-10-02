# Shared helpers for AVA scripts. Reads single values from .env without executing it.
env_get() {
  local key="$1" default="${2:-}" line value
  line="$(grep -E "^${key}=" .env 2>/dev/null | tail -1 || true)"
  value="${line#*=}"
  value="${value%\"}"; value="${value#\"}"
  value="${value%\'}"; value="${value#\'}"
  if [[ -n "$line" && -n "$value" ]]; then printf '%s' "$value"; else printf '%s' "$default"; fi
}
