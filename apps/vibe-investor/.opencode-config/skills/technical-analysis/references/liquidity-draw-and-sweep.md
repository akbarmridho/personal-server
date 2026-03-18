# Liquidity Draw And Sweep

## Objective

Standardize liquidity analysis so direction, entry timing, and targets are framed by where liquidity is likely to be taken next.

## Core Principle

- Obvious stop clusters often become reaction zones or path magnets.
- Repeatedly visible swing extremes often act as liquidity pools.
- Sweep outcome (acceptance or rejection) determines next directional draw.

## Liquidity Pools

- swing highs and swing lows
- clustered equal highs and equal lows
- trendline stop clusters
- range boundaries (external liquidity)
- internal reaction zones inside the active delivery path

## Internal vs External Liquidity

- `external_liquidity`: major range highs/lows and structural swing extremes.
- `internal_liquidity`: nearer reaction zones inside the active path.

Alternation model (heuristic, not certainty):

1. after rejected external sweep, next draw often shifts to internal liquidity
2. after accepted external sweep, price may continue toward the external-side objective
3. after internal tag, the next draw depends on whether the tag was accepted or rejected

## Rules

- `R-LIQ-01` Always identify current draw target and opposing draw target.
- `R-LIQ-02` Sweep must be labeled as acceptance or rejection.
- `R-LIQ-03` Wick-only sweep without follow-through is not directional confirmation.
- `R-LIQ-04` HTF sweep should be paired with LTF execution trigger when available.
- `R-LIQ-05` If draw target is unclear, downgrade directional conviction.
- `R-LIQ-06` Liquidity narrative cannot override invalidation and risk rules.

## HTF-LTF Alignment Playbook

1. define HTF liquidity objective (which pool is likely to be taken)
2. wait for HTF sweep signal and classify whether it was accepted, rejected, or still unresolved
3. shift to LTF for entry trigger (structure break, reclaim, or local reaction)
4. place stop beyond sweep extreme or structural invalidation
5. target next mapped liquidity pool

## Trace Requirements

- `current_draw`: nearest likely liquidity objective
- `opposing_draw`: opposite-side liquidity objective
- `sweep_event`: none / eqh_swept / eql_swept / trendline_swept / swing_swept
- `sweep_side`: up / down when a side is classifiable
- `sweep_outcome`: accepted / rejected / unresolved
- `liquidity_path`: external_to_internal / internal_to_external / unclear

## Implementation Note

Deterministic liquidity sweep detection, draw target extraction, and post-sweep path remapping are implemented in:

- Module: `core`
- Scripts: `scripts/ta_common.py`, `scripts/build_ta_context.py`
