#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo "[reconcile-db-password] .env file not found in $ROOT_DIR"
  echo "Create .env with POSTGRES_PASSWORD first."
  exit 1
fi

read_env_value() {
  local key="$1"
  local raw
  raw="$(grep -E "^${key}=" .env | tail -n 1 | cut -d '=' -f2- || true)"
  raw="${raw%$'\r'}"

  # Remove optional surrounding quotes.
  if [[ "$raw" =~ ^\".*\"$ ]]; then
    raw="${raw:1:${#raw}-2}"
  elif [[ "$raw" =~ ^\'.*\'$ ]]; then
    raw="${raw:1:${#raw}-2}"
  fi

  printf '%s' "$raw"
}

POSTGRES_USER="$(read_env_value POSTGRES_USER)"
POSTGRES_DB="$(read_env_value POSTGRES_DB)"
POSTGRES_PASSWORD="$(read_env_value POSTGRES_PASSWORD)"

POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-guesthub}"

if [[ -z "$POSTGRES_PASSWORD" ]]; then
  echo "[reconcile-db-password] POSTGRES_PASSWORD is empty in .env"
  exit 1
fi

echo "[reconcile-db-password] Ensuring postgres container is running..."
docker compose up -d postgres >/dev/null

echo "[reconcile-db-password] Applying password to database role '$POSTGRES_USER'..."
docker exec -u postgres guesthub-postgres psql -d postgres -v ON_ERROR_STOP=1 -c "ALTER USER \"$POSTGRES_USER\" WITH PASSWORD '$POSTGRES_PASSWORD';"

echo "[reconcile-db-password] Verifying connectivity with new password..."
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" guesthub-postgres psql -h localhost -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 'ok' AS status;" >/dev/null

echo "[reconcile-db-password] Done. Database credentials are synchronized."
