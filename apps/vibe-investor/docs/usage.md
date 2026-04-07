# Vibe Investor Usage

Use commands in OpenCode TUI with `/command-name`.

## Commands

- `/desk-check`
  - Main operating routine for holdings, `READY` watchlist names, leaders, and market context.
  - Uses `portfolio-management`, `technical-analysis`, and `narrative-analysis` internally.
  - Writes retained analysis artifacts and `memory/market/desk_check.md`.

- `/news-digest`
  - Builds a reading-oriented digest from new high-signal documents since the last successful digest.
  - Writes `memory/digests/{TODAY}_news_digest.md`.

- `/digest-sync`
  - Applies the latest digest to thesis and watchlist memory when changes are evidence-backed.

- `/ta {SYMBOL} {INTENT_IN_SENTENCE}`
  - Focused technical review for one symbol.
  - Example: `/ta BBCA thesis still intact after recent pullback?`

## Workflow Notes

`/desk-check`

- Coverage: holdings from `portfolio_state`, watchlist names in `READY`, leaders, and top-down market context
- Prep context: consult `memory/market/plan.md` and `get_state({ types: ["portfolio-monitor", "watchlist"] })`
- Continuity: uses the latest plugin-managed `desk-check` run log
- Main outputs: retained symbol and market artifacts, `desk_check.md`

`/news-digest`

- Coverage: new high-signal documents, market regime, macro context, thesis-relevant developments
- Memory context: start from `memory/market/plan.md` and `get_state({ types: ["symbols", "theses", "watchlist", "portfolio-monitor"] })`
- Main outputs: digest artifact

`/digest-sync`

- Input: latest digest artifact
- Main outputs: evidence-backed thesis and symbol-plan updates
- If evidence is ambiguous, stop and report `Needs Verification`

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
- Run logs are written by the OpenCode plugin under `memory/runs/`
