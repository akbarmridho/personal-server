# Vibe Investor Usage

Use commands in OpenCode TUI with `/command-name`.

## Commands

- `/desk-check`
  - Daily routine: news digest → digest sync → holdings/watchlist review → portfolio discipline.
  - Use `skip-digest` argument to skip news ingestion (e.g., mid-day re-check).
  - Writes digest, symbol artifacts, and `memory/market/desk_check.md`.

- `/deep-review`
  - Full audit of portfolio quality, thesis health, process quality, stale plans, and watchlist cleanup.
  - Writes symbol artifacts and `memory/market/deep_review.md`.

- `/explore-idea`
  - Discovery workflow for fresh ideas outside the active operating set plus dormant internal candidates.
  - Writes `memory/market/explore_idea.md`. Does not mutate watchlist/thesis state.

- `/memory-maintenance`
  - Audit memory files for schema drift, fix frontmatter, clean work folder, flag stale and orphaned artifacts.
  - Accepts optional scope narrowing (e.g., `symbols only`, `cleanup only`).

## Workflow Notes

`/desk-check`

- Phase 1: Collect news/documents since last digest, sync evidence-backed changes to thesis/watchlist memory
- Phase 2: Portfolio constraints, IHSG context, cash-overlay checks
- Phase 3: Delegated symbol reviews (TA, flow, narrative) in parallel batches
- Phase 4: Synthesis with triage — most symbols get a one-liner, only material changes get full reviews
- Coverage: holdings from `portfolio_state`, watchlist names in `READY`, leaders, top-down market context
- Prep context: `memory/market/plan.md`, `get_state({ types: ["portfolio-monitor", "watchlist"] })`

`/deep-review`

- Coverage: all holdings, active theses, READY watchlist, leaders, plus stale/neglected names
- Includes thesis health trends, process quality audit, and cleanup proposals

`/explore-idea`

- External discovery + internal resurfacing of dormant candidates
- Outputs thesis candidate summaries for human evaluation
- Promotion to watchlist/thesis requires explicit follow-up

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
- `/desk-check` is the default daily routine — handles digest, review, and discipline in one command
- All workflows fail fast on required dependency failures
