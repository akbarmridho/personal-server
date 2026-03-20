# Vibe Investor Usage

Use commands in OpenCode TUI with `/command-name`.

## Commands

- `/desk-check`
  - Main operating routine for holdings, `READY` watchlist names, leaders, and market context.
  - Uses `portfolio-management`, `technical-analysis`, and `narrative-analysis` internally.
  - Writes retained analysis artifacts, `memory/analysis/market/{TODAY}/desk_check.md`, and a success run log.

- `/news-digest`
  - Builds a reading-oriented digest from new high-signal documents since the last successful digest.
  - Writes `memory/analysis/market/{TODAY}/news_digest.md` and its success run log.

- `/digest-sync`
  - Applies the latest digest to thesis and watchlist memory when changes are evidence-backed.
  - Writes `memory/analysis/market/{TODAY}/digest_sync.md`.

- `/ta {SYMBOL} {INTENT_IN_SENTENCE}`
  - Focused technical review for one symbol.
  - Example: `/ta BBCA thesis still intact after recent pullback?`

## Workflow Notes

`/desk-check`

- Coverage: holdings from `portfolio_state`, watchlist names in `READY`, leaders, and top-down market context
- Prep context: consult `memory/notes/ihsg.md`, `memory/notes/macro.md`, and `memory/notes/portfolio-monitor.md`
- Continuity: uses the latest successful `desk-check` run log
- Main outputs: retained symbol and market artifacts, `desk_check.md`, success run log

`/news-digest`

- Coverage: new high-signal documents, market regime, macro context, thesis-relevant developments
- Memory context: start from `memory/MEMORY.md` and the dedicated market context notes under `memory/notes/`
- Main outputs: digest artifact and success run log

`/digest-sync`

- Input: latest digest artifact
- Main outputs: evidence-backed thesis and watchlist updates plus `digest_sync.md`
- If evidence is ambiguous, records `Needs Verification` in `digest_sync.md`

`/ta`

- Modes auto-select from context: `INITIAL`, `UPDATE`, `POSTMORTEM`
- Inside `desk-check`, technical review defaults to `UPDATE` when prior plan context exists and `INITIAL` otherwise

## Data Sources

- Current holdings come from `portfolio_state`
- Trade history comes from `portfolio_trade_history`
- Symbol lifecycle review comes from `portfolio_symbol_trade_journey`

## Portfolio Backfill

- Manual Stockbit history backfill files belong under `AI_CONNECTOR_DATA_ROOT/stockbit/raw/history-backfill/YYYY-MM-DD/`
- Use stable names such as `page-001.json`, `page-002.json`
- Restart the connector or rerun the capture task after adding files
- Connector derives deterministic `captured_at` values from the directory date plus the `page-XXX.json` number

## Rules

- Use uppercase 4-letter symbols such as `BBCA`, `TLKM`, `ADRO`
- Prefer `/desk-check` as the default portfolio routine
- Use `/news-digest` and `/digest-sync` together when digest findings should update memory
- All workflows fail fast on required dependency failures
