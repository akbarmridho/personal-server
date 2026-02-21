# Technical Analysis Skill Usage

This guide explains both how to run the skill and what conceptual frameworks it covers.

## Concepts Covered

- `UNIFIED` baseline: market state, structure, levels, volume, liquidity, and risk integrated in one decision flow.
- `CLASSICAL_TA`: horizontal support/resistance, role flips, time-based levels, and round-number confluence.
- `WYCKOFF`: balance/imbalance context with accumulation/markup/distribution/markdown mapping.
- `VOLUME_PROFILE`: POC/VAH/VAL/HVN/LVN behavior and prior-session profile context.
- `LIQUIDITY`: draw-to-liquidity map, sweep outcome, and external/internal path framing.
- `SMC_ICT_LIGHT`: BOS/CHOCH/CHOCH+, EQH/EQL, OB/Breaker, FVG/IFVG, Premium/Discount.
- `LEVEL_TO_LEVEL`: entry near mapped zone, invalidation beyond structure, next-zone target path.
- `IBH_IBL`: Initial Balance acceptance/deviation logic and stepped overlay chart.
- `BREAKOUT_FILTERS`: MA posture, base-quality checks, and market-context filter before breakout action.

## Schools Of Thought In This Skill

- Structure-first: price behavior is interpreted through structure and acceptance, not isolated candles.
- Chart-first, evidence-backed: generate/read charts before final call and attach evidence refs.
- Risk-first execution: no action without invalidation, stop-loss, and sizing logic.
- Multi-lens optionality: alternate lens can be requested and compared against `UNIFIED`.
- Iterative lifecycle: supports `INITIAL`, `UPDATE`, `THESIS_REVIEW`, `POSTMORTEM`.

## Deterministic Context Script

- Input source:
  - Use the exact `output_path` from `fetch-ohlcv`.
  - Input JSON must contain `daily[]`, `intraday[]`, and `corp_actions[]`.
- Script location:
  - `scripts/build_ta_context.py` (relative to `.opencode-config/skills/technical-analysis/SKILL.md`)
- Output:
  - `work/{SYMBOL}_ta_context.json` (or custom `--output` path)
- Available modules for `--modules`:
  - `core`: regime, levels, MA posture, time/round levels, IB state, structure events, liquidity
  - `vpvr`: adds `poc/vah/val/hvn/lvn`
  - `imbalance`: adds FVG zones with CE
  - `breakout`: adds breakout trigger/follow-through snapshot
  - `smc`: adds EQH/EQL and premium-discount context
  - `all`: shorthand for `core,vpvr,imbalance,breakout,smc`
- Example run:
  - `python scripts/build_ta_context.py --input {FETCH_OHLCV_OUTPUT_PATH} --symbol {SYMBOL} --outdir work --modules core,vpvr,imbalance,breakout,smc`

## Chart Artifact Contract

- Input source:
  - Use the exact `output_path` used by `fetch-ohlcv` as script input.
  - That JSON must contain `daily[]`, `intraday[]`, and `corp_actions[]`.
- Script location:
  - `scripts/generate_ta_charts.py` (relative to `.opencode-config/skills/technical-analysis/SKILL.md`)
- Available modules for `--modules`:
  - `core`: baseline required artifacts (`daily_structure`, `intraday_ibh_ibl`, `ib_overlay`, `structure_events`, `liquidity_map`, `trade_plan`)
  - `vpvr`: adds `vpvr_profile`
  - `imbalance`: adds `imbalance_fvg`
  - `detail`: adds optional deep-dive detail chart
  - `all`: shorthand for `core,vpvr,imbalance,detail`
- Example run:
  - `python scripts/generate_ta_charts.py --input {FETCH_OHLCV_OUTPUT_PATH} --symbol {SYMBOL} --outdir work --modules core,vpvr,imbalance`
- Core required charts (every run):
  - `work/{SYMBOL}_daily_structure.png`
  - `work/{SYMBOL}_intraday_ibh_ibl.png`
  - `work/{SYMBOL}_ib_overlay.png`
  - `work/{SYMBOL}_structure_events.png`
  - `work/{SYMBOL}_liquidity_map.png`
  - `work/{SYMBOL}_trade_plan.png`
- Conditional required charts (when module is used):
  - `work/{SYMBOL}_vpvr_profile.png` for volume-profile context.
  - `work/{SYMBOL}_imbalance_fvg.png` for FVG/IFVG or imbalance context.
- Optional deep-dive chart:
  - `work/{SYMBOL}_detail.png`
- Workflow expectation:
  - Run deterministic context script first (`build_ta_context.py`), then build charts (`generate_ta_charts.py`).
  - Build charts first, read charts second, then run numeric cross-check before action.
  - If chart-read and numeric checks conflict, resolve conflict explicitly with evidence.

