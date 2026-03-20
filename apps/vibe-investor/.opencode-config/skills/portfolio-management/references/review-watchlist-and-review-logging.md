# Review, Watchlist, And Review Logging

## Objective

Define review cadence, watchlist management process, and retained review-summary structure for consistent portfolio operations.

## Review Discipline

### Benchmark And Style Discipline

- During reviews, compare portfolio behavior against `IHSG` and relevant sector leaders.
- Watch for frustration-driven style drift.
- If the investor is rotating styles without a framework, say it explicitly.

### Re-Entry Discipline

- After a major loss, do not endorse re-entry unless thesis, sponsorship, and structure have all reset.
- Re-entry must be treated as a new trade, not emotional continuation of the old one.

### Postmortem Upgrade Loop

Use postmortems as system upgrades, not blame sessions.

- Extract repeated behavioral mistakes.
- Convert them into operating rules.
- Improve both the human decision process and the assistant workflow from those findings.

## Review Cadence

### Daily (Quick Check)

- Check stop loss levels and triggered invalidations.
- Check whether any progress checkpoint date has passed and whether the required checkpoint condition was met.
- Scan news/filings for held positions.
- Check flow changes on key positions.
- Review current P&L, exposure, and current `portfolio_heat` from the portfolio tools.

### Weekly

- Review all open positions: thesis intact or broken.
- Check sizing compliance against 50:30:10 constraints.
- Check rolling correlation changes among top holdings.
- Check for stale plans that have not been reviewed within their expected cadence.
- Compare portfolio behavior versus `IHSG` and relevant sector leaders.
- Check whether any active tactical trades demand more monitoring than the investor is realistically providing.
- Update watchlist and trigger status.
- Record weekly portfolio heat and action items in the retained review summary.

### Monthly

- Full performance review: realized and unrealized.
- Sector allocation and concentration check.
- Rebalance check: cadence, drift, thesis validity.
- Strategy quality review: what worked and what failed.
- Review whether style drift, attention mismatch, or repeated re-entry mistakes are recurring.
- Capture durable lessons in long-term memory.

## Portfolio Health Red Flag

If portfolio is flat/red while IHSG prints new highs, strategy likely has structural misalignment and needs overhaul. (Flag PM-W08)

## Leader Breadth Risk Monitor

Track a small leader basket (from your active/watchlist universe) and count fresh invalidations.

- If multiple leaders break structure/stop in the same review window, treat this as regime deterioration. (Flag PM-W09)
- When deterioration appears, reduce portfolio heat, tighten stops, and delay aggressive adds.
- Record the signal and resulting action in the retained review summary.

## Plan Staleness Discipline

Each symbol plan should carry an explicit review cadence and last-reviewed date.

Practical thresholds:

- `SWING`: stale after 7 calendar days without review
- `POSITION`: stale after 30 calendar days without review
- `LONG_TERM`: stale after 90 calendar days without review

If a plan is stale:

- flag `PM-W10`
- downgrade confidence in the stored plan
- require refresh before allowing aggressive adds

## Watchlist Management

Watchlist statuses use the labels defined in `SKILL.md`.

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
- Regime aggression state: {AGGRESSIVE / NORMAL / DEFENSIVE / CAPITAL_PRESERVATION}
- Current portfolio heat: {X%}

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
- Checkpoint failures: {symbols or none}
- Stale plans: {symbols or none}
- Style drift: {none or what changed}
- Re-entry discipline issues: {symbols or none}

## Next Actions
- {next checks and actions}
```
