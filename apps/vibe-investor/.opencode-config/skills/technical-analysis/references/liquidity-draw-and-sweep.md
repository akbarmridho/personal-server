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

## Reference Code

```python
def liquidity_path_after_event(event_type: str):
    # event_type in {"external_sweep", "internal_tag", "none"}
    if event_type == "external_sweep":
        return "external_to_internal"
    if event_type == "internal_tag":
        return "internal_to_external"
    return "unclear"


def sweep_outcome(close_price: float, level: float, side: str):
    # side in {"above", "below"} means swept above level or below level
    if side == "above":
        return "accepted" if close_price > level else "rejected"
    return "accepted" if close_price < level else "rejected"


def pick_draw_targets(external_levels: list[float], internal_levels: list[float], price: float):
    ext_up = sorted([x for x in external_levels if x > price])
    ext_dn = sorted([x for x in external_levels if x < price], reverse=True)
    int_up = sorted([x for x in internal_levels if x > price])
    int_dn = sorted([x for x in internal_levels if x < price], reverse=True)
    return {
        "external_up": ext_up[0] if ext_up else None,
        "external_down": ext_dn[0] if ext_dn else None,
        "internal_up": int_up[0] if int_up else None,
        "internal_down": int_dn[0] if int_dn else None,
    }
```
