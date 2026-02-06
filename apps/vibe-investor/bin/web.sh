#!/usr/bin/env bash

# Navigate to the vibe-investor directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

# Resolve config using TypeScript (outputs JSON to stdout)
RESOLVED_CONFIG=$(pnpm tsx src/resolve-config.ts) || {
  echo "❌ Failed to resolve config"
  exit 1
}

# Load environment variables from .env if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -E 'OPENCODE_CWD|OPENCODE_PORT|OPENCODE_HOSTNAME|OPENCODE_DATA_HOME' | xargs)
fi

WORK_DIR="${OPENCODE_CWD:-$(pwd)}"
PORT="${OPENCODE_PORT:-4096}"
HOSTNAME="${OPENCODE_HOSTNAME:-0.0.0.0}"

# Export resolved config for opencode
export OPENCODE_CONFIG_CONTENT="$RESOLVED_CONFIG"

# Point to vibe-investor's .opencode directory for custom tools/agents
export OPENCODE_CONFIG_DIR="$ROOT_DIR/.opencode"

# Isolate session/state storage from the main coding opencode instance.
# Since `exec` replaces this process, XDG vars only affect opencode.
export XDG_DATA_HOME="${OPENCODE_DATA_HOME:-$HOME/.local/share/vibe-investor}"

echo "🌐 Starting OpenCode Web Interface..."
echo "   Config: $ROOT_DIR/opencode.json"
echo "   CWD: $WORK_DIR"
echo "   Data: $XDG_DATA_HOME/opencode/"
echo "   URL: http://$HOSTNAME:$PORT"
echo ""

# Launch opencode web (replace current process)
cd "$WORK_DIR"
exec opencode web --port="$PORT" --hostname="$HOSTNAME" "$@"
