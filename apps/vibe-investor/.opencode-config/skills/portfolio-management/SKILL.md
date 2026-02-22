---
name: portfolio-management
description: Trading desk and portfolio operations for IDX equities, including position sizing, entry/exit playbooks, trading plans, watchlist process, and session review routines.
---

## How To Use This Skill

Use this file as the entrypoint. Do not load every reference by default.

1. Classify the request by workflow type (see Common Workflows below).
2. Load only the relevant reference files.
3. Execute with tools and memory updates.
4. If the request spans multiple areas, load multiple references deliberately.

## Concepts And School Of Thought

- Treat portfolio management as a risk operating system: capital preservation first, return second.
- Size exposure with deterministic controls (1% risk rule, portfolio heat, concentration caps, 50:30:10, and correlation clustering).
- Enforce liquidity-aware execution using ADTV constraints so exits remain feasible under stress.
- Apply regime gate before new longs; if breadth/market structure weakens, reduce aggression and protect cash.
- Run workflow discipline end-to-end (entry, add, exit, rebalance, review) with explicit invalidation and process checks.
- Use memory files as the system of record; decisions are only complete when portfolio/watchlist/symbol/session states are updated.

## Reference Index And Topic Ownership

| File | Topics |
|------|--------|
| [enums-and-glossary.md](references/enums-and-glossary.md) | Shared statuses, labels, portfolio health flags |
| [position-sizing-and-diversification.md](references/position-sizing-and-diversification.md) | 1% risk rule, portfolio heat, 50:30:10, concentration caps, correlation sizing, liquidity/ADTV sizing, hard-loss fallback |
| [entry-exit-and-rebalancing-playbook.md](references/entry-exit-and-rebalancing-playbook.md) | Entry strategies (DCA, lump sum, scaling), exit strategies (profit taking, cut loss, early exit), rebalancing protocol |
| [trading-plan-template.md](references/trading-plan-template.md) | Per-symbol plan structure for `memory/symbols/{SYMBOL}.md` |
| [review-watchlist-and-session-logging.md](references/review-watchlist-and-session-logging.md) | Daily/weekly/monthly review cadence, watchlist management, session log templates |
| This file (SKILL.md) | Market regime gate, capital preservation principles, operating rules |

## Data Sources And Fail-Fast

| Source | Used for | If unavailable |
|--------|----------|----------------|
| `get-stock-keystats` | Current price, key stats for P&L and sizing | Stop |
| `get-stock-financials` | Dividend checks, fundamental monitoring | Stop |
| `fetch-ohlcv` | Rolling return/correlation, rebalance diagnostics | Stop |
| `search-documents`, `list-documents` | Filings/news monitoring for open positions | Stop |
| Filesystem memory files | Primary operating surface | Stop |

Stop: if fetch fails, stop the task and report dependency failure.

## Memory Files

| File | Purpose |
|------|---------|
| `memory/notes/portfolio.md` | Open and closed positions, P&L tracking |
| `memory/notes/watchlist.md` | Status-driven symbols registry and trigger conditions |
| `memory/symbols/{SYMBOL}.md` | Per-symbol plan, thesis, invalidation, sizing |
| `memory/sessions/{DATE}.md` | Session logs and next actions |
| `memory/analysis/symbols/{SYMBOL}/{DATE}/` | Supporting analysis artifacts |

## Operating Rules

- Capital preservation is first priority; upside is secondary. A 50% loss requires 100% gain to recover.
- No thesis, no hold. If invalidation is hit, exit.
- Do not average down after thesis break.
- Position size must be liquidity-aware before entry.
- Keep portfolio heat controlled (max 5-6%); avoid hidden concentration via high correlation.
- Use only machine-verifiable rules for decisions (tool data + memory state), not discretionary outside context.
- If risk process is violated, fix process first before taking new exposure.

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
4. Load `trading-plan-template.md`, fill all required fields.
5. Write plan to `memory/symbols/{SYMBOL}.md`.
6. Update `memory/notes/portfolio.md` and `memory/notes/watchlist.md`.

Checklist: regime gate checked, sizing validated, liquidity cleared, plan written with all required fields, memory files updated.

### Weekly Review

1. Load `review-watchlist-and-session-logging.md` for cadence checklist.
2. Load `position-sizing-and-diversification.md` for constraint checks.
3. Fetch current prices via `get-stock-keystats` for all held positions (parallel).
4. For each position: check thesis status, stop levels, sizing compliance.
5. Check portfolio-level: heat, correlation, 50:30:10, sector limits.
6. Update watchlist statuses.
7. Write session log to `memory/sessions/{DATE}.md`.

Checklist: all positions reviewed, sizing compliance checked, correlation checked, heat calculated, watchlist updated, session logged.

### Position Exit

1. Determine exit type: cut-loss, profit-taking, or early exit.
2. Load `entry-exit-and-rebalancing-playbook.md` for exit framework.
3. Execute exit, update `memory/symbols/{SYMBOL}.md` with close details.
4. Update `memory/notes/portfolio.md` with realized P&L.
5. Post-exit: evaluate process quality, not outcome.

Checklist: exit reason documented, memory files updated, P&L recorded, process review noted.

### Rebalance Check

1. Load `entry-exit-and-rebalancing-playbook.md` (rebalancing protocol section).
2. Load `position-sizing-and-diversification.md` for target weights.
3. Check drift triggers (>20% deviation from target).
4. Check event triggers (thesis break, governance, liquidity).
5. For replacements: check correlation with remaining holdings.
6. Skip tiny trades with no material risk impact.

Checklist: drift measured, event triggers checked, replacement correlation validated, transaction cost considered.

## Execution Defaults

- Run required data fetches in parallel when the task is a full portfolio or position review.
- Write concrete outputs to memory files for portfolio-management workflows, not only narrative answers.
- When constraints conflict (conviction vs liquidity, valuation vs correlation), prefer the safer sizing path.
- Check regime gate before any new long exposure.
- Flag any portfolio health warnings from `enums-and-glossary.md` (PM-W01 through PM-W07) when detected during any workflow.
