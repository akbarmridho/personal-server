# Liquidity Draw And Sweep

## Objective

Standardize liquidity analysis so direction, entry timing, and targets are framed by where liquidity is likely to be taken next.

## Core Principle

- Price seeks executable liquidity.
- Obvious stop clusters become liquidity pools.
- Sweep outcome (acceptance or rejection) determines next directional draw.

## Liquidity Pools

- swing highs and swing lows
- equal highs and equal lows (EQH/EQL)
- trendline stop clusters
- range boundaries (external liquidity)
- internal inefficiencies (FVG/IFVG) as internal liquidity

## Internal vs External Liquidity

- `external_liquidity`: major range highs/lows and structural swing extremes.
- `internal_liquidity`: inefficiencies inside delivery path, primarily FVG/IFVG.

Alternation model (base expectation, not certainty):

1. after external sweep, next draw often shifts to internal liquidity
2. after internal tag/mitigation, next draw often shifts to opposing external liquidity

## Rules

- `R-LIQ-01` Always identify current draw target and opposing draw target.
- `R-LIQ-02` Sweep must be labeled as acceptance or rejection.
- `R-LIQ-03` Wick-only sweep without follow-through is not directional confirmation.
- `R-LIQ-04` HTF sweep should be paired with LTF execution trigger when available.
- `R-LIQ-05` If draw target is unclear, downgrade directional conviction.
- `R-LIQ-06` Liquidity narrative cannot override invalidation and risk rules.

## HTF-LTF Alignment Playbook

1. define HTF liquidity objective (which pool is likely to be taken)
2. wait for HTF sweep signal (take and reject or accept)
3. shift to LTF for entry trigger (structure break, reclaim, or internal liquidity reaction)
4. place stop beyond sweep extreme or structural invalidation
5. target next mapped liquidity pool

## Trace Requirements

- `current_draw`: nearest likely liquidity objective
- `opposing_draw`: opposite-side liquidity objective
- `sweep_event`: none / eqh_swept / eql_swept / trendline_swept / swing_swept
- `sweep_outcome`: accepted / rejected / unresolved
- `liquidity_path`: external_to_internal / internal_to_external / unclear

## Implementation Note

Deterministic liquidity draw target extraction and sweep event classification (including trendline sweep detection) are implemented in:

- Module: `core`
- Script: `scripts/build_ta_context.py`
