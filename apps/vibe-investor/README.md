# Vibe Investor

OpenCode-based AI investment analyst and portfolio manager for the Indonesian Stock Market (IDX/BEI).

Single agent with on-demand skills, built on the Stock Market 2.0 framework — four lenses: flow, narrative, technical, fundamental.

## Structure

```
apps/vibe-investor/
├── .env                          # Keys, paths (see .env.example)
├── opencode-config.json                 # Agent config (single vibe-investor agent)
├── bin/
│   ├── cli.sh                    # CLI entrypoint
│   └── web.sh                    # Web entrypoint
├── src/
│   ├── config-resolver.ts        # {env:...} and {file:...} resolution
│   └── resolve-config.ts         # Resolver entrypoint
├── .opencode-config/
│   ├── tools/
│   │   ├── fetch-ohlcv.ts        # Fetch 3yr OHLCV data for IDX stocks
│   │   └── deep-doc-extract.ts   # Goal-based large-doc extraction via OpenRouter
│   └── skills/                   # On-demand knowledge modules
│       ├── technical-analysis/
│       ├── fundamental-analysis/
│       ├── narrative-analysis/
│       └── portfolio-management/
├── prompts/
│   └── vibe-investor/
│       └── main.md               # Base agent prompt
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
│   │   ├── thesis.md             # Thesis index
│   │   └── watchlist.md          # Stocks under observation
│   ├── runs/                     # Successful workflow run logs
│   ├── state/
│   │   ├── symbols/{SYMBOL}.md   # Trading plan, thesis, key levels
│   │   └── theses/{THESIS_ID}/thesis.md
│   ├── analysis/
│   │   ├── symbols/{SYMBOL}/{DATE}/
│   │   └── market/{DATE}/        # desk_check.md, digest_sync.md, news_digest.md, top-down outputs
└── work/                         # Temporary scratch (delete anytime)
```

## Primary Workflows

- `/desk-check`
  - Main operator routine for holdings, `READY` watchlist names, leaders, and top-down market context (`IHSG + macro + leaders`).
- `/news-digest`
  - Reading-oriented digest from new documents and memory continuity.
  - Writes a retained digest artifact plus its run log.
- `/digest-sync`
  - Applies evidence-backed digest updates to thesis/watchlist memory and writes a retained sync summary.
- `/ta {SYMBOL} {INTENT}`
  - Manual technical deep dive when one symbol needs closer review.

Portfolio state and trade history come from connector-owned normalized files under `AI_CONNECTOR_DATA_ROOT`, exposed to the agent through custom tools.

Connector-owned data root:

- `AI_CONNECTOR_DATA_ROOT=/Users/akbar.maulana.ridho/vibe-investing-data/client-connector-data`

Normalized files used by `vibe-investor`:

- `stockbit/normalized/latest_portfolio.json`
- `stockbit/normalized/trades.jsonl`

## Quick Setup

```bash
# 0. Dependencies
brew install ghostscript

# 1. Install
pnpm install

# 2. Configure
cp .env.example .env
# Edit .env:
#   OPENROUTER_API_KEY=your_key
#   OPENCODE_CWD=/path/to/vibe-investing-data/opencode-run
#   AI_CONNECTOR_DATA_ROOT=/path/to/vibe-investing-data/client-connector-data

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
| `narrative-analysis` | Catalysts, story, re-rating potential |
| `portfolio-management` | Position sizing, risk rules, reviews |

Skills are loaded as tool results and are protected from session compaction — they stay in context even as conversations grow long.

### Memory System

Filesystem-based memory using markdown files.

- **`memory/MEMORY.md`** — Loaded at session start, curated context from past work
- **`memory/notes/`** — Thesis index and watchlist
- **`memory/runs/`** — One JSON log per successful top-level workflow run
- **`memory/state/symbols/`** — Per-symbol trading plans, theses, key levels
- **`memory/state/theses/`** — Per-thesis durable state and lifecycle updates
- **`memory/analysis/`** — Dated analysis outputs organized by symbol
- **`work/`** — Temporary scratch files (data, scripts, intermediate charts)

## Custom Tools

### fetch-ohlcv

Fetches 3 years of daily OHLCV data for Indonesian stocks from kb.akbarmr.dev. Saves to file to avoid context window bloat.

### deep-doc-extract

One-off extraction for PDFs/images without embeddings. Pass only:

- `goal`: what to extract
- `sources`: array of strings (each item is either a downloadable URL or local file path, relative/absolute)

The tool sends these sources directly to OpenRouter Gemini Flash Lite via AI SDK.

### portfolio_state

Reads the latest normalized portfolio snapshot from `AI_CONNECTOR_DATA_ROOT`.

### portfolio_trade_history

Reads normalized trade events from `AI_CONNECTOR_DATA_ROOT` with optional symbol/date/command filters.

### portfolio_symbol_trade_journey

Reconstructs one symbol's normalized trade lifecycle from the connector-owned trade ledger.

## Configuration

### Config Placeholders

`opencode-config.json` supports:

- `{env:VAR_NAME}` — Environment variable substitution
- `{file:path/to/file}` — File content with EJS template processing

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key |
| `OPENCODE_CWD` | Yes | Workspace directory (memory, work files) |
| `AI_CONNECTOR_DATA_ROOT` | No | Connector-owned data root (default: sibling `client-connector-data` next to `OPENCODE_CWD`) |
| `OPENCODE_DATA_HOME` | No | Session storage (default: `~/.local/share/vibe-investor`) |
| `OPENCODE_PORT` | No | Web UI port (default: 4096) |
| `OPENCODE_HOSTNAME` | No | Web UI hostname (default: 0.0.0.0) |

### Session Isolation

Vibe-investor uses a separate `XDG_DATA_HOME` so its sessions don't mix with your main coding OpenCode instance. Set via `OPENCODE_DATA_HOME` or defaults to `~/.local/share/vibe-investor`.

## How It Works

1. Bash script loads `.env` and calls TypeScript resolver to process `opencode-config.json`
2. Resolver expands `{env:...}` and `{file:...}` placeholders with EJS
3. Bash exports resolved config, sets `XDG_DATA_HOME`, and `exec`s opencode
4. OpenCode loads custom tools from `.opencode-config/tools/` and skills from `.opencode-config/skills/`
5. Agent loads `memory/MEMORY.md` at session start for context continuity

## References

- [OpenCode Docs](https://opencode.ai/docs)
- [OpenRouter](https://openrouter.ai/)
