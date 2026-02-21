# Portfolio Review, Watchlist, And Session Logging

## Review Cadence

### Daily (Quick Check)

- Check stop loss levels and triggered invalidations.
- Scan news/filings for held positions.
- Check flow changes on key positions.
- Update P&L in `memory/notes/portfolio.md`.

### Weekly

- Review all open positions: thesis intact or broken.
- Check sizing compliance against 50:30:10 constraints.
- Check rolling correlation changes among top holdings.
- Update watchlist and trigger status.
- Log weekly P&L and portfolio heat.

### Monthly

- Full performance review: realized and unrealized.
- Sector allocation and concentration check.
- Rebalance check: cadence, drift, thesis validity.
- Strategy quality review: what worked and what failed.
- Update `memory/MEMORY.md` with durable lessons.

## Portfolio Health Red Flag

If portfolio is flat/red while IHSG prints new highs, strategy likely has structural misalignment and needs overhaul.

## Leader Breadth Risk Monitor

Track a small leader basket (from your active/watchlist universe) and count fresh invalidations.

- If multiple leaders break structure/stop in the same review window, treat this as regime deterioration.
- When deterioration appears, reduce portfolio heat, tighten stops, and delay aggressive adds.
- Write the signal and resulting action to `memory/sessions/{YYYY-MM-DD}.md`.

## Watchlist Management

| Status | Criteria | Action |
|--------|----------|--------|
| Watching | Thesis is interesting but not actionable yet | Monitor catalyst/flow/price trigger |
| Ready | Trigger conditions are close | Prepare plan and alerts |
| Active | Triggered and position is open | Execute and monitor |
| Removed | Thesis broken or better option available | Document removal reason |

Write to: `memory/notes/watchlist.md`

```markdown
## Watchlist

| Symbol | Status | Thesis | Trigger | Added |
|--------|--------|--------|---------|-------|
| BBCA | Ready | Rate cut beneficiary | Break above 10,000 with volume | 2025-01-15 |
| ADRO | Watching | Coal cycle + restructuring | Foreign accumulation signal | 2025-01-20 |
```

Prefer to include a `Leader` marker for names used in breadth monitoring.

## Session Log Template

Write to: `memory/sessions/{YYYY-MM-DD}.md`

```markdown
# Session: {YYYY-MM-DD}

## Market Context
- IHSG: {level} ({change%})
- Key news: {1-2 headlines}

## Actions Taken
- {action 1}
- {action 2}

## Positions Updated
| Symbol | Action | Price | Notes |
|--------|--------|-------|-------|
| ... | ... | ... | ... |

## Watchlist Changes
- Added: {symbols + reason}
- Removed: {symbols + reason}
- Triggered: {symbols}

## Key Observations
- {insight 1}
- {insight 2}

## Tomorrow's Plan
- {next checks and actions}
```

## Profit Realization Discipline

- After significant gains (>50%), realize part in cash.
- Do not endlessly roll gains without withdrawals.
- Controlled realization improves sustainability and decision quality.
