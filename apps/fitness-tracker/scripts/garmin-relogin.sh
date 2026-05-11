#!/usr/bin/env bash
# Re-authenticate with Garmin Connect and save fresh tokens.
# Removes existing tokens first to avoid stale token refresh failures.
# Run from apps/fitness-tracker directory.
#
# Usage:
#   ./scripts/garmin-relogin.sh <email> <password>
#   ./scripts/garmin-relogin.sh  (reads from .env GARMINCONNECT_EMAIL + GARMINCONNECT_BASE64_PASSWORD)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TOKEN_STORE="$ROOT_DIR/garminconnect-tokens"

# Wipe existing tokens to force a fresh login
if [ -d "$TOKEN_STORE" ]; then
  echo "Removing existing tokens at $TOKEN_STORE..."
  rm -rf "$TOKEN_STORE"
fi
mkdir -p "$TOKEN_STORE"

if [ $# -ge 2 ]; then
  EMAIL="$1"
  PASSWORD="$2"
else
  # Load from .env
  if [ -f "$ROOT_DIR/.env" ]; then
    set -a
    source "$ROOT_DIR/.env"
    set +a
  fi
  EMAIL="${GARMINCONNECT_EMAIL:-}"
  B64_PASS="${GARMINCONNECT_BASE64_PASSWORD:-}"
  if [ -z "$EMAIL" ] || [ -z "$B64_PASS" ]; then
    echo "Usage: $0 <email> <password>"
    echo "   or: set GARMINCONNECT_EMAIL and GARMINCONNECT_BASE64_PASSWORD in .env"
    exit 1
  fi
  PASSWORD=$(echo -n "$B64_PASS" | base64 -d)
fi

echo "Logging in as $EMAIL..."
echo "Token store: $TOKEN_STORE"

uv run --with garminconnect python3 -c "
from garminconnect import Garmin
g = Garmin('$EMAIL', '$PASSWORD')
g.login('$TOKEN_STORE')
print('✅ Login successful. Tokens saved to $TOKEN_STORE/garmin_tokens.json')
"
