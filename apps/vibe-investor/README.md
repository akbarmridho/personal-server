# Vibe Investor

OpenCode AI agent setup for Indonesian stock market technical analysis.

## Structure

```
apps/vibe-investor/
├── .env                      # OPENROUTER_API_KEY, OPENCODE_CWD
├── opencode.json             # Agent config
├── bin/
│   ├── cli.sh                # CLI entrypoint
│   └── web.sh                # Web entrypoint
├── src/
│   ├── config-resolver.ts    # {env:...} and {file:...} resolution
│   └── resolve-config.ts     # CLI tool
├── .opencode/
│   └── tools/
│       └── fetch-ohlcv.ts    # Fetch Indonesian stock OHLCV data
├── prompts/
│   ├── shared/               # Shared prompts (available to all agents)
│   │   └── memory-guide.md
│   └── technical-analyst/
│       ├── main.md           # Main prompt (EJS includes)
│       ├── requirements.txt  # Python deps
│       └── modules/          # Agent-specific modules
└── memory-templates/         # Memory system templates

$OPENCODE_CWD/                # Workspace (where work happens)
├── memory/                   # Persistent memory
│   ├── MEMORY.md
│   ├── notes/                # Flexible notes (starting points)
│   │   ├── portfolio.md
│   │   └── watchlist.md
│   ├── tickers/              # Per-ticker notes and plans
│   │   ├── BBCA.md
│   │   └── GOTO.md
│   └── agents/technical-analyst/
│       ├── MEMORY.md
│       ├── analysis/         # Analysis with artifacts
│       │   └── BBCA/
│       │       └── 2026-02-04/
│       │           ├── analysis.md
│       │           └── ...   # Charts, data, scripts
│       └── sessions/{DATE}.md
│
└── work/                     # Temporary scratch (delete anytime)
    └── ...                   # Work files
```

## Quick Setup

```bash
# 1. Install
pnpm install
pip install -r prompts/technical-analyst/requirements.txt

# 2. Configure .env
cp .env.example .env
# Add:
#   OPENROUTER_API_KEY=your_key
#   OPENCODE_CWD=/path/to/workspace

# 3. Initialize memory
./scripts/init-memory.sh

# 4. Run
pnpm cli
# or
pnpm web
```

## Memory System

Simple filesystem-based memory using Markdown files + bash commands.

### Structure

```
$OPENCODE_CWD/
├── memory/                      # Persistent memory
│   ├── MEMORY.md                # Global curated
│   ├── notes/                   # Flexible notes
│   │   ├── portfolio.md
│   │   └── watchlist.md
│   ├── tickers/                 # Per-ticker notes
│   │   └── BBCA.md              # Trading plan, thesis, levels
│   └── agents/technical-analyst/
│       ├── MEMORY.md            # Agent curated
│       ├── analysis/            # Analysis with artifacts
│       │   └── BBCA/
│       │       └── 2026-02-04/  # Folder per analysis
│       │           ├── analysis.md
│       │           └── ...      # Charts, data, scripts
│       └── sessions/{DATE}.md   # Session logs
│
└── work/                        # Temporary scratch
    └── ...                      # Work files (delete anytime)
```

### How It Works

**AI auto-loads at session start:**

```bash
cat memory/MEMORY.md
cat memory/notes/portfolio.md
cat memory/notes/watchlist.md
cat memory/agents/technical-analyst/MEMORY.md
```

**AI writes after analyzing:**

```bash
cat >> "memory/agents/technical-analyst/analysis/BBCA/$(date +%Y-%m-%d).md" << 'EOF'
[Analysis here]
EOF
```

**AI searches past analysis:**

```bash
grep -r "BBCA" memory/agents/technical-analyst/analysis/
```

No custom tools needed - just bash and markdown.

See `prompts/technical-analyst/modules/memory-guide.md` for details.

## Custom Tools

### fetch-ohlcv

Fetch 3 years of OHLCV data for Indonesian stocks from kb.akbarmr.dev.

```typescript
fetch_ohlcv({
  ticker: "BBCA",
  output_path: "data/BBCA_ohlcv.json"
})
```

Returns: Daily OHLCV, foreign flow, trading frequency, company metrics.

## Configuration

### Config Placeholders

`opencode.json` supports:

- `{env:VAR_NAME}` - Environment variable
- `{file:path/to/file}` - File content with EJS processing

### EJS Includes in Prompts

EJS supports both relative and shared includes:

```markdown
# Main Prompt

# Relative includes (from current file's directory)
<%- include('modules/01-structure.md') %>
<%- include('modules/02-levels.md') %>

# Shared includes (from prompts/ directory)
<%- include('shared/memory-guide.md') %>
```

Shared prompts in `prompts/shared/` can be included from any agent.

### Environment Variables

**Required:**

- `OPENROUTER_API_KEY`

**Optional:**

- `OPENCODE_CWD` - Workspace directory (where memory lives)
- `OPENCODE_PORT` - Web server port (default: 4096)

## Adding Agents

1. Create `prompts/your-agent/main.md`
2. Add to `opencode.json`:

   ```json
   {
     "agent": {
       "your-agent": {
         "description": "...",
         "prompt": "{file:./prompts/your-agent/main.md}"
       }
     }
   }
   ```

3. Use: `/agent your-agent`

## How It Works

1. Bash script calls TypeScript resolver to process `opencode.json`
2. Resolver expands `{env:...}` and `{file:...}` placeholders
3. EJS processes includes in prompt files
4. Bash exports resolved config and execs opencode
5. OpenCode loads custom tools from `.opencode/` directory
6. AI loads memory from `$OPENCODE_CWD/memory/`

TypeScript only resolves config - no wrapper, no intermediate process.

## References

- [OpenCode Docs](https://opencode.ai/docs)
- [OpenRouter](https://openrouter.ai/)
