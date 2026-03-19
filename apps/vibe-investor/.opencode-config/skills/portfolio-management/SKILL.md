---
name: portfolio-management
description: Internal trading-desk and portfolio operations subsystem for IDX equities, including desk-check reviews, position sizing, trading plans, watchlist process, and portfolio discipline routines.
---

## How To Use This Skill

Use this file as the entrypoint. Do not load every reference by default.

1. Classify the request by internal workflow type (see Common Workflows below).
2. Resolve an explicit reference-file list for the selected workflow.
3. Read the selected reference files before running the workflow.
4. Execute with tools and memory updates.
5. If the request spans multiple areas, resolve and read multiple reference sets deliberately.

Tool source of truth:

- Use `portfolio_state` as the source of truth for current holdings, cash, equity, and compact portfolio summary fields such as concentration and recent actions.
- Use `portfolio_trade_history` for raw trade rows and realized analytics depending on `view`.
- Use `portfolio_symbol_trade_journey` for symbol-level lifecycle review, current-position context, and postmortem setup.
- Use symbol memory as the durable operating plan, not as the live execution ledger.
- If a one-off calculation is still needed after using the portfolio tools, create and run a temporary script under `work/` and treat it as disposable scratch, not as a permanent skill script.

## Concepts And School Of Thought

- Treat portfolio management as a risk operating system: capital preservation first, return second.
- Size exposure with deterministic controls (1% risk rule, portfolio heat, concentration caps, 50:30:10, and correlation clustering).
- Enforce liquidity-aware execution using ADTV constraints so exits remain feasible under stress.
- Apply regime gate before new longs; if breadth/market structure weakens, reduce aggression and protect cash.
- Run workflow discipline end-to-end (entry, add, exit, rebalance, review) with explicit invalidation and process checks.
- Use memory files as the system of record; decisions are only complete when portfolio/watchlist/symbol/thesis states are updated.
- Consume technical exit doctrine from `technical-analysis`; this skill does not redefine raw chart-level TP rules.

## Reference Index And Topic Ownership

| File | Topics |
|------|--------|
| [enums-and-glossary.md](references/enums-and-glossary.md) | Shared statuses, labels, portfolio health flags |
| [position-sizing-and-diversification.md](references/position-sizing-and-diversification.md) | 1% risk rule, portfolio heat, 50:30:10, concentration caps, correlation sizing, liquidity/ADTV sizing, hard-loss fallback |
| [entry-exit-and-rebalancing-playbook.md](references/entry-exit-and-rebalancing-playbook.md) | Entry strategies (DCA, lump sum, scaling), exit strategies (profit taking, cut loss, early exit), rebalancing protocol |
| [trading-plan-template.md](references/trading-plan-template.md) | Per-symbol plan structure for `memory/state/symbols/{SYMBOL}.md` |
| [review-watchlist-and-review-logging.md](references/review-watchlist-and-review-logging.md) | Daily/weekly/monthly review cadence, watchlist management, retained review-summary templates |
| This file (SKILL.md) | Market regime gate, capital preservation principles, operating rules |

Reference boundary:

- References provide doctrine, checklists, and templates only.
- Workflow execution, write targets, and mutation rules are owned by this skill and the active workflow contract.

## Data Sources And Fail-Fast

| Source | Used for | If unavailable |
|--------|----------|----------------|
| `portfolio_state` | Current holdings, cash, equity, unrealized state, concentration summary, recent actions | Stop |
| `portfolio_trade_history` | Raw trade rows, realized history slices, and aggregate realized analytics | Stop |
| `portfolio_symbol_trade_journey` | Symbol-level lifecycle review, current-position context, and postmortem setup | Stop |
| `get-stock-financials` | Dividend checks, fundamental monitoring | Stop |
| `fetch-ohlcv` | Rolling return/correlation, rebalance diagnostics | Stop |
| `search-documents`, `list-documents` | Filings/news monitoring for open positions | Stop |
| Filesystem memory files | Primary operating surface | Stop |

Stop: if fetch fails, stop the task and report dependency failure.

## Memory Files

| File | Purpose |
|------|---------|
| `memory/notes/portfolio-monitor.md` | Current open-book classification, active monitor rules, health flags, and next portfolio-level focus |
| `memory/notes/watchlist.md` | Status-driven symbols registry and trigger conditions |
| `memory/state/symbols/{SYMBOL}.md` | Per-symbol plan, thesis, invalidation, sizing, and resolved execution policy |
| `memory/runs/{DATE}/{TIME}_desk-check.json` | Successful desk-check continuity log written by the parent workflow |
| `memory/analysis/symbols/{SYMBOL}/{DATE}/` | Supporting analysis artifacts |
| `memory/analysis/market/{DATE}/desk_check.md` | Top-level desk-check summary |

## Operating Rules

- Capital preservation is first priority; upside is secondary. A 50% loss requires 100% gain to recover.
- No thesis, no hold. If invalidation is hit, exit.
- Do not average down after thesis break.
- Position size must be liquidity-aware before entry.
- Keep portfolio heat controlled (max 5-6%); avoid hidden concentration via high correlation.
- Use only machine-verifiable rules for decisions (tool data + memory state), not discretionary outside context.
- If risk process is violated, fix process first before taking new exposure.
- Use `portfolio_state` and symbol-trade tools as live position truth; use symbol memory for the latest intended plan and exit policy.

