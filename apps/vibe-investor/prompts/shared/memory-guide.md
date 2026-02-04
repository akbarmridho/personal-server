# Memory System

Your workspace has persistent memory and temporary work directories.

## Structure

```
$OPENCODE_CWD/
├── memory/                       # Persistent memory
│   ├── MEMORY.md                 # Global curated memory
│   ├── notes/                    # Flexible notes
│   │   ├── portfolio.md
│   │   └── watchlist.md
│   ├── tickers/                  # Per-ticker notes
│   │   ├── BBCA.md               # Trading plan, thesis, levels
│   │   └── GOTO.md
│   └── agents/technical-analyst/
│       ├── MEMORY.md             # Agent curated memory
│       ├── analysis/             # Analysis with artifacts
│       │   └── BBCA/
│       │       └── 2026-02-04/   # Folder per analysis
│       │           ├── analysis.md
│       │           ├── chart.png
│       │           └── levels.png
│       └── sessions/{DATE}.md    # Daily session logs
│
└── work/                         # Temporary scratch (delete anytime)
    ├── BBCA_ohlcv.json           # Raw data
    ├── temp_chart.png            # Working files
    └── analysis.py               # Scripts
```

## Usage

### Session Start

Load these at the beginning of each session:

- `memory/MEMORY.md` - Global curated
- `memory/agents/technical-analyst/MEMORY.md` - Agent curated

Other files (portfolio, watchlist, ticker notes) can be loaded dynamically when needed.

### When Analyzing a Ticker

1. **Work in scratch space**: Use `work/` for temporary files
   - Fetch data: `work/{TICKER}_ohlcv.json`
   - Generate charts: `work/{TICKER}_chart.png`
   - Write scripts: `work/analysis.py`

2. **Check past analyses**: `memory/agents/technical-analyst/analysis/{TICKER}/`

3. **Save final analysis**: Create folder with analysis + any artifacts you want to keep

   ```
   memory/agents/technical-analyst/analysis/{TICKER}/{DATE}/
   ├── analysis.md      # Your analysis text
   └── ...              # Any charts, data, scripts you want to keep
   ```

### Ticker Notes (`memory/tickers/{TICKER}.md`)

Each ticker gets a file with:

- Trading plan (entry, stop, targets)
- Thesis (why you're interested)
- Key levels (support, resistance)
- Notes (observations, foreign flow, etc.)

### Portfolio Updates

Track positions in `memory/notes/portfolio.md`:

- Open positions (entry, size, stop, targets, risk)
- Closed positions (exit, P&L)
- Performance notes

### Session Logs

Write to `memory/agents/technical-analyst/sessions/{TODAY}.md`:

- What tickers you analyzed
- Decisions made
- Key insights
- Tomorrow's plan

### Curated Memory Updates

When you learn something important, append to:

- `memory/agents/technical-analyst/MEMORY.md` - Agent-specific learnings
- `memory/MEMORY.md` - Global insights

## File Types

**Persistent (in `memory/`):**

- `MEMORY.md` - Global curated memory
- `notes/*.md` - Portfolio, watchlist, etc.
- `tickers/{TICKER}.md` - Per-ticker plans and notes
- `agents/*/MEMORY.md` - Agent curated knowledge
- `agents/*/analysis/{TICKER}/{DATE}/` - Analysis with artifacts (folder)
- `agents/*/sessions/{DATE}.md` - Session logs

**Temporary (in `work/`):**

- Raw data files (JSON, CSV)
- Working charts and images
- Analysis scripts
- Any intermediate files

Delete `work/` anytime - nothing important should stay there.
