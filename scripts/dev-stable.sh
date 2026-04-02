#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Stop stale/duplicate next dev processes for this repository.
PIDS="$(pgrep -f "$ROOT_DIR/node_modules/.+next/dist/bin/next dev" || true)"
if [[ -n "$PIDS" ]]; then
  echo "[dev-stable] Stopping existing next dev process(es): $PIDS"
  while IFS= read -r pid; do
    [[ -n "$pid" ]] && kill "$pid" || true
  done <<< "$PIDS"
  sleep 1
fi

LOCK_FILE="$ROOT_DIR/.next/dev/lock"
if [[ -f "$LOCK_FILE" ]]; then
  echo "[dev-stable] Removing stale lock: $LOCK_FILE"
  rm -f "$LOCK_FILE"
fi

# Load env files for preflight (Next.js applies its own env loading afterward).
set -a
[[ -f "$ROOT_DIR/.env" ]] && source "$ROOT_DIR/.env"
[[ -f "$ROOT_DIR/.env.local" ]] && source "$ROOT_DIR/.env.local"
set +a

node "$ROOT_DIR/scripts/dev-preflight.js"

DEV_BUNDLER="${AMEEN_DEV_BUNDLER:-turbopack}"
if [[ "$DEV_BUNDLER" == "webpack" ]]; then
  echo "[dev-stable] Starting Next.js dev server with webpack (compat mode)"
  exec "$ROOT_DIR/node_modules/.bin/next" dev --webpack
fi

echo "[dev-stable] Starting Next.js dev server with turbopack (fast mode)"
exec "$ROOT_DIR/node_modules/.bin/next" dev --turbopack
