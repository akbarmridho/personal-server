# Red Flags Taxonomy

## Objective

Standardize warning signals and severity assessment for risk communication.

## Red Flag IDs

- `F1_STRUCTURE_BREAK`
- `F2_DISTRIBUTION`
- `F3_WEAK_BREAKOUT`
- `F4_LEVEL_EXHAUSTION`
- `F5_DIVERGENCE_ESCALATION`
- `F6_MARKET_CONTEXT_MISMATCH`
- `F7_MA_BREAKDOWN`
- `F8_POSITION_RISK`
- `F9_NO_NEARBY_SUPPORT`
- `F10_UNCONFIRMED_CHOCH`
- `F11_MISSING_PRIOR_CONTEXT`
- `F12_SMC_EVIDENCE_GAP`
- `F13_VOLUME_CONFLUENCE_WEAK`
- `F14_IMBALANCE_QUALITY_WEAK`
- `F15_NO_NEXT_ZONE_PATH`
- `F16_LIQUIDITY_MAP_MISSING`
- `F17_BREAKOUT_STALLING`
- `F18_BREAKOUT_FILTER_WEAK`

## Severity

- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`

## Trace Requirements

Every red flag should include:

- `flag_id`
- `severity`
- `why`
- `evidence_refs`

Also include overall risk summary: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` with one-sentence rationale.
