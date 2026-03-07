# Review, Watchlist, And Review Logging

## Objective

Define review cadence, watchlist management process, and retained review-summary structure for consistent portfolio operations.

## Review Cadence

### Daily (Quick Check)

- Check stop loss levels and triggered invalidations.
- Scan news/filings for held positions.
- Check flow changes on key positions.
- Review current P&L and exposure from the portfolio tools.

### Weekly

- Review all open positions: thesis intact or broken.
- Check sizing compliance against 50:30:10 constraints.
- Check rolling correlation changes among top holdings.
- Update watchlist and trigger status.
- Record weekly portfolio heat and action items in the retained review summary.

### Monthly

- Full performance review: realized and unrealized.
- Sector allocation and concentration check.
- Rebalance check: cadence, drift, thesis validity.
- Strategy quality review: what worked and what failed.
- Capture durable lessons in long-term memory.

## Portfolio Health Red Flag

If portfolio is flat/red while IHSG prints new highs, strategy likely has structural misalignment and needs overhaul. (Flag PM-W08)

## Leader Breadth Risk Monitor

Track a small leader basket (from your active/watchlist universe) and count fresh invalidations.

- If multiple leaders break structure/stop in the same review window, treat this as regime deterioration. (Flag PM-W09)
- When deterioration appears, reduce portfolio heat, tighten stops, and delay aggressive adds.
- Record the signal and resulting action in the retained review summary.

## Watchlist Management

Watchlist statuses use enums from `enums-and-glossary.md`.

| Status | Criteria | Action |
|--------|----------|--------|
| WATCHING | Thesis interesting but not actionable yet | Monitor catalyst/flow/price trigger |
| READY | Trigger conditions are close | Prepare plan and alerts |
| ACTIVE | Triggered and position is open | Execute and monitor |
| REMOVED | Thesis broken or better option available | Document removal reason |

```markdown
## Watchlist

| Symbol | Status | Thesis | Trigger | Invalidation | Added | Leader | Notes |
|--------|--------|--------|---------|--------------|-------|--------|-------|
| BBCA | READY | Rate cut beneficiary | Break above 10,000 with volume | Closes below 9,650 | 2025-01-15 | Yes | Waiting for volume confirmation |
| ADRO | WATCHING | Coal cycle + restructuring | Foreign accumulation signal | ASP weakens while volume distribution expands | 2025-01-20 | No | Monitor catalyst window |
```

## Review Summary Template

```markdown
# Desk Check: {YYYY-MM-DD}

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

## Next Actions
- {next checks and actions}
```
