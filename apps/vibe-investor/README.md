# Vibe Investor

OpenCode-based AI investment analyst and portfolio manager for the Indonesian Stock Market (IDX/BEI).

Single agent with on-demand skills and a knowledge catalog, built on the Stock Market 2.0 framework — four lenses: flow, narrative, technical, fundamental.

## Structure

```
apps/vibe-investor/
├── .env                          # Keys, paths (see .env.example)
├── opencode.json                 # Agent config (single vibe-investor agent)
├── bin/
│   ├── cli.sh                    # CLI entrypoint
│   └── web.sh                    # Web entrypoint
├── src/
│   ├── config-resolver.ts        # {env:...} and {file:...} resolution
│   └── resolve-config.ts         # Resolver entrypoint
├── .opencode/
│   ├── tools/
│   │   ├── fetch-ohlcv.ts        # Fetch 3yr OHLCV data for IDX stocks
│   │   ├── list-knowledge.ts     # Browse knowledge catalog entries
│   │   └── get-knowledge.ts      # Retrieve a knowledge entry by name
│   └── skills/                   # On-demand knowledge modules
│       ├── technical-analysis/
│       ├── fundamental-analysis/
│       ├── flow-analysis/
│       ├── narrative-analysis/
│       └── portfolio-management/
├── prompts/
│   └── vibe-investor/
│       └── main.md               # Base agent prompt
├── knowledge-catalog/            # Supplementary reference material
│   ├── banking-sector.md
│   ├── coal-sector.md
│   └── property-sector.md
├── memory-templates/             # Templates for init-memory.sh
└── scripts/
    └── init-memory.sh            # Initialize workspace memory
```

### Workspace ($OPENCODE_CWD)

```
$OPENCODE_CWD/
├── memory/                       # Persistent memory
│   ├── MEMORY.md                 # Global curated memory
│   ├── notes/
│   │   ├── portfolio.md          # Open/closed positions, P&L
│   │   └── watchlist.md          # Stocks under observation
│   ├── tickers/
│   │   └── {TICKER}.md           # Trading plan, thesis, key levels
│   ├── analysis/
│   │   └── {TICKER}/{DATE}/      # Analysis outputs + charts
│   └── sessions/
│       └── {DATE}.md             # Session logs
└── work/                         # Temporary scratch (delete anytime)
```

## Quick Setup

```bash
# 1. Install
pnpm install

# 2. Configure
cp .env.example .env
# Edit .env:
#   OPENROUTER_API_KEY=your_key
#   OPENCODE_CWD=/path/to/workspace
#   KNOWLEDGE_CATALOG_PATH=/path/to/knowledge-catalog

# 3. Initialize workspace memory
./scripts/init-memory.sh

# 4. Run
pnpm cli          # CLI mode
pnpm web          # Web UI mode
```

## Architecture

### Single Agent + On-Demand Skills

One `vibe-investor` agent with a lightweight base prompt. Deep domain knowledge is loaded on demand via OpenCode's skill system:

| Skill | Domain |
|-------|--------|
| `technical-analysis` | Wyckoff, S/R, price-volume, charting, execution |
| `fundamental-analysis` | Financial health, valuation methods, moat, risk |
| `flow-analysis` | Bandarmology, foreign flow, smart money |
| `narrative-analysis` | Catalysts, story, re-rating potential |
| `portfolio-management` | Position sizing, risk rules, reviews |

Skills are loaded as tool results and are protected from session compaction — they stay in context even as conversations grow long.

### Knowledge Catalog

Supplementary reference material that complements skills. Skills teach *how to analyze*; the knowledge catalog provides *domain-specific facts* (sector metrics, regulatory context, benchmarks).

- `list-knowledge(category?)` — Browse entries, optionally filter by category
- `get-knowledge(name)` — Load a specific entry

Knowledge entries are markdown files with frontmatter (`name`, `description`, `category`) stored at `KNOWLEDGE_CATALOG_PATH`.

### Memory System

Filesystem-based memory using markdown files.

- **`memory/MEMORY.md`** — Loaded at session start, curated context from past work
- **`memory/notes/`** — Portfolio positions, watchlist
- **`memory/tickers/`** — Per-ticker trading plans, theses, key levels
- **`memory/analysis/`** — Dated analysis outputs organized by ticker
- **`memory/sessions/`** — Daily session logs
- **`work/`** — Temporary scratch files (data, scripts, intermediate charts)

## Custom Tools

### fetch-ohlcv

Fetches 3 years of daily OHLCV data for Indonesian stocks from kb.akbarmr.dev. Saves to file to avoid context window bloat.

### list-knowledge / get-knowledge

Reads from the knowledge catalog directory (`KNOWLEDGE_CATALOG_PATH`). Each `.md` file has YAML frontmatter with `name`, `description`, and `category`. Categories: `technical-analysis`, `fundamental-analysis`, `flow-analysis`, `narrative-analysis`, `portfolio-management`.

## Configuration

### Config Placeholders

`opencode.json` supports:

- `{env:VAR_NAME}` — Environment variable substitution
- `{file:path/to/file}` — File content with EJS template processing

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key |
| `OPENCODE_CWD` | Yes | Workspace directory (memory, work files) |
| `KNOWLEDGE_CATALOG_PATH` | Yes | Path to knowledge catalog directory |
| `OPENCODE_DATA_HOME` | No | Session storage (default: `~/.local/share/vibe-investor`) |
| `OPENCODE_PORT` | No | Web UI port (default: 4096) |
| `OPENCODE_HOSTNAME` | No | Web UI hostname (default: 0.0.0.0) |

### Session Isolation

Vibe-investor uses a separate `XDG_DATA_HOME` so its sessions don't mix with your main coding OpenCode instance. Set via `OPENCODE_DATA_HOME` or defaults to `~/.local/share/vibe-investor`.

## How It Works

1. Bash script loads `.env` and calls TypeScript resolver to process `opencode.json`
2. Resolver expands `{env:...}` and `{file:...}` placeholders with EJS
3. Bash exports resolved config, sets `XDG_DATA_HOME`, and `exec`s opencode
4. OpenCode loads custom tools from `.opencode/tools/` and skills from `.opencode/skills/`
5. Agent loads `memory/MEMORY.md` at session start for context continuity

## References

- [OpenCode Docs](https://opencode.ai/docs)
- [OpenRouter](https://openrouter.ai/)
