# Vibe Investor Usage (Command-First)

Single source of truth for day-to-day usage is the `command` section in:

- `opencode-config.json`

Use commands in OpenCode TUI with `/command-name`.

## Core Principle

- Do not use old standalone usage playbooks.
- Trigger workflows via commands.
- Keep memory updates inside the workflow run.

## How Vibe Investor Thinks (Concepts + School Of Thought)

- Market model: IDX is treated as Stock Market 2.0 where price can be driven by flow, narrative, technical structure, and fundamentals, not fundamentals alone.
- Decision style: risk-first and evidence-first; no actionable call without clear invalidation and downside control.
- Process style: fail-fast on missing dependencies, deterministic checks where possible, judgment only where needed.
- Technical lens: structure-first, chart-first, then numeric cross-check; if no valid setup, prefer `WAIT`.
- Fundamental lens: cash quality and conservative assumptions are prioritized over accounting optics or promotional assumptions.
- Narrative lens: narrative is treated as a pricing regime; catalyst timeline, priced-in state, and failure triggers must be explicit.
- Portfolio lens: capital preservation and process discipline dominate; sizing, heat, concentration, correlation, and liquidity constraints are enforced before conviction.
- Operating model: memory files are the operating surface (portfolio, watchlist, symbol plans, sessions), and command workflows should update them during execution.

## Command Catalog

## Technical

- `/ta-initial {SYMBOL} {INTENT}`
  - Example: `/ta-initial BBCA ENTRY`
- `/ta-update {SYMBOL} {INTENT} {PREVIOUS_REPORT_PATH}`
  - Example: `/ta-update BBCA HOLD work/BBCA_report_2026-02-14.md`
- `/ta-thesis {SYMBOL} {PREVIOUS_REPORT_PATH}`
  - Example: `/ta-thesis BBCA work/BBCA_report_2026-02-14.md`
- `/ta-postmortem {SYMBOL} {PREVIOUS_REPORT_PATH}`
  - Example: `/ta-postmortem BBCA work/BBCA_report_2026-02-14.md`
- `/ta-lens {SYMBOL} {LENS} {INTENT} {PREVIOUS_REPORT_PATH}`
  - Example: `/ta-lens BBCA SMC_ICT_LIGHT HOLD work/BBCA_report_2026-02-14.md`

## Portfolio Management

- `/pm-daily`
- `/pm-weekly`
- `/pm-entry {SYMBOL}`
  - Example: `/pm-entry BBCA`
- `/pm-add {SYMBOL} {CONTEXT}`
  - Example: `/pm-add BBCA tranche-1 green, add-on plan check`
- `/pm-exit {SYMBOL} {REASON}`
  - Example: `/pm-exit BBCA thesis invalidated governance risk`
- `/pm-rebalance`
- `/pm-watchlist {INSTRUCTIONS}`
  - Example: `/pm-watchlist Add TLKM WATCHING; move BBCA READY to ACTIVE`
- `/pm-validate {SYMBOL} {ENTRY} {STOP} {CAPITAL}`
  - Example: `/pm-validate ADRO 2500 2300 500000000`
- `/pm-sync {PORTFOLIO_INPUT}`
  - Example: `/pm-sync as_of=2026-02-22 cash=120000000 positions=[...]`

## Fundamental / Narrative / Triage

- `/fund {SYMBOL}`
  - Example: `/fund BBCA`
- `/narrative {SYMBOL}`
  - Example: `/narrative BBCA`
- `/triage {SYMBOL}`
  - Example: `/triage BBCA`
- `/weekly-intel {OPTIONAL_FOCUS}`
  - Example: `/weekly-intel danantara project`

## Recommended Daily/Weekly Flows

## Daily Desk

1. `/pm-daily`
2. `/ta-update {SYMBOL} HOLD {PREVIOUS_REPORT_PATH}` for names near key levels
3. `/pm-watchlist ...` if statuses change

## Weekly Review

1. `/pm-weekly`
2. `/triage {SYMBOL}` for each top holding/watchlist leader
3. `/weekly-intel {OPTIONAL_FOCUS}` to catch missed news/rumour/theme shifts
4. `/pm-rebalance` if drift/events appear

## New Position Workflow

1. `/fund {SYMBOL}`
2. `/narrative {SYMBOL}`
3. `/ta-initial {SYMBOL} ENTRY`
4. `/pm-entry {SYMBOL}`

## Post-Trade Learning

1. `/pm-exit {SYMBOL} {REASON}`
2. `/ta-postmortem {SYMBOL} {PREVIOUS_REPORT_PATH}`

## Notes

- Symbols should be 4-letter uppercase (`BBCA`, `TLKM`, `ADRO`).
- Non-initial TA commands require a previous report path.
- Portfolio workflows are expected to write memory files during execution.
- If required MCP/tool dependency fails, workflow should fail fast.
