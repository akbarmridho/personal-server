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

## FVG Quality Scoring Matrix

Score each criterion, then assign grade:

- structural alignment: 0 to 2
- location quality: 0 to 2
- mitigation quality: 0 to 2
- CE behavior clarity: 0 to 2
- volume/participation confirmation: 0 to 2

Grade mapping:

- `A` = 8 to 10 (high quality)
- `B` = 5 to 7 (tradable with caution)
- `C` = 0 to 4 (avoid or require stronger confirmation)

If grade is `C`, default bias is `WAIT` unless a separate stronger framework overrides with explicit evidence.

## Trace Requirements

- Report imbalance type and zone bounds.
- Report CE level and whether CE was respected or violated.
- Report mitigation status: unmitigated / partially mitigated / fully mitigated.
- If IFVG used, report original FVG violation evidence and retest behavior.

## Reference Code

```python
def fvg_bounds(c1_high, c1_low, c3_high, c3_low, direction: str):
    # direction in {"bullish", "bearish"}
    if direction == "bullish":
        # gap between candle1 high and candle3 low
        low = c1_high
        high = c3_low
    else:
        # gap between candle3 high and candle1 low
        low = c3_high
        high = c1_low
    if high <= low:
        return None
    ce = (low + high) / 2.0
    return {"low": low, "high": high, "ce": ce}


def mitigation_state(zone_low: float, zone_high: float, price_low: float, price_high: float):
    touched = price_high >= zone_low and price_low <= zone_high
    if not touched:
        return "unmitigated"
    fully = price_low <= zone_low and price_high >= zone_high
    if fully:
        return "fully_mitigated"
    return "partially_mitigated"


def fvg_quality_grade(
    structural_alignment: int,
    location_quality: int,
    mitigation_quality: int,
    ce_behavior_clarity: int,
    volume_confirmation: int,
):
    score = (
        structural_alignment
        + location_quality
        + mitigation_quality
        + ce_behavior_clarity
        + volume_confirmation
    )
    if score >= 8:
        grade = "A"
    elif score >= 5:
        grade = "B"
    else:
        grade = "C"
    return {"score": score, "grade": grade}
```
