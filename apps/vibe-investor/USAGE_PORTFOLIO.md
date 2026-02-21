# Portfolio Management Skill Usage

This guide explains how to invoke the portfolio management skill and what each workflow expects.

## Concepts Covered

- Risk-first position sizing: 1% risk rule, portfolio heat (max 5-6%), conviction scaling.
- 50:30:10 diversification: minimum 50% in MoS >30% stocks, max 30% single position, max 10% speculative.
- Correlation-aware sizing: co-movement as sizing modifier, not just ticker count.
- Liquidity-first sizing: ADTV-based exit capacity check before entry.
- Market regime gate: market proxy + leader breadth check before new long exposure.
- Staged entry/exit: DCA, lump sum, pyramid adds, staged profit-taking, cut-loss discipline.
- Memory-driven operations: all state lives in filesystem memory files, not in conversation.

## Memory File Layout

- `memory/notes/portfolio.md` — open/closed positions, P&L
- `memory/notes/watchlist.md` — symbols under observation with trigger conditions
- `memory/symbols/{SYMBOL}.md` — per-symbol trading plan (uses trading plan template)
- `memory/sessions/{DATE}.md` — session logs and next actions

## Workflow Prompts

### 1) New Position Entry

```text
Run portfolio-management: new position entry for BBCA.
Check regime gate, validate sizing, and write trading plan.
```

What happens:

- Regime gate check (fetch-ohlcv on market proxy + leaders).
- Sizing validation: 50:30:10, correlation vs existing holdings, ADTV liquidity, portfolio heat.
- Trading plan template filled and written to `memory/symbols/BBCA.md`.
- Portfolio and watchlist memory files updated.

### 2) Weekly Review

```text
Run portfolio-management: weekly review.
```

What happens:

- Fetches current prices for all held positions (parallel).
- Per-position: thesis status, stop levels, sizing compliance.
- Portfolio-level: heat, correlation, 50:30:10, sector limits.
- Watchlist status updates.
- Session log written to `memory/sessions/{DATE}.md`.
- Health flags (PM-W01 through PM-W10) reported if triggered.

### 3) Position Exit

```text
Run portfolio-management: exit BBCA.
Reason: thesis invalidated — governance risk.
```

What happens:

- Loads exit framework, matches to cut-loss/profit-taking/early-exit type.
- Updates `memory/symbols/BBCA.md` with close details.
- Updates `memory/notes/portfolio.md` with realized P&L.
- Process quality review noted in session log.

### 4) Rebalance Check

```text
Run portfolio-management: rebalance check.
```

What happens:

- Checks drift triggers (>20% weight deviation from target).
- Checks event triggers (thesis break, governance, liquidity deterioration).
- For replacements: validates correlation with remaining holdings.
- Skips tiny trades with no material risk impact.

### 5) Add To Existing Position

```text
Run portfolio-management: add to BBCA position.
Current tranche is profitable, MoS still >30%.
```

What happens:

- Validates pyramid discipline (prior tranche green, thesis/structure valid).
- Sizes add using scaling-up rules (50% of first buy for second, 25% for third).
- Checks aggregate trade does not violate portfolio heat limits.
- Updates trading plan and portfolio memory files.

### 6) Watchlist Update

```text
Run portfolio-management: update watchlist.
Add TLKM — defensive play, watching for accumulation signal above 3,800.
Move BBCA from READY to ACTIVE.
```

What happens:

- Updates `memory/notes/watchlist.md` with status transitions.
- For new entries: requires thesis and trigger condition.
- For removals: documents removal reason.

### 7) Daily Quick Check

```text
Run portfolio-management: daily check.
```

What happens:

- Checks stop loss levels and triggered invalidations.
- Scans news/filings for held positions.
- Updates P&L in `memory/notes/portfolio.md`.

### 8) Sizing Validation (Standalone)

```text
Run portfolio-management: validate sizing for ADRO.
Entry: 2,500, Stop: 2,300, Capital: 500M.
```

What happens:

- Computes position size via 1% risk rule.
- Checks against 30% max single position, 50:30:10 compliance.
- Checks ADTV liquidity.
- Checks correlation with existing holdings.
- Reports any health flags triggered.

## Health Flags

When any workflow detects a constraint breach, it reports the relevant flag:

- `PM-W01` through `PM-W07`: deterministic checks (sizing, heat, correlation, liquidity, concentration).
- `PM-W08`, `PM-W09`: agent-judgment flags (portfolio vs IHSG divergence, leader breadth deterioration).
- `PM-W10`: thesis staleness (no review within cadence).

## Notes

- All workflows write to memory files, not just narrative answers.
- If `get-stock-fundamental` or `fetch-ohlcv` fails, the workflow stops and reports dependency failure.
- When TA skill is also active, TA provides entry/stop/targets and PM validates sizing before execution.
