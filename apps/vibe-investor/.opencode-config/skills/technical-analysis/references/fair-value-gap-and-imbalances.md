# Fair Value Gap And Imbalances

## Objective

Standardize imbalance analysis so FVG-based decisions are evidence-driven, context-aware, and compatible with the existing risk framework.

## Imbalance Types

- `FVG`: three-candle inefficiency with non-overlap across the impulse segment.
- `VOLUME_IMBALANCE`: close-open displacement with partial wick overlap.
- `OPENING_GAP`: full session-to-session void with no overlap.

## Key FVG Concepts

- `R-FVG-01` Classify direction: bullish (`BISI`) or bearish (`SIBI`).
- `R-FVG-02` Consequent Encroachment (`CE`) is the 50 percent midpoint of the FVG.
- `R-FVG-03` Unmitigated FVG has higher signal quality than already-tapped FVG.
- `R-FVG-04` FVG in the middle of broad range has lower quality than FVG at structural extremes.
- `R-FVG-05` FVG should align with structure event (BOS/CHOCH/MSS context).
- `R-FVG-06` Violation through FVG with acceptance can reclassify to `IFVG` (polarity flip).
- `R-FVG-07` FVG/IFVG is confluence, not standalone permission to trade.

## IFVG Handling

- Bullish FVG broken and accepted below -> bearish IFVG candidate.
- Bearish FVG broken and accepted above -> bullish IFVG candidate.
- Prefer retest reaction evidence before execution.

## Quality Filters

- structural alignment (trend or confirmed reversal path)
- location quality (discount for bullish, premium for bearish, or clear edge)
- mitigation state (fresh vs spent)
- reaction evidence on retest (reject/accept)

## Trace Requirements

- Report imbalance type and zone bounds.
- Report CE level and whether CE was respected or violated.
- Report mitigation status: unmitigated / partially mitigated / fully mitigated.
- If IFVG used, report original FVG violation evidence and retest behavior.

## Implementation Note

Deterministic imbalance/FVG extraction is implemented in:

- Module: `imbalance`
- Script: `scripts/build_ta_context.py`
- Script: `scripts/generate_ta_charts.py`
