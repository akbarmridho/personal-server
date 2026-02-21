---
name: portfolio-management
description: Trading desk and portfolio operations for IDX equities, including position sizing, entry/exit playbooks, cycle-aware allocation, trading plans, watchlist process, and session review routines.
---

## How To Use This Skill

Use this file as the entrypoint. Do not load every reference by default.

1. Classify the request.
2. Load only the relevant reference files from the index below.
3. Execute with tools and memory updates.
4. If the request spans multiple areas, load multiple references deliberately.

## Reference Index (Modular)

- [Capital protection and loss math](references/capital-protection-and-loss-math.md)
Use for drawdown math, portfolio blow-up prevention, and money management failure checks.

- [Position sizing and diversification](references/position-sizing-and-diversification.md)
Use for category mix, concentration caps, correlation-aware sizing, and per-trade risk sizing.

- [Liquidity three-board rule](references/liquidity-three-board-rule.md)
Use for exit-liquidity sizing constraints before entering or scaling positions.

- [Entry, exit, and rebalancing playbook](references/entry-exit-and-rebalancing-playbook.md)
Use for weekly-monthly execution discipline, invalidation, staged exits, and rebalance rules.

- [Economic cycle and sector rotation](references/economic-cycle-and-sector-rotation.md)
Use for top-down allocation changes across contraction/recovery/expansion/recession phases.

- [Trading plan template](references/trading-plan-template.md)
Use when creating or updating `memory/symbols/{SYMBOL}.md`.

- [Portfolio review, watchlist, and session logging](references/review-watchlist-and-session-logging.md)
Use for daily/weekly/monthly process and operating logs in memory files.

## Data Sources

- `get-stock-fundamental`: current price and key stats for P&L and sizing sanity checks.
- `get-stock-financials`: dividend checks and fundamental monitoring for held positions.
- `fetch-ohlcv`: daily prices for rolling return/correlation and rebalance diagnostics.
- `search-documents`, `list-documents`: filings/news monitoring for open positions.
- Filesystem memory files: primary operating surface.

## Memory Files

| File | Purpose |
|------|---------|
| `memory/notes/portfolio.md` | Open and closed positions, P&L tracking |
| `memory/notes/watchlist.md` | Symbols under observation and trigger conditions |
| `memory/symbols/{SYMBOL}.md` | Per-symbol plan, thesis, invalidation, sizing |
| `memory/sessions/{DATE}.md` | Session logs and next actions |
| `memory/analysis/{SYMBOL}/` | Supporting analysis artifacts |

## Operating Rules

- Capital preservation is first priority; upside is secondary.
- No thesis, no hold. If invalidation is hit, exit.
- Do not average down after thesis break.
- Position size must be liquidity-aware before entry.
- Keep portfolio heat controlled; avoid hidden concentration via high correlation.

## Execution Defaults

- Run required data fetches in parallel when the task is a full portfolio or position review.
- Write concrete outputs to memory files, not only narrative answers.
- When constraints conflict (conviction vs liquidity, valuation vs correlation), prefer the safer sizing path.
