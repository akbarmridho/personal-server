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
  export $(grep -v '^#' .env | grep -E 'OPENROUTER_API_KEY|OPENCODE_CWD|OPENCODE_DATA_HOME|EXA_API_KEY' | xargs)
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

# Export resolved config for opencode
export OPENCODE_CONFIG_CONTENT="$RESOLVED_CONFIG"

# Point to vibe-investor's .opencode-config directory for custom tools/agents
export OPENCODE_CONFIG_DIR="$ROOT_DIR/.opencode-config"

# Isolate all OpenCode global state from the main coding opencode instance.
# Since `exec` replaces this process, XDG vars only affect opencode.
OPENCODE_HOME_BASE="${OPENCODE_DATA_HOME:-$HOME/.local/share/vibe-investor}"
export XDG_DATA_HOME="$OPENCODE_HOME_BASE/data"
export XDG_CONFIG_HOME="$OPENCODE_HOME_BASE/config"
export XDG_CACHE_HOME="$OPENCODE_HOME_BASE/cache"
export XDG_STATE_HOME="$OPENCODE_HOME_BASE/state"

# Provide `python` alias behavior via PATH shim when only `python3` exists.
# This survives `exec opencode`, unlike bash aliases.
if ! command -v python >/dev/null 2>&1 && command -v python3 >/dev/null 2>&1; then
  SHIM_BIN_DIR="$OPENCODE_HOME_BASE/bin"
  mkdir -p "$SHIM_BIN_DIR"
  ln -sf "$(command -v python3)" "$SHIM_BIN_DIR/python"
  export PATH="$SHIM_BIN_DIR:$PATH"
fi

# Launch opencode CLI (replace current process)
cd "$WORK_DIR"
exec opencode "$@"
