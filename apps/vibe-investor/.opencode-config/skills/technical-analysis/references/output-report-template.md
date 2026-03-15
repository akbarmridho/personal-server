# Output Report Template

Use this structure for every technical analysis output.

```markdown
## Technical Analysis: {SYMBOL}

### A. Decision Summary
- Purpose Mode: INITIAL / UPDATE / POSTMORTEM
- Action: BUY / HOLD / WAIT / EXIT
- Bias: bullish / bearish / neutral
- Setup: S1 / S2 / S3 / S4 / S5 / NO_VALID_SETUP
- Key active level or decision zone
- Invalidation
- Next trigger
- Confidence

### B. Context
- Date
- Intent: entry / maintenance / postmortem
- Timeframes used: daily + 60m
- Data dependency status
- Prior analysis reference (required for UPDATE and POSTMORTEM)

### C. State And Location
- State: balance / imbalance
- Regime: trend_continuation / range_rotation / potential_reversal / no_trade
- Bias
- Current Wyckoff phase
- Wyckoff maturity and confidence
- Key support zones
- Key resistance zones
- Baseline MA posture: 21EMA / 50SMA / 200SMA
- Value-area context: POC / VAH / VAL / acceptance
- Liquidity map: current draw / opposing draw / sweep outcome / path state
- Current location summary

### D. Setup And Trigger
- Selected setup family
- Setup validity: valid / watchlist_only / invalid
- Trigger state
- Trigger type
- Trigger level
- Confirmation state
- Participation quality
- Latest structure event
- Breakout quality note when relevant

### E. Risk And Decision
- Entry zone
- Stop-loss
- Invalidation basis
- Next-zone target
- Target ladder
- Expected RR
- Red flags summary
- Final action rationale

### F. Delta And Monitoring
- Previous Thesis Snapshot (UPDATE and POSTMORTEM only)
- Thesis Status and review reason (UPDATE only)
- Delta Log (UPDATE only)
- Failure point and handling improvement (POSTMORTEM only)
- Monitoring triggers
- Stale setup condition

### G. Adaptive MA
- Adaptive MA note when available, including selected period and chart mode

### H. Evidence
- Workflow Trace
- Evidence Ledger
- Chart artifact references from the chart evidence manifest
```