## Market Regime Gate

Before any new long exposure, check market regime.

Evidence: `fetch-ohlcv` on market proxy + leader basket from `memory/notes/watchlist.md`.

- `PASS`: market proxy structure constructive, most leaders not in fresh breakdown. Normal sizing allowed.
- `FAIL`: broad weakness, leader breakdowns clustering. No aggressive new longs; pilot size or cash only.

## Deterministic vs Agent-Judgment Boundary

| Check | Type | How |
|-------|------|-----|
| Position weight vs 30% cap | Deterministic | Tool data: position value / total portfolio |
| Portfolio heat calculation | Deterministic | Sum of (risk per trade) across open positions |
| Correlation between holdings | Deterministic | `fetch-ohlcv` rolling correlation |
| ADTV liquidity check | Deterministic | Position size vs ADTV from tool data |
| 50:30:10 compliance | Deterministic | Category weights from memory + tool data |
| Sector concentration | Deterministic | Count per sector from memory |
| Thesis stale check | Deterministic | Last review date vs cadence |
| Regime gate pass/fail | Agent judgment | Interpret market proxy structure + leader breadth |
| Thesis quality assessment | Agent judgment | Synthesize fundamentals, narrative, flow |
| Cut-loss vs hold decision | Agent judgment | Evaluate whether decline is permanent impairment or noise |

## Common Workflows

### New Position Entry

1. Check regime gate (this file).
2. Load `position-sizing-and-diversification.md`.
3. Validate sizing against portfolio constraints (50:30:10, correlation, heat, ADTV liquidity).
4. Load `trading-plan-template.md`, fill all required fields including `Holding mode` and final exit precedence.
5. Write plan to `memory/state/symbols/{SYMBOL}.md`.
6. Update `memory/notes/watchlist.md` when the plan changes watchlist status or trigger conditions.

Checklist: regime gate checked, sizing validated, liquidity cleared, resolved execution policy written, memory files updated.

### Desk Check Review

1. Load `review-watchlist-and-review-logging.md` for cadence checklist.
2. Load `position-sizing-and-diversification.md` for constraint checks.
3. Call `portfolio_state` for holdings input and compact summary. If missing or malformed, stop.
4. Use `portfolio_trade_history` with `view: "events"` plus a tight `limit` when recent operator behavior matters for the review window.
5. Use `portfolio_symbol_trade_journey` for names that need symbol-level lifecycle context, realized review, or postmortem setup.
6. For each position: check thesis status, stop levels, invalidation quality, resolved execution policy, and sizing compliance from `portfolio_state`, symbol memory, and trade-history context.
7. Check portfolio-level: concentration, sizing flags, and recent action context from the tool outputs.
8. Extend coverage to watchlist symbols required by the active workflow contract.
9. Where the live operating plan changed materially, prepare symbol-memory updates for `holding_mode`, exit precedence, non-TA exit drivers, and other resolved execution-policy fields.
10. Prepare the updated portfolio-monitor state for the parent workflow: `Last updated`, open-book classification, active monitoring rules, current focus, and active portfolio health flags or discipline actions backed by the review evidence.
11. Return portfolio findings, portfolio-monitor update content, watchlist changes, and any required follow-up actions to the parent workflow.

Checklist: all holdings reviewed, sizing compliance checked, resolved execution-policy drift checked, portfolio-monitor update content prepared, portfolio findings returned to the parent workflow.

### Position Exit

1. Determine exit type: cut-loss, profit-taking, or early exit.
2. Load `entry-exit-and-rebalancing-playbook.md` for exit framework.
3. Execute exit, update `memory/state/symbols/{SYMBOL}.md` with close details and any final execution-policy outcome that matters for future review.
4. Update `memory/notes/watchlist.md` when the exit changes watchlist status or follow-up monitoring state.
5. Post-exit: evaluate process quality, not outcome.

Checklist: exit reason documented, symbol/watchlist memory updated where needed, process review noted.

### Rebalance Check

1. Load `entry-exit-and-rebalancing-playbook.md` (rebalancing protocol section).
2. Load `position-sizing-and-diversification.md` for target weights.
3. Check drift triggers (>20% deviation from target).
4. Check event triggers (thesis break, governance, liquidity).
5. For replacements: check correlation with remaining holdings.
6. Skip tiny trades with no material risk impact.

Checklist: drift measured, event triggers checked, replacement correlation validated, transaction cost considered.

## Execution Defaults

- When invoked by a parent workflow, coordinate findings with other active skills and return structured results.
- Run required data fetches in parallel when the task is a full portfolio or position review.
- Prefer portfolio tools first. Use temporary scripts in `work/` only for one-off calculations that the current tool surface does not provide.
- Write concrete outputs to memory files for portfolio-management workflows, not only narrative answers.
- Keep symbol-memory trade-management fields aligned with the parent workflow's resolved execution plan; do not let raw TA output bypass that synthesis layer.
- When constraints conflict (conviction vs liquidity, valuation vs correlation), prefer the safer sizing path.
- Check regime gate before any new long exposure.
- Flag any portfolio health warnings from `enums-and-glossary.md` (PM-W01 through PM-W10) when detected during any workflow.
