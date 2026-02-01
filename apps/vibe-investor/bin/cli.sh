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

# Load custom CWD from .env if set
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep OPENCODE_CWD | xargs)
fi

WORK_DIR="${OPENCODE_CWD:-$(pwd)}"

# Export resolved config for opencode
export OPENCODE_CONFIG_CONTENT="$RESOLVED_CONFIG"

# Point to vibe-investor's .opencode directory for custom tools/agents
export OPENCODE_CONFIG_DIR="$ROOT_DIR/.opencode"

# Launch opencode CLI (replace current process)
cd "$WORK_DIR"
exec opencode "$@"
