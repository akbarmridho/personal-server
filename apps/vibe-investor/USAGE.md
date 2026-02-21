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

## Schools Of Thought In This Skill

- Structure-first: price behavior is interpreted through structure and acceptance, not isolated candles.
- Chart-first, evidence-backed: generate/read charts before final call and attach evidence refs.
- Risk-first execution: no action without invalidation, stop-loss, and sizing logic.
- Multi-lens optionality: alternate lens can be requested and compared against `UNIFIED`.
- Iterative lifecycle: supports `INITIAL`, `UPDATE`, `THESIS_REVIEW`, `POSTMORTEM`.

## Mode Prompts

### 1) INITIAL (first thesis)

```text
Run technical-analysis mode INITIAL for BBCA.
Intent: ENTRY.
Lens: UNIFIED.
Build full report with workflow trace, evidence ledger, and chart artifacts.
```

### 2) UPDATE (periodic refresh)

```text
Run technical-analysis mode UPDATE for BBCA.
Intent: HOLD.
Lens: UNIFIED.
Previous analysis reference: work/BBCA_report_2026-02-14.md.
Return full report plus Delta Log (what changed, what stayed, and why action changed/stayed).
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
```

### 8) Liquidity Draw Map Focus

```text
Run technical-analysis mode UPDATE for BBCA.
Intent: HOLD.
Lens: UNIFIED.
Previous analysis reference: work/BBCA_report_2026-02-14.md.
Return current draw, opposing draw, sweep event/outcome, and liquidity path state.
Use HTF sweep context and LTF trigger evidence if available.
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

## Notes

- For `UPDATE`, `THESIS_REVIEW`, and `POSTMORTEM`, provide previous analysis reference.
- Ask for chart artifacts explicitly when needed, including `work/{SYMBOL}_ib_overlay.png`.
- If no valid setup exists, expected action is `WAIT` with re-entry conditions.
