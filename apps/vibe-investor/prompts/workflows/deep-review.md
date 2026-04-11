# Deep Review Workflow

Resolve the effective `TRADING_DAY` and review mode in WIB using the parent prompt's trading-day clock, then run `deep-review`.

Command input may narrow symbol focus, tighten the date window, or add output emphasis if that remains compatible with this contract.

## Contract

- Purpose: full audit of the current operating system: portfolio quality, thesis health, process quality, and cleanup.
- Coverage universe: all holdings from `portfolio_state`, active theses, watchlist symbols in `READY`, watchlist symbols marked as leaders, and a required resurfacing set of stale or neglected watchlist names and symbol plans.
- Continuity window: 30 calendar days.
- Mandatory memory context: `memory/market/plan.md`, all files in `memory/notes/` (list and read), `get_state`, and the latest prior deep review if found.
- Additional top-down: portfolio behavior versus `IHSG` plus relevant leaders.
- Run order: `portfolio-management` first for holdings, realized and unrealized review, concentration/heat/cash-overlay checks, stale-plan detection, best-ideas-density review, and neglected-watchlist resurfacing; then delegated symbol or thesis review batches plus top-down market review in parallel; then parent synthesis.
- Required review dimensions: current book coherence, best-ideas density, equity-curve and decision-process review, benchmark and leader comparison, stale plans, style drift, re-entry discipline, hidden clustering, scenario review-back, thesis hygiene, and watchlist cleanup.
- Flow analysis is most relevant when holdings or resurfaced names need sponsor-quality refresh or when lead / confirm / warning context could change the conclusion materially.
- Narrative analysis prioritizes catalyst drift, story decay, crowding changes, and fresh invalidation evidence over full report formatting.
- Fundamental analysis is selective: use it when thesis quality, accounting quality, ownership risk, or structural deterioration cannot be judged honestly from the existing evidence set.

## Output

For each materially reviewed symbol, produce a `symbol_review` per the synthesis contract in main.md.

Additionally, the deep review must surface:

- Thesis health trends across the portfolio (which theses are strengthening, which are weakening)
- Process quality observations (missed opportunities, decision patterns, systematic biases)
- Items requiring human decision (stale positions, conflicting signals, thesis drift)
- Cleanup proposals (stale plans to archive, watchlist entries to remove, theses to retire)

- Symbol artifacts must include the retained files needed for names reviewed materially in this workflow.
- Market artifacts must include `deep_review.md`.
