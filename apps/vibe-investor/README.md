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
    │   │   ├── fetch-broker-flow.ts  # Fetch daily broker-flow series for IDX stocks
    │   │   └── deep-doc-extract.ts   # Goal-based large-doc extraction via OpenRouter
    │   └── skills/                   # On-demand knowledge modules
    │       ├── flow-analysis/
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
│   ├── market/
│   │   ├── plan.md               # IHSG regime + macro operating stance
│   │   ├── technical.md          # Current market TA
│   │   ├── narrative.md          # Current market narrative
│   │   ├── desk_check.md
│   │   ├── deep_review.md
│   │   ├── explore_idea.md
│   │   └── archive/
│   ├── symbols/{SYMBOL}/         # Durable plans + current symbol artifacts
│   │   ├── plan.md
│   │   ├── technical.md
│   │   ├── narrative.md
│   │   ├── flow.md
│   │   └── archive/
│   ├── theses/{THESIS_ID}/       # Durable thesis state
│   │   ├── thesis.md
│   │   └── subtheses/
│   ├── digests/
│   │   └── {DATE}_news_digest.md
│   ├── notes/
│   │   ├── agent-performance.md
│   │   └── opportunity-cost.md
└── work/                         # Temporary scratch (delete anytime)
```

## Primary Workflows

- `/desk-check`
  - Main operator routine: news digest → sync → holdings/watchlist review → portfolio discipline.
- `/deep-review`
  - Slower full audit of portfolio quality, watchlist hygiene, neglected names, thesis freshness, and process quality.
- `/explore-idea`
  - Discovery workflow for fresh ideas outside the active operating set plus dormant internal candidates worth revisiting.
- `/memory-maintenance`
  - Audit memory files for schema drift, fix frontmatter, clean work folder, flag stale and orphaned artifacts.

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
pip install -r requirements.txt

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

### Optional CLI Tooling

Recommended for faster local memory and file operations:

```bash
# macOS
brew install ripgrep jq fzf fd

# Ubuntu / Debian
sudo apt install ripgrep jq fzf fd-find
```

Notes:

- `rg` is the default fast search tool for memory recall.
- `jq` is useful for inspecting tool output.
- `fzf` is optional for interactive selection.
- On some Debian-based systems, `fd-find` installs the binary as `fdfind` instead of `fd`.

## Architecture

### Single Agent + On-Demand Skills

One `vibe-investor` agent with a lightweight base prompt. Deep domain knowledge is loaded on demand via OpenCode's skill system:

| Skill | Domain |
|-------|--------|
| `flow-analysis` | Broker flow, sponsor quality, trust regime, lead/confirm context |
| `technical-analysis` | Wyckoff, S/R, price-volume, charting, execution |
| `fundamental-analysis` | Financial health, valuation methods, moat, risk |
| `narrative-analysis` | Catalysts, story, re-rating potential |
| `portfolio-management` | Position sizing, risk rules, reviews |

Skills are loaded as tool results and are protected from session compaction — they stay in context even as conversations grow long.

### Memory System

Filesystem-based memory using markdown files.

- **`memory/market/plan.md`** — IHSG regime map, macro stance, and operating levels
- **`memory/symbols/{SYMBOL}/plan.md`** — Authoritative durable per-symbol plans with strict YAML frontmatter
- **`memory/theses/{THESIS_ID}/thesis.md`** — Authoritative durable per-thesis state
- **`memory/digests/{DATE}_news_digest.md`** — Retained digest artifact
- **`memory/notes/agent-performance.md`** — Rolling process-quality notes
- **`memory/notes/opportunity-cost.md`** — WAIT-age and missed-move ledger
- **`work/`** — Temporary scratch files (data, scripts, intermediate charts)

Source-of-truth split:

- Portfolio tools own live holdings, fills, and realized actions.
- `memory/symbols/{SYMBOL}/plan.md` and `memory/theses/{THESIS_ID}/thesis.md` own durable symbol/thesis state.
- `get_state` derives symbol, thesis, watchlist, and portfolio-monitor views on demand from live frontmatter.

Recommended local CLI tools for memory work:

- `rg` for fast content recall across memory
- `jq` for inspecting `get_state` output
- optional: `fzf` for interactive file/result selection

## Custom Tools

### get_state

Reads live symbol/thesis frontmatter and derives watchlist or portfolio-monitor views on demand.

### fetch-ohlcv

Fetches 3 years of daily OHLCV data for Indonesian stocks from kb.akbarmr.dev. Saves to file to avoid context window bloat.

### fetch-broker-flow

Fetches a normalized daily broker-flow series for Indonesian stocks from kb.akbarmr.dev. Saves to file to avoid context window bloat.

Default broker-flow fetch window is `60` trading days so downstream builders can use a `30D` primary read and a `60D` trust window from the same raw payload.

### deep-doc-extract

One-off extraction for PDFs/images without embeddings. Pass only:

- `goal`: what to extract
- `sources`: array of strings (each item is either a downloadable URL or local file path, relative/absolute)

The tool sends these sources directly to OpenRouter Gemini Flash Lite via AI SDK.

### portfolio_state

Reads the latest normalized portfolio snapshot from `AI_CONNECTOR_DATA_ROOT`, with optional compact summary fields such as position count, cash ratio, top positions, and a recent-actions preview.

### portfolio_trade_history

Reads normalized trade history from `AI_CONNECTOR_DATA_ROOT` as raw events or realized analytics, depending on `view`.

### portfolio_symbol_trade_journey

Reconstructs one symbol's normalized trade lifecycle and merges it with current holding context from the latest portfolio snapshot.

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
| `AI_CONNECTOR_DATA_ROOT` | Yes | Connector-owned data root for normalized portfolio and trade data |
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

## References

- [OpenCode Docs](https://opencode.ai/docs)
- [OpenRouter](https://openrouter.ai/)
