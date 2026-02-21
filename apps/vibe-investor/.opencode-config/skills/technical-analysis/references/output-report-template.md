# Output Report Template

Use this structure for every technical analysis output.

```markdown
## Technical Analysis: {SYMBOL}

### A. Context
- Date
- Intent: ENTRY / HOLD / EXIT / SCREENING
- Timeframes used: daily + intraday(60m)

### B. Regime And State
- Regime: trend_continuation / range_rotation / potential_reversal / no_trade
- Bias: bullish / bearish / neutral
- Intraday session state: accepted_above_ibh / accepted_below_ibl / failed_break_above_ibh / failed_break_below_ibl / inside_ib_range

### C. Key Levels And Liquidity
- Support zones
- Resistance zones
- POC/HVN/LVN
- IBH/IBL values
- Next liquidity draw

### D. Chart Build And Read
- Generated charts:
  - `work/{SYMBOL}_daily_structure.png`
  - `work/{SYMBOL}_intraday_ibh_ibl.png`
  - `work/{SYMBOL}_volume_context.png` (optional)
- Chart observations:
  - What was seen on chart first
  - Which lines/zones were respected, broken, reclaimed, or deviated

### E. Setup Qualification
- Selected setup: S1 / S2 / S3 / S4 / S5 / NO_VALID_SETUP
- Trigger condition
- Invalidation condition
- Why accepted or rejected

### F. Risk And Execution
- Action: BUY / HOLD / WAIT / EXIT
- Entry zone
- Stop-loss
- Target ladder
- Position sizing basis
- Red flags summary

### G. Workflow Trace
| Phase | Key observation | Rule refs | Evidence refs |
|------|----------|-----------|---------------|
| DATA_PREP | ... | ... | ... |
| LEVEL_DRAFT | ... | ... | ... |
| CHART_BUILD | ... | ... | ... |
| CHART_READ | ... | ... | ... |
| CROSS_CHECK | ... | ... | ... |
| SETUP_RISK | ... | ... | ... |
| DECISION | ... | ... | ... |

### H. Evidence Ledger
| Evidence ID | Type | Source | Value |
|-------------|------|--------|-------|
| E1 | data_range | daily | ... |
| E2 | swing | daily candle timestamp + level | ... |
| E3 | level | support/resistance zone | ... |
| E4 | ib_state | intraday session | ... |
| E5 | volume | vol ratio | ... |
| E6 | chart | work/{SYMBOL}_*.png | ... |

### I. Monitoring Triggers
- Thesis confirmation triggers
- Thesis invalidation triggers
- Next review condition
```
