#!/usr/bin/env bash

# Initialize memory system in OPENCODE_CWD workspace

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VIBE_INVESTOR_DIR="$(dirname "$SCRIPT_DIR")"

# Load OPENCODE_CWD from .env
if [ -f "$VIBE_INVESTOR_DIR/.env" ]; then
  export $(grep -v '^#' "$VIBE_INVESTOR_DIR/.env" | grep OPENCODE_CWD | xargs)
fi

if [ -z "$OPENCODE_CWD" ]; then
  echo "OPENCODE_CWD not set in .env"
  echo ""
  echo "Add to $VIBE_INVESTOR_DIR/.env:"
  echo "  OPENCODE_CWD=/path/to/your/workspace"
  echo ""
  exit 1
fi

echo "Initializing memory system in: $OPENCODE_CWD"
echo ""

# Create directory structure
echo "Creating directory structure..."
mkdir -p "$OPENCODE_CWD/memory/notes"
mkdir -p "$OPENCODE_CWD/memory/notes/archive"
mkdir -p "$OPENCODE_CWD/memory/market/archive"
mkdir -p "$OPENCODE_CWD/memory/symbols"
mkdir -p "$OPENCODE_CWD/memory/theses"
mkdir -p "$OPENCODE_CWD/memory/digests"
mkdir -p "$OPENCODE_CWD/work"

# Copy templates (only if target doesn't already exist)
echo "Copying memory templates..."
for f in \
  market/plan.md \
  symbols/README.md \
  theses/README.md
do
  src="$VIBE_INVESTOR_DIR/memory-templates/$f"
  dst="$OPENCODE_CWD/memory/$f"
  if [ ! -f "$dst" ]; then
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
    if [[ "$f" == scripts/* ]]; then
      chmod +x "$dst"
    fi
  else
    echo "  Skipping $f (already exists)"
  fi
done

echo ""
echo "Memory system initialized!"
echo ""
echo "Structure:"
echo "  $OPENCODE_CWD/"
echo "  ├── memory/"
echo "  │   ├── market/"
echo "  │   │   ├── plan.md"
echo "  │   │   └── archive/"
echo "  │   ├── symbols/"
echo "  │   │   └── README.md"
echo "  │   ├── theses/"
echo "  │   │   └── README.md"
echo "  │   ├── digests/"
echo "  │   ├── notes/"
echo "  └── work/"
echo ""
echo "Start using:"
echo "  cd $VIBE_INVESTOR_DIR"
echo "  pnpm cli"
echo ""
