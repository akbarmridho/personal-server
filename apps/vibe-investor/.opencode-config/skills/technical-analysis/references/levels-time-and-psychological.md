# Levels Time And Psychological

## Objective

Add contextual confluence from time-based pivots and round-number behavior without replacing structural level logic.

## Rules

- `R-LVL-08` Time-based pivots (monthly/weekly/daily open) can act as contextual decision levels.
- `R-LVL-09` Psychological round numbers can strengthen confluence, not replace structure.

## Time-Based Levels

Track when relevant:

- Monthly Open
- Weekly Open
- Daily Open

Typical use:

- as contextual pivot around higher-timeframe bias
- as acceptance/rejection clues when price reclaims or loses open levels

## Psychological Levels

Track major round numbers using instrument-appropriate increments.

Typical use:

- confluence with structural zones and profile nodes
- trap/deviation awareness around obvious round numbers

## Trace Requirements

- include relevant open levels and current relation (above/below/reclaim/loss)
- include round-number interactions only when materially relevant

## Reference Code

```python
import pandas as pd


def time_based_opens(df_daily: pd.DataFrame):
    x = df_daily.copy()
    x["dt"] = pd.to_datetime(x["datetime"])
    x = x.sort_values("dt").reset_index(drop=True)

    latest = x.iloc[-1]
    d_open = x[x["dt"].dt.date == latest["dt"].date()].iloc[0]["open"]

    week_key = latest["dt"].isocalendar().week
    w = x[x["dt"].dt.isocalendar().week == week_key]
    w_open = w.iloc[0]["open"] if len(w) > 0 else None

    month_key = latest["dt"].to_period("M")
    m = x[x["dt"].dt.to_period("M") == month_key]
    m_open = m.iloc[0]["open"] if len(m) > 0 else None

    return {
        "daily_open": float(d_open),
        "weekly_open": float(w_open) if w_open is not None else None,
        "monthly_open": float(m_open) if m_open is not None else None,
    }


def nearest_round_levels(price: float, step: float = 100.0):
    base = round(price / step) * step
    return {
        "round_below": float(base - step),
        "round_at": float(base),
        "round_above": float(base + step),
    }
```
