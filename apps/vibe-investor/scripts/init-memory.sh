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
mkdir -p "$OPENCODE_CWD/memory/notes/portfolio_inputs"
mkdir -p "$OPENCODE_CWD/memory/notes/actions"
mkdir -p "$OPENCODE_CWD/memory/scripts"
mkdir -p "$OPENCODE_CWD/memory/symbols"
mkdir -p "$OPENCODE_CWD/memory/templates"
mkdir -p "$OPENCODE_CWD/memory/analysis/symbols"
mkdir -p "$OPENCODE_CWD/memory/analysis/market"
mkdir -p "$OPENCODE_CWD/memory/analysis/themes"
mkdir -p "$OPENCODE_CWD/memory/sessions"
mkdir -p "$OPENCODE_CWD/work"

# Copy templates (only if target doesn't already exist)
echo "Copying memory templates..."
for f in \
  MEMORY.md \
  INDEX.md \
  notes/portfolio.md \
  notes/watchlist.md \
  notes/theses_active.md \
  notes/theses_archived.md \
  templates/symbol_note_template.md \
  analysis/INDEX.md \
  scripts/portfolio_calc.py
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
echo "  │   ├── MEMORY.md"
echo "  │   ├── INDEX.md"
echo "  │   ├── notes/"
echo "  │   │   ├── portfolio.md"
echo "  │   │   ├── portfolio_inputs/"
echo "  │   │   ├── actions/"
echo "  │   │   ├── theses_active.md"
echo "  │   │   ├── theses_archived.md"
echo "  │   │   └── watchlist.md"
echo "  │   ├── scripts/"
echo "  │   ├── symbols/"
echo "  │   ├── templates/"
echo "  │   ├── analysis/"
echo "  │   │   ├── INDEX.md"
echo "  │   │   ├── symbols/"
echo "  │   │   ├── market/"
echo "  │   │   └── themes/"
echo "  │   └── sessions/"
echo "  └── work/"
echo ""
echo "Start using:"
echo "  cd $VIBE_INVESTOR_DIR"
echo "  pnpm cli"
echo ""
