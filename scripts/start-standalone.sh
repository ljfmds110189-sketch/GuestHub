#!/usr/bin/env bash
set -euo pipefail

MIN_JWT_SECRET_LENGTH=32
JWT_SECRET_FILE="${JWT_SECRET_FILE:-./data/jwt_secret}"

ensure_jwt_secret() {
  local current="${JWT_SECRET:-}"
  local current_len=${#current}

  if [[ "$current_len" -ge "$MIN_JWT_SECRET_LENGTH" ]]; then
    return 0
  fi

  mkdir -p "$(dirname "$JWT_SECRET_FILE")"

  if [[ -f "$JWT_SECRET_FILE" ]]; then
    local persisted
    persisted="$(tr -d '\r\n' < "$JWT_SECRET_FILE")"
    local persisted_len=${#persisted}
    if [[ "$persisted_len" -ge "$MIN_JWT_SECRET_LENGTH" ]]; then
      export JWT_SECRET="$persisted"
      echo "[start-standalone] Loaded JWT_SECRET from $JWT_SECRET_FILE (length=$persisted_len)."
      return 0
    fi
  fi

  local generated
  generated="$(node -e "process.stdout.write(require('node:crypto').randomBytes(48).toString('base64url'))")"
  local generated_len=${#generated}
  printf "%s" "$generated" > "$JWT_SECRET_FILE"
  chmod 600 "$JWT_SECRET_FILE" 2>/dev/null || true
  export JWT_SECRET="$generated"
  echo "[start-standalone] Generated secure JWT_SECRET and stored at $JWT_SECRET_FILE (length=$generated_len)."
}

if [[ ! -f ".next/standalone/server.js" ]]; then
  echo "[start-standalone] Missing .next/standalone/server.js. Run 'npm run build' first." >&2
  exit 1
fi

ensure_jwt_secret

mkdir -p ".next/standalone/.next"
rm -rf ".next/standalone/.next/static"
cp -R ".next/static" ".next/standalone/.next/static"

rm -rf ".next/standalone/.next/server"
cp -R ".next/server" ".next/standalone/.next/server"

for manifest in \
  BUILD_ID \
  app-path-routes-manifest.json \
  routes-manifest.json \
  prerender-manifest.json \
  build-manifest.json \
  fallback-build-manifest.json \
  images-manifest.json \
  required-server-files.json \
  required-server-files.js \
  next-server.js.nft.json \
  next-minimal-server.js.nft.json \
  package.json
do
  if [[ -f ".next/$manifest" ]]; then
    cp ".next/$manifest" ".next/standalone/.next/$manifest"
  fi
done

if [[ -d "public" ]]; then
  rm -rf ".next/standalone/public"
  cp -R "public" ".next/standalone/public"
fi

exec node ".next/standalone/server.js"
