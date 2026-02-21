# Review, Watchlist, And Session Logging

## Objective

Define review cadence, watchlist management process, and session log structure for consistent portfolio operations.

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

If portfolio is flat/red while IHSG prints new highs, strategy likely has structural misalignment and needs overhaul. (Flag PM-W08)

## Leader Breadth Risk Monitor

Track a small leader basket (from your active/watchlist universe) and count fresh invalidations.

- If multiple leaders break structure/stop in the same review window, treat this as regime deterioration. (Flag PM-W09)
- When deterioration appears, reduce portfolio heat, tighten stops, and delay aggressive adds.
- Write the signal and resulting action to `memory/sessions/{YYYY-MM-DD}.md`.

## Watchlist Management

Watchlist statuses use enums from `enums-and-glossary.md`.

| Status | Criteria | Action |
|--------|----------|--------|
| WATCHING | Thesis interesting but not actionable yet | Monitor catalyst/flow/price trigger |
| READY | Trigger conditions are close | Prepare plan and alerts |
| ACTIVE | Triggered and position is open | Execute and monitor |
| REMOVED | Thesis broken or better option available | Document removal reason |

Write to: `memory/notes/watchlist.md`

```markdown
## Watchlist

| Symbol | Status | Thesis | Trigger | Added | Leader |
|--------|--------|--------|---------|-------|--------|
| BBCA | READY | Rate cut beneficiary | Break above 10,000 with volume | 2025-01-15 | Yes |
| ADRO | WATCHING | Coal cycle + restructuring | Foreign accumulation signal | 2025-01-20 | No |
```

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

## Implementation Note

Enforcement: agent workflow during Weekly Review and daily checks (see SKILL.md). Review cadence items are the checklist for each workflow. Watchlist status transitions are agent-managed based on trigger conditions. Session logs are written at the end of every review session. Health flags PM-W08 and PM-W09 are agent-judgment flags detected during review.
