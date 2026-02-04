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
  echo "❌ OPENCODE_CWD not set in .env"
  echo ""
  echo "Add to $VIBE_INVESTOR_DIR/.env:"
  echo "  OPENCODE_CWD=/path/to/your/workspace"
  echo ""
  exit 1
fi

echo "🎯 Initializing memory system in: $OPENCODE_CWD"
echo ""

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p "$OPENCODE_CWD/memory/notes"
mkdir -p "$OPENCODE_CWD/memory/tickers"
mkdir -p "$OPENCODE_CWD/memory/agents/technical-analyst/analysis"
mkdir -p "$OPENCODE_CWD/memory/agents/technical-analyst/sessions"

# Copy templates
echo "📋 Copying memory templates..."
cp "$VIBE_INVESTOR_DIR/memory-templates/MEMORY.md" \
   "$OPENCODE_CWD/memory/MEMORY.md"

cp "$VIBE_INVESTOR_DIR/memory-templates/notes/portfolio.md" \
   "$OPENCODE_CWD/memory/notes/portfolio.md"

cp "$VIBE_INVESTOR_DIR/memory-templates/notes/watchlist.md" \
   "$OPENCODE_CWD/memory/notes/watchlist.md"

cp "$VIBE_INVESTOR_DIR/memory-templates/agents/technical-analyst/MEMORY.md" \
   "$OPENCODE_CWD/memory/agents/technical-analyst/MEMORY.md"

# Create .gitignore
echo "🔒 Creating .gitignore..."
cat > "$OPENCODE_CWD/memory/.gitignore" << 'EOF'
# Ignore append-only logs (too much churn)
agents/*/sessions/
agents/*/analysis/

# Keep curated memory (version control these)
!MEMORY.md
!notes/
!tickers/
!agents/*/MEMORY.md
EOF

echo ""
echo "✅ Memory system initialized!"
echo ""
echo "📝 Structure created:"
echo "   $OPENCODE_CWD/memory/"
echo "   ├── MEMORY.md"
echo "   ├── notes/"
echo "   │   ├── portfolio.md"
echo "   │   └── watchlist.md"
echo "   ├── tickers/"
echo "   └── agents/technical-analyst/"
echo ""
echo "🚀 Start using:"
echo "   cd $VIBE_INVESTOR_DIR"
echo "   pnpm cli"
echo ""
