#!/bin/sh
set -eu

MIN_JWT_SECRET_LENGTH=32
JWT_SECRET_FILE="${JWT_SECRET_FILE:-/app/data/jwt_secret}"

ensure_jwt_secret() {
  current="${JWT_SECRET:-}"
  current_len=${#current}

  if [ "$current_len" -ge "$MIN_JWT_SECRET_LENGTH" ]; then
    return 0
  fi

  secret_dir="$(dirname "$JWT_SECRET_FILE")"
  if ! mkdir -p "$secret_dir" 2>/dev/null; then
    JWT_SECRET_FILE="./data/jwt_secret"
    secret_dir="$(dirname "$JWT_SECRET_FILE")"
    mkdir -p "$secret_dir"
  fi

  if [ -f "$JWT_SECRET_FILE" ]; then
    persisted="$(tr -d '\r\n' < "$JWT_SECRET_FILE")"
    persisted_len=${#persisted}
    if [ "$persisted_len" -ge "$MIN_JWT_SECRET_LENGTH" ]; then
      export JWT_SECRET="$persisted"
      echo "[Entrypoint] Loaded JWT_SECRET from $JWT_SECRET_FILE (length=$persisted_len)."
      return 0
    fi
  fi

  generated="$(node -e "process.stdout.write(require('node:crypto').randomBytes(48).toString('base64url'))")"
  generated_len=${#generated}
  printf "%s" "$generated" > "$JWT_SECRET_FILE"
  chmod 600 "$JWT_SECRET_FILE" || true
  export JWT_SECRET="$generated"
  echo "[Entrypoint] Generated secure JWT_SECRET and stored at $JWT_SECRET_FILE (length=$generated_len)."
}

ensure_jwt_secret

echo "[Entrypoint] Starting database bootstrap (migrations + init scripts)..."
node ./scripts/db-bootstrap.js
echo "[Entrypoint] Database bootstrap completed."

if [ "${AUTO_SEED_ADMIN:-true}" = "true" ]; then
  if [ -n "${ADMIN_PASSWORD:-}" ]; then
    echo "[Entrypoint] Seeding admin user..."
    node ./scripts/seed-admin.mjs
    echo "[Entrypoint] Admin seed completed."
  else
    echo "[Entrypoint] AUTO_SEED_ADMIN=true but ADMIN_PASSWORD is not set; skipping admin seed."
  fi
fi

echo "[Entrypoint] Starting application: $*"
exec "$@"