## Mode Prompts

### 1) INITIAL (first thesis)

```text
Run technical-analysis mode INITIAL for BBCA.
Intent: ENTRY.
Lens: UNIFIED.
Build full report with workflow trace, evidence ledger, and full core chart artifacts.
```

### 2) UPDATE (periodic refresh)

```text
Run technical-analysis mode UPDATE for BBCA.
Intent: HOLD.
Lens: UNIFIED.
Previous analysis reference: work/BBCA_report_2026-02-14.md.
Return full report plus Delta Log (what changed, what stayed, and why action changed/stayed).
Include all core chart artifacts and conditional charts if used.
```

### 3) THESIS_REVIEW (thesis health check)

```text
Run technical-analysis mode THESIS_REVIEW for BBCA.
Intent: HOLD.
Previous analysis reference: work/BBCA_report_2026-02-14.md.
Focus on thesis status (intact/improving/degrading/invalidated), invalidators, and monitoring triggers.
```

### 4) POSTMORTEM (after invalidation/exit)

```text
Run technical-analysis mode POSTMORTEM for BBCA.
Intent: EXIT.
Previous analysis reference: work/BBCA_report_2026-02-14.md.
Explain what failed, what was missed, and what rule updates should be applied next time.
```

## Lens And Concept Prompts

### 5) Alternate Lens Compare

```text
Run technical-analysis mode UPDATE for BBCA.
Intent: HOLD.
Use requested lens SMC_ICT_LIGHT and also include UNIFIED comparison.
Previous analysis reference: work/BBCA_report_2026-02-14.md.
Return Lens Compare table with agreement/disagreement and evidence refs.
```

### 6) SMC Deep Check

```text
Run technical-analysis mode UPDATE for BBCA.
Intent: HOLD.
Lens: SMC_ICT_LIGHT.
Previous analysis reference: work/BBCA_report_2026-02-14.md.
Include SMC modules: structure weighting, OB/Breaker state, FVG/IFVG state, EQH/EQL sweep result, Premium/Discount zone.
Keep action risk-first with explicit invalidation and stop-loss.
```

### 7) Volume Profile Focus

```text
Run technical-analysis mode UPDATE for BBCA.
Intent: HOLD.
Lens: UNIFIED.
Previous analysis reference: work/BBCA_report_2026-02-14.md.
Emphasize anchored + fixed range + prior-session POCs.
Include POC/VAH/VAL, HVN/LVN reaction notes, and value-area acceptance state.
Require `work/{SYMBOL}_vpvr_profile.png`.
```

### 8) Liquidity Draw Map Focus

```text
Run technical-analysis mode UPDATE for BBCA.
Intent: HOLD.
Lens: UNIFIED.
Previous analysis reference: work/BBCA_report_2026-02-14.md.
Return current draw, opposing draw, sweep event/outcome, and liquidity path state.
Use HTF sweep context and LTF trigger evidence if available.
Require `work/{SYMBOL}_liquidity_map.png`.
```

### 9) Horizontal S/R Heuristics Pass

```text
Run technical-analysis mode UPDATE for BBCA.
Intent: HOLD.
Lens: UNIFIED.
Previous analysis reference: work/BBCA_report_2026-02-14.md.
Apply HTF-first mapping then refine LTF zones.
Include monthly/weekly/daily open, round-number confluence, and breakout displacement quality.
Keep levels minimal and actionable.
```

### 10) Level-To-Level Execution Plan

```text
Run technical-analysis mode INITIAL for BBCA.
Intent: ENTRY.
Lens: UNIFIED.
Build plan with entry zone, invalidation, next-zone target, and expected RR.
If no clear next-zone path exists, return WAIT with required conditions.
```

### 11) Breakout Quality Filter Pass

```text
Run technical-analysis mode UPDATE for BBCA.
Intent: ENTRY.
Lens: UNIFIED.
Previous analysis reference: work/BBCA_report_2026-02-14.md.
If setup is breakout, include breakout quality filters: base quality and market context impact.
Report MA posture separately under levels context.
Downgrade conviction if filters are weak.
```

### 12) Dynamic S/R MA Context

```text
Run technical-analysis mode UPDATE for BBCA.
Intent: HOLD.
Lens: CLASSICAL_TA.
Previous analysis reference: work/BBCA_report_2026-02-14.md.
Report MA posture as dynamic support/resistance (21EMA, 50SMA, 100SMA, 200SMA) together with horizontal levels.
Do not use MA alone as trade trigger.
```

## Notes

- For `UPDATE`, `THESIS_REVIEW`, and `POSTMORTEM`, provide previous analysis reference.
- Include all core chart artifacts by default; request module-specific conditional charts when relevant.
- If no valid setup exists, expected action is `WAIT` with re-entry conditions.
