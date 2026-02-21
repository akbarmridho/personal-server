# Levels VPVR And Confluence

## Objective

Use volume-by-price structure to strengthen level reliability and improve reaction/acceptance assessment.

## Rules

- `R-LVL-05` Prefer confluence zones (swing + VPVR + fib/round number) over isolated levels.
- `R-VPVR-01` Use POC as fair-value magnet.
- `R-VPVR-02` HVN is reaction zone; LVN is fast-travel zone.
- `R-VPVR-03` Use VPVR as confluence, not standalone trigger.
- `R-VPVR-04` If breakout enters LVN with acceptance, continuation probability increases toward next HVN.

## Practical Notes

- focus on top HVN/LVN zones, not every node
- combine VPVR context with structural levels and acceptance behavior

## Trace Requirements

- POC/HVN/LVN values from analyzed window
- confluence note linking VPVR node to structural decision zone

## Reference Code

```python
import numpy as np


def vpvr_core(df, bins=40):
    lo, hi = df["low"].min(), df["high"].max()
    edges = np.linspace(lo, hi, bins + 1)
    hist = np.zeros(bins)
    mids = (edges[:-1] + edges[1:]) / 2

    for _, row in df.iterrows():
        li = np.searchsorted(edges, row["low"], side="right") - 1
        hi_i = np.searchsorted(edges, row["high"], side="right") - 1
        li = max(li, 0)
        hi_i = min(hi_i, bins - 1)
        if hi_i >= li:
            hist[li:hi_i + 1] += row["volume"]

    poc_idx = int(hist.argmax())
    return {
        "poc": float(mids[poc_idx]),
        "hvn_top3": [float(x) for x in mids[np.argsort(hist)[-3:]]],
        "lvn_top3": [float(x) for x in mids[np.argsort(hist)[:3]]],
    }
```
