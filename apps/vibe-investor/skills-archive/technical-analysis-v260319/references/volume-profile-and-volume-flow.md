# Volume Profile And Volume Flow

## Objective

Map institutional participation by price (not only by time) and convert volume-profile structure into actionable support/resistance zones.

## Core Principle

- Candles record outcome.
- Participation volume explains conviction.
- Price levels with repeated high participation are more likely to produce reactions.

## Profile Components

- `POC` (Point of Control): highest traded volume price in selected range.
- `VAH` / `VAL`: upper/lower value-area boundaries (default value area 70 percent).
- `HVN`: high-volume node, accepted/fair-value area.
- `LVN`: low-volume node, fast-travel area.

## Tool Modes

Use one or more modes depending on objective:

- Anchored profile: from a meaningful start point to current bar.
- Fixed-range profile: historical range isolation.

## Rules

- `R-VP-01` Treat profile levels as zones, not single ticks.
- `R-VP-02` Prefer confluence: profile level + structure + price reaction.
- `R-VP-03` POC re-tests can attract price; rejection/acceptance behavior defines bias.
- `R-VP-04` HVN suggests acceptance; LVN suggests potential continuation toward next HVN.
- `R-VP-05` Value-area context:
  - accepted above VAH -> bullish auction continuation bias
  - accepted below VAL -> bearish auction continuation bias
  - rotating inside VAH-VAL -> balance/mean-reversion context
- `R-VP-06` Volume-profile signal never overrides invalidation and stop discipline.

## Practical Mapping Guidance

- Build at least one anchor profile on the active structure leg.
- Add one fixed-range profile on last major consolidation/distribution range.
- Convert key levels into zones with ATR-aware width.

Anchor-point workflow:

- Select one high-confidence anchor where POC/HVN and visible rejection overlap.
- From anchor, project candidate checkpoints using instrument-normalized step size (for example ATR multiples) rather than fixed point counts.
- Validate each projected checkpoint with structure reaction before promoting it to a tradable zone.

## Trace Requirements

Report these when volume-profile module is active:

- profile mode(s) used and range anchors
- latest POC, VAH, VAL
- top HVN/LVN zones used in decision
- acceptance state: above VAH / below VAL / inside value

## Implementation Note

Deterministic volume-profile context extraction is implemented in:

- Module: `vpvr`
- Script: `scripts/build_ta_context.py`
- Script: `scripts/generate_ta_charts.py`
