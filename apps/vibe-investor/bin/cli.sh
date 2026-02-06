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
  export $(grep -v '^#' .env | grep -E 'OPENCODE_CWD|OPENCODE_DATA_HOME|KNOWLEDGE_CATALOG_PATH|EXA_API_KEY' | xargs)
fi

# Validate required variables
missing=()
[ -z "$OPENCODE_CWD" ] && missing+=("OPENCODE_CWD")
[ -z "$KNOWLEDGE_CATALOG_PATH" ] && missing+=("KNOWLEDGE_CATALOG_PATH")
if [ ${#missing[@]} -gt 0 ]; then
  echo "Missing required environment variables: ${missing[*]}"
  echo "Add them to $ROOT_DIR/.env (see .env.example)"
  exit 1
fi

WORK_DIR="$OPENCODE_CWD"

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
