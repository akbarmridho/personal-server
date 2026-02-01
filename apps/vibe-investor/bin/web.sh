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
  export $(grep -v '^#' .env | grep -E 'OPENCODE_CWD|OPENCODE_PORT|OPENCODE_HOSTNAME' | xargs)
fi

WORK_DIR="${OPENCODE_CWD:-$(pwd)}"
PORT="${OPENCODE_PORT:-4096}"
HOSTNAME="${OPENCODE_HOSTNAME:-0.0.0.0}"

echo "🌐 Starting OpenCode Web Interface..."
echo "   Config: $ROOT_DIR/opencode.json"
echo "   CWD: $WORK_DIR"
echo "   URL: http://$HOSTNAME:$PORT"
echo ""

# Export resolved config for opencode
export OPENCODE_CONFIG_CONTENT="$RESOLVED_CONFIG"

# Point to vibe-investor's .opencode directory for custom tools/agents
export OPENCODE_CONFIG_DIR="$ROOT_DIR/.opencode"

# Launch opencode web (replace current process)
cd "$WORK_DIR"
exec opencode web --port="$PORT" --hostname="$HOSTNAME" "$@"
