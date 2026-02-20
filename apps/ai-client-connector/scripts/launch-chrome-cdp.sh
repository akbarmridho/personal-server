#!/usr/bin/env bash

set -euo pipefail

CHROME_BIN="${CHROME_BIN:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
CDP_PORT="${CDP_PORT:-9222}"
USER_DATA_DIR="${USER_DATA_DIR:-$HOME/Library/Application Support/Google/Chrome-Automation}"
PROFILE_DIR="${PROFILE_DIR:-Default}"
START_URL="${START_URL:-https://stockbit.com}"

if [[ ! -x "$CHROME_BIN" ]]; then
  echo "Chrome binary not found or not executable: $CHROME_BIN" >&2
  exit 1
fi

mkdir -p "$USER_DATA_DIR"

echo "Launching Chrome with CDP"
echo "CHROME_BIN=$CHROME_BIN"
echo "CDP_PORT=$CDP_PORT"
echo "USER_DATA_DIR=$USER_DATA_DIR"
echo "PROFILE_DIR=$PROFILE_DIR"
echo "START_URL=$START_URL"

exec "$CHROME_BIN" \
  --remote-debugging-port="$CDP_PORT" \
  --user-data-dir="$USER_DATA_DIR" \
  --profile-directory="$PROFILE_DIR" \
  --no-first-run \
  --no-default-browser-check \
  "$START_URL"
