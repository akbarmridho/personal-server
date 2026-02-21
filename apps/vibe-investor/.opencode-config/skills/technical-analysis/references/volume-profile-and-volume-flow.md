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
- Session profile: per session/day profile for prior-session references.

## Rules

- `R-VP-01` Treat profile levels as zones, not single ticks.
- `R-VP-02` Prefer confluence: profile level + structure + price reaction.
- `R-VP-03` Session profile decisions should prioritize completed prior sessions over developing current session.
- `R-VP-04` POC re-tests can attract price; rejection/acceptance behavior defines bias.
- `R-VP-05` HVN suggests acceptance; LVN suggests potential continuation toward next HVN.
- `R-VP-06` Value-area context:
  - accepted above VAH -> bullish auction continuation bias
  - accepted below VAL -> bearish auction continuation bias
  - rotating inside VAH-VAL -> balance/mean-reversion context
- `R-VP-07` Volume-profile signal never overrides invalidation and stop discipline.

## Practical Mapping Guidance

- Build at least one anchor profile on the active structure leg.
- Add one fixed-range profile on last major consolidation/distribution range.
- Track at least 3 prior-session POCs as candidate reaction levels.
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
- prior-session POC levels and reaction notes
- acceptance state: above VAH / below VAL / inside value

## Reference Code

```python
import numpy as np
import pandas as pd


def value_area_from_hist(mids: np.ndarray, hist: np.ndarray, pct: float = 0.70):
    total = float(hist.sum())
    if total <= 0:
        return {"poc": None, "vah": None, "val": None}

    poc_idx = int(hist.argmax())
    order = np.argsort(hist)[::-1]
    cum = 0.0
    chosen = []
    for i in order:
        chosen.append(i)
        cum += float(hist[i])
        if cum >= total * pct:
            break

    vals = mids[np.array(chosen)]
    return {
        "poc": float(mids[poc_idx]),
        "vah": float(vals.max()),
        "val": float(vals.min()),
    }


def acceptance_vs_value(close_price: float, vah: float, val: float, prev_close: float | None = None):
    if close_price > vah:
        if prev_close is not None and prev_close >= vah:
            return "accepted_above_vah"
        return "probe_above_vah"
    if close_price < val:
        if prev_close is not None and prev_close <= val:
            return "accepted_below_val"
        return "probe_below_val"
    return "inside_value"


def prior_session_pocs(df_intraday: pd.DataFrame, max_sessions: int = 3):
    x = df_intraday.copy()
    x["dt"] = pd.to_datetime(x["datetime"])
    x["session"] = x["dt"].dt.date
    sessions = sorted(x["session"].unique())
    if len(sessions) <= 1:
        return []

    out = []
    for s in sessions[-(max_sessions + 1):-1]:
        d = x[x["session"] == s]
        if len(d) == 0:
            continue
        # proxy POC via price bin with max allocated volume
        lo, hi = float(d["low"].min()), float(d["high"].max())
        bins = 30
        edges = np.linspace(lo, hi, bins + 1)
        hist = np.zeros(bins)
        mids = (edges[:-1] + edges[1:]) / 2
        for _, r in d.iterrows():
            li = max(np.searchsorted(edges, r["low"], side="right") - 1, 0)
            hi_i = min(np.searchsorted(edges, r["high"], side="right") - 1, bins - 1)
            if hi_i >= li:
                hist[li:hi_i + 1] += float(r["volume"])
        out.append({"session": str(s), "poc": float(mids[int(hist.argmax())])})
    return out
```
