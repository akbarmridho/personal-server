# Output Report Template

Use this structure for every technical analysis output.

```markdown
## Technical Analysis: {SYMBOL}

### A. Context
- Mode: INITIAL / UPDATE / THESIS_REVIEW / POSTMORTEM
- Lens: UNIFIED / CLASSICAL_TA / WYCKOFF / SMC_ICT_LIGHT
- Date
- Intent: ENTRY / HOLD / EXIT / SCREENING
- Timeframes used: daily + intraday(60m)
- Data range and data dependency status
- Previous analysis reference (required for non-initial modes)

### A1. Previous Thesis Snapshot (non-initial modes)
- Prior action
- Prior thesis summary
- Prior invalidators and stop
- Prior key levels/regime

### B. Regime And State
- State: balance / imbalance
- Regime: trend_continuation / range_rotation / potential_reversal / no_trade
- Wyckoff context: accumulation / markup / distribution / markdown / unclear
- Bias: bullish / bearish / neutral
- Intraday session state: accepted_above_ibh / accepted_below_ibl / failed_break_above_ibh / failed_break_below_ibl / inside_ib_range

### C. Key Levels And Liquidity
- Support zones
- Resistance zones
- MA posture (dynamic S/R): above/below 21EMA, 50SMA, 100SMA, 200SMA
- MA mode: baseline_stack / adaptive_primary / hybrid (default: hybrid)
- Adaptive MA note (if used): selected period + respect evidence
- POC/HVN/LVN
- VAH/VAL and value-area acceptance state
- IBH/IBL values
- Time-based levels: monthly/weekly/daily open (when relevant)
- Round-number levels (when relevant)
- Fibonacci context (when relevant): swing anchors + retracement map (`0.236`/`0.382`/`0.5`/`0.618`/`0.786`)
- Fibonacci extensions (when relevant): `1.0`/`1.272`/`1.618`/`2.618`
- Role reversal and level test count notes
- Next liquidity draw

### C1. Volume Profile Context
- Profile modes used: anchored / fixed / session
- Active profile anchors (start/end rationale)
- Prior-session POCs (at least recent references when available)
- Node reaction notes: HVN acceptance or LVN fast-travel behavior

### C2. Liquidity Draw Map
- Current draw target
- Opposing draw target
- Sweep event: none / eqh_swept / eql_swept / trendline_swept / swing_swept
- Sweep outcome: accepted / rejected / unresolved
- Path state: external_to_internal / internal_to_external / unclear

### D. Chart Build And Read
- Generated charts:
  - Core required charts:
- `work/{SYMBOL}_daily_structure.png`
- `work/{SYMBOL}_intraday_structure.png`
- `work/{SYMBOL}_ib_overlay.png`
- `work/{SYMBOL}_structure_events.png`
- `work/{SYMBOL}_trade_plan.png`
  - Conditional required charts:
  - `work/{SYMBOL}_vpvr_profile.png` (when volume-profile context is used)
  - `work/{SYMBOL}_imbalance_fvg.png` (when FVG/IFVG or imbalance context is used)
  - Optional:
  - `work/{SYMBOL}_detail.png`
- Chart observations:
  - What was seen on chart first
  - Which lines/zones were respected, broken, reclaimed, or deviated
  - IB overlay interpretation (period, first_n_bars, accepted/deviation/inside)
  - Structure-event interpretation (CHOCH/BOS markers and confirmation status)
  - Liquidity-map interpretation (current draw/opposing draw, sweep and path)
  - Trade-plan chart alignment (entry/invalidation/target path consistency)

### E. Setup Qualification
- Selected setup: S1 / S2 / S3 / S4 / S5 / S6 / NO_VALID_SETUP
- Trigger condition
- Invalidation condition
- Why accepted or rejected
- Structure status: no_signal / choch_only / choch_plus_bos_confirmed
- CHOCH evidence: timestamp + broken level
- Confirmation BOS evidence: timestamp + broken level
- Trap filter outcome: valid confirmation / deviation / insufficient follow-through
- Divergence status: no_divergence / divergence_unconfirmed / divergence_confirmed
- Optional confluence (if used): FVG zone or OTE zone (`0.618`/`0.706`/`0.786`) with source swing
- Fib usage note (if used): retracement level role (entry/invalidation context) and extension role (target context)
- Breakout displacement note: clean displacement / stalling

### E1. Imbalance Context (if used)
- Imbalance type: FVG / VOLUME_IMBALANCE / OPENING_GAP / IFVG
- Zone bounds and CE (50 percent midpoint)
- Mitigation state: unmitigated / partially_mitigated / fully_mitigated
- CE behavior: respected / violated

### E2. Breakout Quality Filters (for breakout setups)
- Base quality: duration/depth/stage note
- Market context impact: supportive / neutral / adverse

### F. Risk And Execution
- Action: BUY / HOLD / WAIT / EXIT
- Entry zone
- Stop-loss
- Target ladder
- Next-zone target (level-to-level)
- Expected RR before entry
- Position sizing basis
- Red flags summary
- Confidence
- Invalidators

### G. Synthesis
- Structure conclusion
- Level conclusion
- Price-volume conclusion
- Conflict resolution: chart-first observation vs numeric cross-check
- Thesis status: intact / improving / degrading / invalidated (non-initial modes)

### G1. Delta Log (non-initial modes)
| Category | Previous | Current | Change | Impact |
|----------|----------|---------|--------|--------|
| Structure | ... | ... | ... | ... |
| Levels | ... | ... | ... | ... |
| Volume | ... | ... | ... | ... |
| Setup | ... | ... | ... | ... |
| Risk | ... | ... | ... | ... |

### G2. Lens Compare (when alternate lens requested)
| Lens | Bias | Action | Key difference | Evidence refs |
|------|------|--------|----------------|---------------|
| UNIFIED | ... | ... | ... | ... |
| Requested lens | ... | ... | ... | ... |

### G3. SMC Modules (when lens is SMC_ICT_LIGHT)
- Structure weighting: swing vs internal
- Structure status: no_signal / choch_only / choch_plus_bos_confirmed
- Liquidity event: none / eqh_swept / eql_swept / accepted_after_sweep / rejected_after_sweep
- OB/Breaker state (if used): zone bounds + mitigation/violation
- FVG/IFVG state (if used): zone bounds + reaction outcome
- Premium/Discount zone: premium / discount / equilibrium with range anchors
- SMC modules used and evidence refs

### H. Workflow Trace
| Phase | Key observation | Rule refs | Evidence refs |
|------|----------|-----------|---------------|
| DATA_PREP | ... | ... | ... |
| PREV_CONTEXT | ... | ... | ... |
| LEVEL_DRAFT | ... | ... | ... |
| CHART_BUILD | ... | ... | ... |
| CHART_READ | ... | ... | ... |
| CROSS_CHECK | ... | ... | ... |
| DELTA_ASSESS | ... | ... | ... |
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
| E6 | volume_profile | POC/VAH/VAL/HVN/LVN | ... |
| E7 | prior_session_poc | intraday session profile | ... |
| E8 | chart | core + conditional work/{SYMBOL}_*.png | ... |
| E9 | liquidity | draw target + sweep evidence | ... |

### J. Monitoring Triggers
- Thesis confirmation triggers
- Thesis invalidation triggers
- Next review condition
```
