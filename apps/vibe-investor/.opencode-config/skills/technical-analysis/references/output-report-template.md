# Output Report Template

Use this structure for every technical analysis output.

```markdown
## Technical Analysis: {SYMBOL}

### A. Context
- Date
- Intent: ENTRY / HOLD / EXIT / SCREENING
- Timeframes used: daily + intraday(60m)
- Data range and data dependency status

### B. Regime And State
- State: balance / imbalance
- Regime: trend_continuation / range_rotation / potential_reversal / no_trade
- Wyckoff context: accumulation / markup / distribution / markdown / unclear
- Bias: bullish / bearish / neutral
- Intraday session state: accepted_above_ibh / accepted_below_ibl / failed_break_above_ibh / failed_break_below_ibl / inside_ib_range

### C. Key Levels And Liquidity
- Support zones
- Resistance zones
- POC/HVN/LVN
- IBH/IBL values
- Role reversal and level test count notes
- Next liquidity draw

### D. Chart Build And Read
- Generated charts:
  - `work/{SYMBOL}_ib_overlay.png`
  - `work/{SYMBOL}_daily_structure.png`
  - `work/{SYMBOL}_intraday_ibh_ibl.png`
  - `work/{SYMBOL}_detail.png` (optional)
  - `work/{SYMBOL}_volume_context.png` (optional)
- Chart observations:
  - What was seen on chart first
  - Which lines/zones were respected, broken, reclaimed, or deviated
  - IB overlay interpretation (period, first_n_bars, accepted/deviation/inside)

### E. Setup Qualification
- Selected setup: S1 / S2 / S3 / S4 / S5 / S6 / NO_VALID_SETUP
- Trigger condition
- Invalidation condition
- Why accepted or rejected
- Divergence status: no_divergence / divergence_unconfirmed / divergence_confirmed

### F. Risk And Execution
- Action: BUY / HOLD / WAIT / EXIT
- Entry zone
- Stop-loss
- Target ladder
- Position sizing basis
- Red flags summary
- Confidence
- Invalidators

### G. Synthesis
- Structure conclusion
- Level conclusion
- Price-volume conclusion
- Conflict resolution: chart-first observation vs numeric cross-check

### H. Workflow Trace
| Phase | Key observation | Rule refs | Evidence refs |
|------|----------|-----------|---------------|
| DATA_PREP | ... | ... | ... |
| LEVEL_DRAFT | ... | ... | ... |
| CHART_BUILD | ... | ... | ... |
| CHART_READ | ... | ... | ... |
| CROSS_CHECK | ... | ... | ... |
| SETUP_RISK | ... | ... | ... |
| DECISION | ... | ... | ... |

### I. Evidence Ledger
| Evidence ID | Type | Source | Value |
|-------------|------|--------|-------|
| E1 | data_range | daily | ... |
| E2 | swing | daily candle timestamp + level | ... |
| E3 | level | support/resistance zone | ... |
| E4 | ib_state | intraday session | ... |
| E5 | volume | vol ratio | ... |
| E6 | chart | work/{SYMBOL}_*.png | ... |

### J. Monitoring Triggers
- Thesis confirmation triggers
- Thesis invalidation triggers
- Next review condition
```
