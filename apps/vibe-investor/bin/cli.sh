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

# Load custom CWD and data home from .env if set
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -E 'OPENCODE_CWD|OPENCODE_DATA_HOME|KNOWLEDGE_CATALOG_PATH' | xargs)
fi

WORK_DIR="${OPENCODE_CWD:-$(pwd)}"

# Export resolved config for opencode
export OPENCODE_CONFIG_CONTENT="$RESOLVED_CONFIG"

# Point to vibe-investor's .opencode directory for custom tools/agents
export OPENCODE_CONFIG_DIR="$ROOT_DIR/.opencode"

# Isolate session/state storage from the main coding opencode instance.
# Since `exec` replaces this process, XDG vars only affect opencode.
export XDG_DATA_HOME="${OPENCODE_DATA_HOME:-$HOME/.local/share/vibe-investor}"

# Launch opencode CLI (replace current process)
cd "$WORK_DIR"
exec opencode "$@"
