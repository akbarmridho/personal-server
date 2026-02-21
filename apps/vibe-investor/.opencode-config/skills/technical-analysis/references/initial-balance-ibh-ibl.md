# Initial Balance IBH IBL

## Objective

Use Initial Balance as a probabilistic acceptance framework for intraday and period-open context.

## Initial Balance Concept

- IBH is highest traded price in initial observation window.
- IBL is lowest traded price in the same window.
- IB range represents early agreement, not certainty.
- Acceptance above/below IB suggests repricing agreement.
- Failed acceptance implies deviation/trap behavior.

## Intraday 60m Rules

- `R-IB-01` IBH is highest high of first 2 completed 60m bars in a session.
- `R-IB-02` IBL is lowest low of first 2 completed 60m bars in a session.
- `R-IB-03` `accepted_above_ibh`: close above IBH and next bar does not close back in range.
- `R-IB-04` `accepted_below_ibl`: close below IBL and next bar does not close back in range.
- `R-IB-05` failed break: excursion outside then close back inside within 1-2 bars.

Interpretation:

- `accepted_above_ibh` -> bullish acceptance bias
- `accepted_below_ibl` -> bearish acceptance bias
- failed breaks -> trap/deviation context

## Higher-Timeframe IB Overlay

For reporting, add stepped IBH/IBL overlay from period-open discovery windows.

- `R-IB-HTF-01` group daily candles by period (commonly month)
- `R-IB-HTF-02` compute IBH/IBL from first `n` candles (default `n=2`)
- `R-IB-HTF-03` draw stepped lines across each period
- `R-IB-HTF-04` label accepted/deviation state on latest period
- `R-IB-HTF-05` include artifact: `work/{SYMBOL}_ib_overlay.png`

## Trace Requirements

- latest IBH/IBL values and state label
- period + first_n bars used for overlay
- latest period acceptance/deviation label

## Reference Code

```python
import numpy as np
import pandas as pd
import mplfinance as mpf


def latest_ib_state(df_intraday: pd.DataFrame):
    x = df_intraday.copy()
    x["dt"] = pd.to_datetime(x["datetime"])
    x["session"] = x["dt"].dt.date
    latest_sess = sorted(x["session"].unique())[-1]
    d = x[x["session"] == latest_sess].sort_values("dt").reset_index(drop=True)

    if len(d) < 3:
        return {"state": "insufficient_session_bars"}

    ib = d.iloc[:2]
    ibh = float(ib["high"].max())
    ibl = float(ib["low"].min())

    state = "inside_ib_range"
    for i in range(2, len(d) - 1):
        c0 = float(d.iloc[i]["close"])
        c1 = float(d.iloc[i + 1]["close"])
        if c0 > ibh and c1 >= ibh:
            state = "accepted_above_ibh"
        elif c0 < ibl and c1 <= ibl:
            state = "accepted_below_ibl"
        elif c0 > ibh and c1 < ibh:
            state = "failed_break_above_ibh"
        elif c0 < ibl and c1 > ibl:
            state = "failed_break_below_ibl"

    return {"session": str(latest_sess), "ibh": ibh, "ibl": ibl, "state": state}


def compute_period_ib_levels(df_daily: pd.DataFrame, period: str = "M", first_n_bars: int = 2):
    x = df_daily.copy()
    x["dt"] = pd.to_datetime(x["datetime"])
    x = x.sort_values("dt").reset_index(drop=True)
    x["period"] = x["dt"].dt.to_period(period)

    ibh_line = pd.Series(np.nan, index=x.index, dtype="float64")
    ibl_line = pd.Series(np.nan, index=x.index, dtype="float64")
    period_info = []

    for p, g in x.groupby("period", sort=True):
        seed = g.head(first_n_bars)
        if len(seed) < first_n_bars:
            continue
        ibh = float(seed["high"].max())
        ibl = float(seed["low"].min())
        ibh_line.loc[g.index] = ibh
        ibl_line.loc[g.index] = ibl
        period_info.append({"period": str(p), "ibh": ibh, "ibl": ibl})

    return x, ibh_line, ibl_line, period_info


def latest_period_ib_state(df_daily: pd.DataFrame, period: str = "M", first_n_bars: int = 2):
    x, ibh_line, ibl_line, info = compute_period_ib_levels(df_daily, period=period, first_n_bars=first_n_bars)
    if len(info) == 0:
        return {"state": "insufficient_period_bars"}

    last = x.index[-1]
    prev = x.index[-2] if len(x) >= 2 else x.index[-1]
    ibh = float(ibh_line.loc[last])
    ibl = float(ibl_line.loc[last])
    c0 = float(x.loc[last, "close"])
    c1 = float(x.loc[prev, "close"])

    if c1 > ibh and c0 >= ibh:
        state = "accepted_above_ibh"
    elif c1 < ibl and c0 <= ibl:
        state = "accepted_below_ibl"
    elif c1 > ibh and c0 < ibh:
        state = "failed_break_above_ibh"
    elif c1 < ibl and c0 > ibl:
        state = "failed_break_below_ibl"
    else:
        state = "inside_ib_range"

    return {"period": period, "first_n_bars": first_n_bars, "ibh": ibh, "ibl": ibl, "state": state}


def plot_intraday_with_ib(df_intraday: pd.DataFrame, ibh: float, ibl: float, symbol: str, out_path: str):
    x = df_intraday.copy()
    x["dt"] = pd.to_datetime(x["datetime"])
    x = x.set_index("dt")[["open", "high", "low", "close", "volume"]]

    style = mpf.make_mpf_style(base_mpf_style="yahoo", gridstyle=":")
    mpf.plot(
        x,
        type="candle",
        volume=True,
        style=style,
        hlines=dict(hlines=[ibh, ibl], colors=["#2ca02c", "#d62728"], linewidths=[1.0, 1.0]),
        title=f"{symbol} Intraday IBH/IBL",
        savefig=dict(fname=out_path, dpi=150, bbox_inches="tight"),
    )


def plot_daily_with_ib_overlay(df_daily: pd.DataFrame, symbol: str, out_path: str, period: str = "M", first_n_bars: int = 2):
    x, ibh_line, ibl_line, _ = compute_period_ib_levels(df_daily, period=period, first_n_bars=first_n_bars)
    x = x.set_index("dt")[["open", "high", "low", "close", "volume"]]

    apds = [
        mpf.make_addplot(ibh_line.values, color="#2f6bff", width=1.2),
        mpf.make_addplot(ibl_line.values, color="#2f6bff", width=1.2),
    ]

    style = mpf.make_mpf_style(base_mpf_style="yahoo", gridstyle=":")
    mpf.plot(
        x,
        type="candle",
        volume=True,
        style=style,
        addplot=apds,
        title=f"{symbol} Initial Balance Overlay ({period}, {first_n_bars})",
        savefig=dict(fname=out_path, dpi=150, bbox_inches="tight"),
    )
```
