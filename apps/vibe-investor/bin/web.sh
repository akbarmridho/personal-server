#!/usr/bin/env bash

# Navigate to the vibe-investor directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

# Resolve config using TypeScript (outputs JSON to stdout)
# This also validates OPENROUTER_API_KEY via dotenv
RESOLVED_CONFIG=$(pnpm tsx src/resolve-config.ts) || {
  echo "Failed to resolve config"
  exit 1
}

# Load environment variables from .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -E 'OPENROUTER_API_KEY|OPENCODE_CWD|OPENCODE_PORT|OPENCODE_HOSTNAME|OPENCODE_DATA_HOME|EXA_API_KEY' | xargs)
fi

# Validate required variables
missing=()
[ -z "$OPENCODE_CWD" ] && missing+=("OPENCODE_CWD")
if [ ${#missing[@]} -gt 0 ]; then
  echo "Missing required environment variables: ${missing[*]}"
  echo "Add them to $ROOT_DIR/.env (see .env.example)"
  exit 1
fi

WORK_DIR="$OPENCODE_CWD"
PORT="${OPENCODE_PORT:-4096}"
HOSTNAME="${OPENCODE_HOSTNAME:-0.0.0.0}"

# Export resolved config for opencode
export OPENCODE_CONFIG_CONTENT="$RESOLVED_CONFIG"

# Point to vibe-investor's .opencode directory for custom tools/agents
export OPENCODE_CONFIG_DIR="$ROOT_DIR/.opencode"

# Isolate all OpenCode global state from the main coding opencode instance.
# Since `exec` replaces this process, XDG vars only affect opencode.
OPENCODE_HOME_BASE="${OPENCODE_DATA_HOME:-$HOME/.local/share/vibe-investor}"
export XDG_DATA_HOME="$OPENCODE_HOME_BASE/data"
export XDG_CONFIG_HOME="$OPENCODE_HOME_BASE/config"
export XDG_CACHE_HOME="$OPENCODE_HOME_BASE/cache"
export XDG_STATE_HOME="$OPENCODE_HOME_BASE/state"

echo "Starting OpenCode Web Interface..."
echo "   Config: $ROOT_DIR/opencode-config.json"
echo "   CWD: $WORK_DIR"
echo "   Data: $XDG_DATA_HOME/opencode/"
echo "   Config Home: $XDG_CONFIG_HOME/opencode/"
echo "   Cache: $XDG_CACHE_HOME/opencode/"
echo "   State: $XDG_STATE_HOME/opencode/"
echo "   URL: http://$HOSTNAME:$PORT"
echo ""

# Launch opencode web (replace current process)
cd "$WORK_DIR"
exec opencode web --port="$PORT" --hostname="$HOSTNAME" "$@"
