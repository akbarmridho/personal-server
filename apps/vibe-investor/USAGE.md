# Technical Analysis Skill Quick Usage

Use these prompts with the `technical-analysis` skill.

## 1) INITIAL (first full thesis)

```text
Run technical-analysis mode INITIAL for BBCA.
Intent: ENTRY.
Use default UNIFIED lens.
Build full report with workflow trace, evidence ledger, and chart artifacts.
```

## 2) UPDATE (weekly refresh vs prior thesis)

```text
Run technical-analysis mode UPDATE for BBCA.
Intent: HOLD.
Use default UNIFIED lens.
Previous analysis reference: work/BBCA_report_2026-02-14.md.
Return full report plus Delta Log (what changed, what stayed, and why action changed/stayed).
```

## 3) THESIS_REVIEW (is thesis still valid?)

```text
Run technical-analysis mode THESIS_REVIEW for BBCA.
Intent: HOLD.
Previous analysis reference: work/BBCA_report_2026-02-14.md.
Focus on thesis status (intact/improving/degrading/invalidated), invalidators, and monitoring triggers.
```

## 4) POSTMORTEM (after invalidation or exit)

```text
Run technical-analysis mode POSTMORTEM for BBCA.
Intent: EXIT.
Previous analysis reference: work/BBCA_report_2026-02-14.md.
Explain what failed, what was missed, and what rule updates should be applied next time.
```

## 5) Alternate Lens Compare (optional)

```text
Run technical-analysis mode UPDATE for BBCA.
Intent: HOLD.
Use requested lens SMC_ICT_LIGHT and also include UNIFIED comparison.
Previous analysis reference: work/BBCA_report_2026-02-14.md.
Return Lens Compare table with agreement/disagreement and evidence refs.
```

## 6) SMC Lens Deep Check (optional modules)

```text
Run technical-analysis mode UPDATE for BBCA.
Intent: HOLD.
Lens: SMC_ICT_LIGHT.
Previous analysis reference: work/BBCA_report_2026-02-14.md.
Include SMC Modules section with structure weighting, OB/Breaker state, FVG/IFVG state, EQH/EQL sweep result, and Premium/Discount zone.
Keep action risk-first with explicit invalidation and stop-loss.
```

## 7) Volume Profile-Focused Update

```text
Run technical-analysis mode UPDATE for BBCA.
Intent: HOLD.
Lens: UNIFIED.
Previous analysis reference: work/BBCA_report_2026-02-14.md.
Emphasize volume profile context: anchored + fixed range + prior-session POCs.
Include POC/VAH/VAL, HVN/LVN reaction notes, value-area acceptance state, and Delta Log impact on action.
```

## 8) Level-to-Level Plan

```text
Run technical-analysis mode INITIAL for BBCA.
Intent: ENTRY.
Lens: UNIFIED.
Build a level-to-level plan: entry zone, invalidation, next-zone target, and expected RR.
If no clear next-zone path exists, return WAIT with required conditions.
```

## 9) FVG/IFVG Validation Pass

```text
Run technical-analysis mode UPDATE for BBCA.
Intent: HOLD.
Lens: SMC_ICT_LIGHT.
Previous analysis reference: work/BBCA_report_2026-02-14.md.
Evaluate imbalance context: FVG/IFVG type, zone bounds, CE behavior, mitigation state, and impact on action.
```

## Notes

- For `UPDATE`, `THESIS_REVIEW`, and `POSTMORTEM`, always provide previous analysis reference.
- Always request chart artifacts, especially `work/{SYMBOL}_ib_overlay.png`.
- If no valid setup is found, expected action is `WAIT` with clear re-entry conditions.
