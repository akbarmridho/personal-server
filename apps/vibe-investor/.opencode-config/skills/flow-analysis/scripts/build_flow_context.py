#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any

import pandas as pd

PRIMARY_WINDOW_DAYS = 30
TRUST_WINDOW_DAYS = 60
BETA_PRIMARY_WINDOW_DAYS = 120
BETA_SHORT_WINDOW_DAYS = 60
ATR_WINDOW_DAYS = 20
RECENT_WINDOW_DAYS = 5
DIVERGENCE_WINDOW_DAYS = 10
CADI_TOP_BROKERS = 10
GVPR_TOP_BROKERS = 5
MIN_REQUIRED_FLOW_DAYS = 10

LOW_COVERAGE_THRESHOLD = 0.45
VERY_LOW_COVERAGE_THRESHOLD = 0.30

LIQUIDITY_HIGH_THRESHOLD = 500_000_000_000
LIQUIDITY_MEDIUM_THRESHOLD = 100_000_000_000
LIQUIDITY_LOW_THRESHOLD = 10_000_000_000

MARKET_CAP_LARGE_THRESHOLD = 40_000_000_000_000
MARKET_CAP_MID_THRESHOLD = 5_000_000_000_000
MARKET_CAP_SMALL_THRESHOLD = 500_000_000_000

GINI_STRONG_THRESHOLD = 0.12
GINI_LEAN_THRESHOLD = 0.02

MFI_DIVERGENCE_SLOPE_THRESHOLD = 0.75
FREQ_GINI_PRICE_FLAT_THRESHOLD = 0.001
FREQ_GINI_FREQUENCY_SLOPE_THRESHOLD = 0.03
FREQ_GINI_ASYMMETRY_THRESHOLD = 0.08
FREQ_GINI_MIN_BUY_GINI = 0.55
FREQ_GINI_MIN_SELL_GINI = 0.55

HIGH_VOLATILITY_ATR_PCT_THRESHOLD = 0.045


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build deterministic broker-flow context from broker-flow raw series and OHLCV JSON."
    )
    parser.add_argument(
        "--broker-flow",
        required=True,
        help="Input JSON path from fetch-broker-flow.",
    )
    parser.add_argument(
        "--ohlcv",
        required=True,
        help="Input stock JSON path from fetch-ohlcv.",
    )
    parser.add_argument(
        "--benchmark-ohlcv",
        default=None,
        help="Optional IHSG benchmark JSON path from fetch-ohlcv for beta metrics.",
    )
    parser.add_argument("--symbol", required=True, help="Ticker symbol, e.g. ANTM.")
    parser.add_argument("--outdir", default="work", help="Output directory.")
    parser.add_argument(
        "--output", default=None, help="Optional explicit output JSON path."
    )
    parser.add_argument(
        "--purpose-mode",
        choices=["INITIAL", "UPDATE", "POSTMORTEM"],
        default="INITIAL",
        help="Runtime purpose mode.",
    )
    return parser.parse_args()


def _to_float(value: Any, default: float = 0.0) -> float:
    if value is None or isinstance(value, bool):
        return default
    if isinstance(value, str):
        try:
            parsed = float(value)
        except ValueError:
            return default
        return parsed if math.isfinite(parsed) else default
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return default
    return parsed if math.isfinite(parsed) else default


def _safe_ratio(numerator: float, denominator: float) -> float:
    if denominator == 0:
        return 0.0
    return float(numerator / denominator)


def _clip(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _weighted_average_price(rows: list[dict[str, Any]]) -> float:
    total_lots = 0.0
    weighted_sum = 0.0
    for row in rows:
        lots = _to_float(row.get("lots"))
        avg_price = _to_float(row.get("avg_price"))
        if lots <= 0 or avg_price <= 0:
            continue
        total_lots += lots
        weighted_sum += avg_price * lots
    return _safe_ratio(weighted_sum, total_lots)


def _aggregate_rows(rows_by_day: list[list[dict[str, Any]]]) -> list[dict[str, Any]]:
    by_broker: dict[str, dict[str, Any]] = {}
    for rows in rows_by_day:
        for row in rows:
            broker = str(row.get("broker", "")).strip().upper()
            if not broker:
                continue
            current = by_broker.setdefault(
                broker,
                {
                    "broker": broker,
                    "value": 0.0,
                    "lots": 0.0,
                    "frequency": 0.0,
                    "_weighted_price_sum": 0.0,
                },
            )
            value = _to_float(row.get("value"))
            lots = _to_float(row.get("lots"))
            frequency = _to_float(row.get("frequency"))
            avg_price = _to_float(row.get("avg_price"))
            current["value"] += value
            current["lots"] += lots
            current["frequency"] += frequency
            if lots > 0 and avg_price > 0:
                current["_weighted_price_sum"] += avg_price * lots

    out: list[dict[str, Any]] = []
    for broker, item in by_broker.items():
        lots = _to_float(item.get("lots"))
        out.append(
            {
                "broker": broker,
                "value": round(_to_float(item.get("value"))),
                "lots": round(lots),
                "frequency": round(_to_float(item.get("frequency"))),
                "avg_price": _safe_ratio(_to_float(item.get("_weighted_price_sum")), lots)
                if lots > 0
                else 0.0,
            }
        )
    return out


def _series_slope(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    series = pd.Series(values, dtype="float64")
    x = pd.Series(range(len(series)), dtype="float64")
    denom = float(((x - x.mean()) ** 2).sum())
    if denom == 0:
        return 0.0
    numer = float(((x - x.mean()) * (series - series.mean())).sum())
    return numer / denom


def _spearman_corr(left: list[float], right: list[float]) -> float:
    if len(left) < 3 or len(left) != len(right):
        return 0.0
    left_series = pd.Series(left, dtype="float64")
    right_series = pd.Series(right, dtype="float64")
    corr = left_series.rank().corr(right_series.rank(), method="pearson")
    if corr is None or not math.isfinite(float(corr)):
        return 0.0
    return float(corr)


def _rolling_chunks(values: list[float], size: int) -> list[float]:
    if size <= 0:
        return []
    return values[-size:]


def _money_flow_index(days: list[dict[str, Any]], period: int = 14) -> float:
    if len(days) < period + 1:
        return 50.0
    typical_prices: list[float] = []
    raw_money_flows: list[float] = []
    for day in days:
        high = _to_float(day.get("high"))
        low = _to_float(day.get("low"))
        close = _to_float(day.get("close"))
        volume = _to_float(day.get("market_volume"))
        typical_price = (high + low + close) / 3.0
        typical_prices.append(typical_price)
        raw_money_flows.append(typical_price * volume)

    positive_flow = 0.0
    negative_flow = 0.0
    for idx in range(len(days) - period, len(days)):
        prev_idx = idx - 1
        if typical_prices[idx] > typical_prices[prev_idx]:
            positive_flow += raw_money_flows[idx]
        elif typical_prices[idx] < typical_prices[prev_idx]:
            negative_flow += raw_money_flows[idx]

    if negative_flow <= 0:
        return 100.0 if positive_flow > 0 else 50.0
    ratio = positive_flow / negative_flow
    return 100.0 - (100.0 / (1.0 + ratio))


def _mfi_series(days: list[dict[str, Any]], period: int = 14) -> list[float]:
    return [_money_flow_index(days[: idx + 1], period=period) for idx in range(len(days))]


def _atr_volatility_metrics(days: list[dict[str, Any]]) -> dict[str, Any]:
    window = days[-min(ATR_WINDOW_DAYS, len(days)) :]
    if len(window) < 2:
        return {
            "atr_pct": 0.0,
            "volatility_profile": "normal",
        }

    prev_close = float(window[0]["close"])
    tr_pct_values: list[float] = []
    for day in window:
        high = float(day["high"])
        low = float(day["low"])
        close = float(day["close"])
        true_range = max(
            high - low,
            abs(high - prev_close),
            abs(low - prev_close),
        )
        tr_pct_values.append(_safe_ratio(true_range, close))
        prev_close = close

    atr_pct = float(pd.Series(tr_pct_values, dtype="float64").mean())
    return {
        "atr_pct": round(atr_pct, 6),
        "volatility_profile": "high_volatility"
        if atr_pct >= HIGH_VOLATILITY_ATR_PCT_THRESHOLD
        else "normal",
    }


def _beta_from_returns(
    stock_returns: pd.Series,
    benchmark_returns: pd.Series,
    window_days: int,
) -> float:
    window = pd.concat(
        [stock_returns.tail(window_days), benchmark_returns.tail(window_days)],
        axis=1,
        keys=["stock", "benchmark"],
    ).dropna()
    if len(window) < 20:
        raise ValueError(
            f"not enough overlapping return rows for {window_days}D beta: got {len(window)}"
        )
    benchmark_var = float(window["benchmark"].var(ddof=0))
    if benchmark_var <= 0 or not math.isfinite(benchmark_var):
        raise ValueError(f"invalid benchmark return variance for {window_days}D beta")
    beta_value = float(window["stock"].cov(window["benchmark"], ddof=0) / benchmark_var)
    if not math.isfinite(beta_value):
        raise ValueError(f"invalid {window_days}D beta")
    return beta_value


def _beta_classification(beta_120d: float) -> str:
    if beta_120d < 0.7:
        return "defensive"
    if beta_120d <= 1.3:
        return "moderate"
    return "aggressive"


def _beta_metrics(
    stock_daily_ohlcv: pd.DataFrame,
    benchmark_daily_ohlcv: pd.DataFrame,
    as_of_date: str,
) -> dict[str, Any]:
    stock = stock_daily_ohlcv[["date", "close"]].copy()
    benchmark = benchmark_daily_ohlcv[["date", "close"]].copy()
    stock["date"] = stock["date"].astype(str)
    benchmark["date"] = benchmark["date"].astype(str)

    merged = (
        stock.merge(
            benchmark,
            on="date",
            how="inner",
            suffixes=("_stock", "_benchmark"),
        )
        .sort_values("date")
        .reset_index(drop=True)
    )
    merged = merged[merged["date"] <= as_of_date].copy()
    if len(merged) < BETA_SHORT_WINDOW_DAYS + 1:
        raise ValueError(
            f"not enough overlapping stock/IHSG OHLCV rows for beta: got {len(merged)}"
        )

    stock_returns = merged["close_stock"].pct_change().dropna()
    benchmark_returns = merged["close_benchmark"].pct_change().dropna()
    beta_120d = _beta_from_returns(
        stock_returns,
        benchmark_returns,
        min(BETA_PRIMARY_WINDOW_DAYS, len(stock_returns)),
    )
    beta_60d = _beta_from_returns(
        stock_returns,
        benchmark_returns,
        min(BETA_SHORT_WINDOW_DAYS, len(stock_returns)),
    )
    return {
        "beta_120d": round(beta_120d, 6),
        "beta_60d": round(beta_60d, 6),
        "beta_classification": _beta_classification(beta_120d),
    }


def _longest_streak(signs: list[int], target: int) -> int:
    best = 0
    current = 0
    for sign in signs:
        if sign == target:
            current += 1
            best = max(best, current)
        else:
            current = 0
    return best


def _liquidity_profile(avg_daily_value: float) -> str:
    if avg_daily_value >= LIQUIDITY_HIGH_THRESHOLD:
        return "high"
    if avg_daily_value >= LIQUIDITY_MEDIUM_THRESHOLD:
        return "medium"
    if avg_daily_value >= LIQUIDITY_LOW_THRESHOLD:
        return "low"
    return "very_low"


def _market_cap_profile(market_cap_value: float) -> str:
    if market_cap_value >= MARKET_CAP_LARGE_THRESHOLD:
        return "large"
    if market_cap_value >= MARKET_CAP_MID_THRESHOLD:
        return "mid"
    if market_cap_value >= MARKET_CAP_SMALL_THRESHOLD:
        return "small"
    return "micro"


def _coverage_state(avg_coverage: float) -> str:
    if avg_coverage < VERY_LOW_COVERAGE_THRESHOLD:
        return "very_low"
    if avg_coverage < LOW_COVERAGE_THRESHOLD:
        return "low"
    if avg_coverage < 0.65:
        return "moderate"
    return "good"


def load_broker_flow(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        raw = json.load(f)
    if not isinstance(raw, dict):
        raise ValueError("broker-flow input must be a JSON object")
    series = raw.get("series")
    if not isinstance(series, list) or not series:
        raise ValueError("broker-flow input missing required non-empty series[]")
    return raw


def load_daily_ohlcv(path: Path) -> pd.DataFrame:
    with path.open("r", encoding="utf-8") as f:
        raw = json.load(f)
    daily = raw.get("daily")
    if not isinstance(daily, list) or not daily:
        raise ValueError("ohlcv input missing required non-empty daily[]")
    df = pd.DataFrame(daily)
    required = ["date", "datetime", "open", "high", "low", "close", "volume", "value"]
    for col in required:
        if col not in df.columns:
            raise ValueError(f"ohlcv daily[] missing required field: {col}")
    df["datetime"] = pd.to_datetime(df["datetime"], errors="coerce")
    df = (
        df.dropna(subset=["datetime"])
        .sort_values("datetime")
        .drop_duplicates(subset=["date"])
        .reset_index(drop=True)
    )
    for col in [
        "open",
        "high",
        "low",
        "close",
        "volume",
        "value",
        "market_cap_close",
        "share_outstanding",
    ]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
    if df.empty:
        raise ValueError("ohlcv daily[] has no valid rows")
    return df


def _normalize_rows(rows: Any) -> list[dict[str, Any]]:
    if not isinstance(rows, list):
        return []
    out: list[dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        broker = str(row.get("broker", "")).strip().upper()
        if not broker:
            continue
        out.append(
            {
                "broker": broker,
                "value": round(_to_float(row.get("value"))),
                "lots": round(_to_float(row.get("lots"))),
                "avg_price": _to_float(row.get("avg_price")),
                "frequency": round(_to_float(row.get("frequency"))),
            }
        )
    return out


def _hhi_from_rows(rows: list[dict[str, Any]]) -> float:
    total_value = sum(_to_float(row.get("value")) for row in rows)
    if total_value <= 0:
        return 0.0
    return float(
        sum((_safe_ratio(_to_float(row.get("value")), total_value) ** 2) for row in rows)
        * 10_000
    )


def _gini_from_rows(rows: list[dict[str, Any]]) -> float:
    values = sorted(
        value
        for value in (_to_float(row.get("value")) for row in rows)
        if value > 0
    )
    if len(values) < 2:
        return 0.0
    total_value = sum(values)
    if total_value <= 0:
        return 0.0
    weighted_sum = sum((idx + 1) * value for idx, value in enumerate(values))
    gini_value = ((2.0 * weighted_sum) / (len(values) * total_value)) - (
        (len(values) + 1.0) / len(values)
    )
    return _clip(gini_value, 0.0, 1.0)


def _window_vwap(days: list[dict[str, Any]]) -> float:
    total_value = sum(_to_float(day.get("market_value")) for day in days)
    total_volume = sum(_to_float(day.get("market_volume")) for day in days)
    return _safe_ratio(total_value, total_volume)


def _wash_component(
    buy_row: dict[str, Any],
    sell_row: dict[str, Any],
    vwap_day: float,
    market_value: float,
) -> tuple[bool, float]:
    buy_value = _to_float(buy_row.get("value"))
    sell_value = _to_float(sell_row.get("value"))
    if buy_value <= 0 or sell_value <= 0 or vwap_day <= 0 or market_value <= 0:
        return False, 0.0
    overlap_share = _safe_ratio(min(buy_value, sell_value), market_value)
    volume_symmetry = 1.0 - abs(buy_value - sell_value) / (buy_value + sell_value)
    price_gap_ratio = abs(
        _to_float(buy_row.get("avg_price")) - _to_float(sell_row.get("avg_price"))
    ) / vwap_day
    buy_freq = _to_float(buy_row.get("frequency"))
    sell_freq = _to_float(sell_row.get("frequency"))
    freq_ratio = (
        _safe_ratio(min(buy_freq, sell_freq), max(buy_freq, sell_freq))
        if buy_freq > 0 and sell_freq > 0
        else 0.0
    )
    flagged = (
        overlap_share >= 0.03
        and volume_symmetry >= 0.97
        and price_gap_ratio <= 0.001
        and freq_ratio >= 0.80
    )
    risk_score = overlap_share if flagged else 0.0
    return flagged, risk_score


def _daily_metrics(
    date: str,
    buy_rows: list[dict[str, Any]],
    sell_rows: list[dict[str, Any]],
    market_row: pd.Series,
) -> dict[str, Any]:
    high = _to_float(market_row.get("high"))
    low = _to_float(market_row.get("low"))
    close = _to_float(market_row.get("close"))
    market_volume = _to_float(market_row.get("volume"))
    raw_market_value = _to_float(market_row.get("value"))
    market_value = (
        raw_market_value if raw_market_value > 0 else max(close * market_volume, 0.0)
    )
    market_volume = _to_float(market_row.get("volume"))
    vwap_day = _safe_ratio(market_value, market_volume) if market_volume > 0 else close
    if market_value <= 0 or vwap_day <= 0:
        raise ValueError(f"{date} missing valid market value or volume in OHLCV")
    raw_market_cap = _to_float(market_row.get("market_cap_close"))
    share_outstanding = _to_float(market_row.get("share_outstanding"))
    market_cap_close = (
        raw_market_cap if raw_market_cap > 0 else max(close * share_outstanding, 0.0)
    )

    buy_map = {row["broker"]: row for row in buy_rows}
    sell_map = {row["broker"]: row for row in sell_rows}
    overlapping = set(buy_map).intersection(sell_map)

    wash_risk_raw = 0.0
    sanitized_net_by_broker: dict[str, float] = {}
    visible_gross_by_broker: dict[str, float] = {}

    for broker in set(buy_map).union(sell_map):
        buy_row = buy_map.get(broker)
        sell_row = sell_map.get(broker)
        buy_value = _to_float(buy_row.get("value")) if buy_row else 0.0
        sell_value = _to_float(sell_row.get("value")) if sell_row else 0.0
        visible_gross_by_broker[broker] = buy_value + sell_value
        if buy_row and sell_row:
            flagged, risk_component = _wash_component(
                buy_row, sell_row, vwap_day=vwap_day, market_value=market_value
            )
            wash_risk_raw += risk_component
            sanitized_net_by_broker[broker] = 0.0 if flagged else (buy_value - sell_value)
        else:
            sanitized_net_by_broker[broker] = buy_value - sell_value

    dominant_brokers = sorted(
        sanitized_net_by_broker.items(), key=lambda item: abs(item[1]), reverse=True
    )[:CADI_TOP_BROKERS]
    cadi_increment = _safe_ratio(sum(value for _broker, value in dominant_brokers), market_value)

    visible_buy_value = sum(_to_float(row.get("value")) for row in buy_rows)
    visible_sell_value = sum(_to_float(row.get("value")) for row in sell_rows)

    buy_coverage = _safe_ratio(visible_buy_value, market_value)
    sell_coverage = _safe_ratio(visible_sell_value, market_value)

    buy_avg_px = _weighted_average_price(buy_rows)
    sell_avg_px = _weighted_average_price(sell_rows)
    buy_dev = _safe_ratio(buy_avg_px, vwap_day) - 1.0 if buy_avg_px > 0 else 0.0
    sell_dev = _safe_ratio(sell_avg_px, vwap_day) - 1.0 if sell_avg_px > 0 else 0.0

    buy_top_values = sorted((_to_float(row.get("value")) for row in buy_rows), reverse=True)
    sell_top_values = sorted((_to_float(row.get("value")) for row in sell_rows), reverse=True)
    buy_gini = _gini_from_rows(buy_rows)
    sell_gini = _gini_from_rows(sell_rows)

    return {
        "date": date,
        "high": high,
        "low": low,
        "close": close,
        "market_value": market_value,
        "market_volume": market_volume,
        "market_vwap": vwap_day,
        "market_cap_close": market_cap_close,
        "coverage_buy": buy_coverage,
        "coverage_sell": sell_coverage,
        "buy_avg_vs_vwap_pct": buy_dev,
        "sell_avg_vs_vwap_pct": sell_dev,
        "bs_spread_pct": buy_dev - sell_dev,
        "top_buyer_share_pct": _safe_ratio(
            buy_top_values[0] if buy_top_values else 0.0, market_value
        ),
        "top_seller_share_pct": _safe_ratio(
            sell_top_values[0] if sell_top_values else 0.0, market_value
        ),
        "gvpr_buy_pct": _safe_ratio(sum(buy_top_values[:GVPR_TOP_BROKERS]), market_value),
        "gvpr_sell_pct": _safe_ratio(sum(sell_top_values[:GVPR_TOP_BROKERS]), market_value),
        "buy_hhi": _hhi_from_rows(buy_rows),
        "sell_hhi": _hhi_from_rows(sell_rows),
        "buy_gini": buy_gini,
        "sell_gini": sell_gini,
        "gini_asymmetry": buy_gini - sell_gini,
        "total_frequency": sum(_to_float(row.get("frequency")) for row in buy_rows)
        + sum(_to_float(row.get("frequency")) for row in sell_rows),
        "net_flow_visible_value": sum(sanitized_net_by_broker.values()),
        "cadi_increment": cadi_increment,
        "wash_risk_pct": _clip(wash_risk_raw * 100.0, 0.0, 100.0),
        "overlap_count": len(overlapping),
        "sanitized_net_by_broker": sanitized_net_by_broker,
        "visible_gross_by_broker": visible_gross_by_broker,
        "buy_rows": buy_rows,
        "sell_rows": sell_rows,
    }


def _execution_quality(side: str, deviation_pct: float) -> str:
    if side == "buy":
        if deviation_pct >= 0.005:
            return "aggressive"
        if deviation_pct >= 0.001:
            return "constructive"
        if deviation_pct <= -0.005:
            return "passive"
        return "neutral"

    if deviation_pct <= -0.005:
        return "aggressive"
    if deviation_pct <= -0.001:
        return "constructive"
    if deviation_pct >= 0.005:
        return "passive"
    return "neutral"


def _trend_strength_from_slope(slope: float, values: list[float]) -> tuple[str, str]:
    scale = pd.Series(values, dtype="float64").std(ddof=0)
    scale_value = float(scale) if scale is not None and math.isfinite(float(scale)) else 0.0
    normalized = 0.0 if scale_value == 0 else slope / scale_value
    if normalized >= 0.15:
        return "rising", "strong_positive"
    if normalized >= 0.04:
        return "rising", "positive"
    if normalized <= -0.15:
        return "falling", "strong_negative"
    if normalized <= -0.04:
        return "falling", "negative"
    return "flat", "neutral"


def _persistence(primary_days: list[dict[str, Any]]) -> tuple[float, str]:
    if not primary_days:
        return 0.0, "mixed"

    broker_signs: dict[str, list[int]] = {}
    broker_weights: dict[str, float] = {}

    for day in primary_days:
        market_value = float(day["market_value"])
        nets = day["sanitized_net_by_broker"]
        for broker, net_value in nets.items():
            signs = broker_signs.setdefault(broker, [])
            signs.append(1 if net_value > 0 else -1 if net_value < 0 else 0)
            broker_weights[broker] = broker_weights.get(broker, 0.0) + abs(net_value) / market_value

    primary_len = len(primary_days)
    buy_persistence = 0.0
    sell_persistence = 0.0
    for broker, signs in broker_signs.items():
        buy_streak = _longest_streak(signs, 1)
        sell_streak = _longest_streak(signs, -1)
        weight = broker_weights.get(broker, 0.0)
        buy_persistence += weight * (buy_streak / primary_len)
        sell_persistence += weight * (sell_streak / primary_len)

    total = buy_persistence + sell_persistence
    score = 0.0 if total == 0 else ((buy_persistence - sell_persistence) / total) * 100.0

    if score >= 35:
        state = "strong_buy_persistence"
    elif score >= 12:
        state = "buy_persistence"
    elif score <= -35:
        state = "strong_sell_persistence"
    elif score <= -12:
        state = "sell_persistence"
    else:
        state = "mixed"
    return score, state


def _correlation_state(value: float) -> str:
    score = abs(value)
    if score >= 0.60:
        return "strong"
    if score >= 0.35:
        return "moderate"
    if score >= 0.15:
        return "weak"
    return "minimal"


def _gini_asymmetry_state(
    avg_gini_asymmetry: float,
    avg_buy_hhi: float,
    avg_sell_hhi: float,
    avg_gvpr_buy: float,
    avg_gvpr_sell: float,
) -> str:
    if avg_gini_asymmetry > GINI_STRONG_THRESHOLD:
        return "institutional_accumulation"
    if avg_gini_asymmetry >= GINI_LEAN_THRESHOLD:
        return "leaning_accumulation"
    if avg_gini_asymmetry < -GINI_STRONG_THRESHOLD:
        return "institutional_distribution"
    if avg_gini_asymmetry <= -GINI_LEAN_THRESHOLD:
        return "leaning_distribution"
    if avg_buy_hhi - avg_sell_hhi >= 250 and avg_gvpr_buy - avg_gvpr_sell >= 0.02:
        return "leaning_accumulation"
    if avg_sell_hhi - avg_buy_hhi >= 250 and avg_gvpr_sell - avg_gvpr_buy >= 0.02:
        return "leaning_distribution"
    return "balanced"


def _frequency_profile(
    buy_rows: list[dict[str, Any]], sell_rows: list[dict[str, Any]]
) -> tuple[float, str]:
    buy_value = sum(_to_float(row.get("value")) for row in buy_rows)
    sell_value = sum(_to_float(row.get("value")) for row in sell_rows)
    buy_freq = sum(_to_float(row.get("frequency")) for row in buy_rows)
    sell_freq = sum(_to_float(row.get("frequency")) for row in sell_rows)
    buy_ticket_value = _safe_ratio(buy_value, buy_freq)
    sell_ticket_value = _safe_ratio(sell_value, sell_freq)
    score = _clip(
        math.log((_safe_ratio(buy_ticket_value + 1.0, sell_ticket_value + 1.0))), -1.0, 1.0
    )
    if score >= 0.18:
        return score, "buy_heavy"
    if score <= -0.18:
        return score, "sell_heavy"
    if max(buy_ticket_value, sell_ticket_value) > 0:
        return score, "moderate"
    return 0.0, "balanced"


def _mfi_state(mfi_value: float) -> str:
    if mfi_value <= 20:
        return "extreme_bullish"
    if mfi_value < 40:
        return "bullish"
    if mfi_value <= 60:
        return "neutral"
    if mfi_value < 80:
        return "bearish"
    return "extreme_bearish"


def _divergence_states(primary_days: list[dict[str, Any]]) -> dict[str, str]:
    if len(primary_days) < 5:
        return {
            "cadi_divergence_state": "unclear",
            "mfi_divergence_state": "unclear",
            "freq_gini_divergence_state": "unclear",
            "divergence_summary": "unclear",
        }

    window = primary_days[-min(DIVERGENCE_WINDOW_DAYS, len(primary_days)) :]
    price_values = [float(day["close"]) for day in window]
    cadi_series: list[float] = []
    running = 0.0
    for day in window:
        running += float(day["cadi_increment"])
        cadi_series.append(running)
    price_slope = _series_slope(price_values)
    cadi_slope = _series_slope(cadi_series)
    avg_price = sum(price_values) / len(price_values)
    normalized_price_slope = _safe_ratio(price_slope, avg_price)

    if normalized_price_slope <= -0.001 and cadi_slope >= 0.0025:
        cadi_divergence_state = "bullish_divergence"
    elif normalized_price_slope >= 0.001 and cadi_slope <= -0.0025:
        cadi_divergence_state = "bearish_divergence"
    else:
        cadi_divergence_state = "none"

    mfi_values = _mfi_series(primary_days)[-len(window) :]
    mfi_slope = _series_slope(mfi_values)
    if (
        normalized_price_slope <= -0.001
        and mfi_slope >= MFI_DIVERGENCE_SLOPE_THRESHOLD
    ):
        mfi_divergence_state = "bullish_divergence"
    elif (
        normalized_price_slope >= 0.001
        and mfi_slope <= -MFI_DIVERGENCE_SLOPE_THRESHOLD
    ):
        mfi_divergence_state = "bearish_divergence"
    else:
        mfi_divergence_state = "none"

    frequency_values = [float(day["total_frequency"]) for day in window]
    avg_frequency = sum(frequency_values) / len(frequency_values)
    normalized_frequency_slope = _safe_ratio(_series_slope(frequency_values), avg_frequency)
    avg_buy_gini = float(pd.Series([day["buy_gini"] for day in window]).mean())
    avg_sell_gini = float(pd.Series([day["sell_gini"] for day in window]).mean())
    avg_gini_asymmetry = float(
        pd.Series([day["gini_asymmetry"] for day in window]).mean()
    )

    if (
        abs(normalized_price_slope) <= FREQ_GINI_PRICE_FLAT_THRESHOLD
        and normalized_frequency_slope >= FREQ_GINI_FREQUENCY_SLOPE_THRESHOLD
        and avg_buy_gini >= FREQ_GINI_MIN_BUY_GINI
        and avg_gini_asymmetry >= FREQ_GINI_ASYMMETRY_THRESHOLD
    ):
        freq_gini_divergence_state = "bullish_divergence"
    elif (
        abs(normalized_price_slope) <= FREQ_GINI_PRICE_FLAT_THRESHOLD
        and normalized_frequency_slope >= FREQ_GINI_FREQUENCY_SLOPE_THRESHOLD
        and avg_sell_gini >= FREQ_GINI_MIN_SELL_GINI
        and avg_gini_asymmetry <= -FREQ_GINI_ASYMMETRY_THRESHOLD
    ):
        freq_gini_divergence_state = "bearish_divergence"
    else:
        freq_gini_divergence_state = "none"

    states = [
        cadi_divergence_state,
        mfi_divergence_state,
        freq_gini_divergence_state,
    ]
    if "bullish_divergence" in states and "bearish_divergence" not in states:
        divergence_summary = "bullish_divergence"
    elif "bearish_divergence" in states and "bullish_divergence" not in states:
        divergence_summary = "bearish_divergence"
    elif "bullish_divergence" in states and "bearish_divergence" in states:
        divergence_summary = "mixed"
    else:
        divergence_summary = "none"

    return {
        "cadi_divergence_state": cadi_divergence_state,
        "mfi_divergence_state": mfi_divergence_state,
        "freq_gini_divergence_state": freq_gini_divergence_state,
        "divergence_summary": divergence_summary,
    }


def _net_accumulation_metrics(primary_days: list[dict[str, Any]]) -> dict[str, float]:
    positive_net_value = 0.0
    positive_net_volume = 0.0
    for day in primary_days:
        net_flow_value = float(day["net_flow_visible_value"])
        day_vwap = float(day["market_vwap"])
        if net_flow_value <= 0 or day_vwap <= 0:
            continue
        positive_net_value += net_flow_value
        positive_net_volume += net_flow_value / day_vwap

    net_accumulation_price = _safe_ratio(positive_net_value, positive_net_volume)
    if net_accumulation_price <= 0 or not primary_days:
        return {}

    current_price = float(primary_days[-1]["close"])
    return {
        "net_accumulation_price": round(net_accumulation_price, 6),
        "net_accumulation_vs_current_pct": round(
            _safe_ratio(current_price, net_accumulation_price) - 1.0, 6
        ),
    }


def _trust_regime(
    *,
    liquidity_profile: str,
    market_cap_profile: str,
    avg_coverage: float,
    wash_risk_state: str,
    correlation_value: float,
    trust_window_days: int,
) -> tuple[str, str, list[str]]:
    score = 0
    rationale: list[str] = []

    if liquidity_profile == "high":
        score += 2
        rationale.append("high liquidity improves broker-flow reliability")
    elif liquidity_profile == "medium":
        score += 1
        rationale.append("medium liquidity keeps flow interpretation usable")
    elif liquidity_profile == "low":
        score -= 1
        rationale.append("low liquidity weakens flow reliability")
    else:
        score -= 2
        rationale.append("very low liquidity makes flow fragile")

    if market_cap_profile == "large":
        score += 2
        rationale.append("large-cap profile reduces single-actor distortion risk")
    elif market_cap_profile == "mid":
        score += 1
        rationale.append("mid-cap profile is acceptable for broker-flow reads")
    elif market_cap_profile == "small":
        score -= 1
        rationale.append("small-cap profile increases distortion risk")
    else:
        score -= 2
        rationale.append("micro-cap profile is structurally lower trust")

    coverage_state = _coverage_state(avg_coverage)
    if coverage_state == "good":
        score += 2
        rationale.append("top-25 coverage is strong enough to trust visible flow")
    elif coverage_state == "moderate":
        score += 1
        rationale.append("coverage is usable but incomplete")
    elif coverage_state == "low":
        rationale.append("coverage is partial and needs caution")
    else:
        score -= 2
        rationale.append("coverage is too low for strong flow confidence")

    corr_abs = abs(correlation_value)
    if corr_abs >= 0.60:
        score += 2
        rationale.append("60D flow-price relationship is strong")
    elif corr_abs >= 0.35:
        score += 1
        rationale.append("60D flow-price relationship is moderate")
    elif corr_abs < 0.15:
        score -= 1
        rationale.append("60D flow-price relationship is weak")

    if wash_risk_state == "high":
        score -= 2
        rationale.append("high overlap-driven anomaly risk discounts the read")
    elif wash_risk_state == "moderate":
        rationale.append("moderate anomaly risk keeps the read cautious")
    else:
        score += 1
        rationale.append("wash-risk proxy is controlled")

    if trust_window_days < TRUST_WINDOW_DAYS:
        score -= 1
        rationale.append("trust window is shorter than 60 sessions, so trust is downgraded")

    if score >= 5:
        trust_level = "high"
    elif score >= 2:
        trust_level = "medium"
    else:
        trust_level = "low"

    if trust_level == "high" and corr_abs >= 0.50 and liquidity_profile in {"high", "medium"} and market_cap_profile in {"large", "mid"}:
        usefulness = "lead_capable"
    elif trust_level in {"high", "medium"} and corr_abs >= 0.25:
        usefulness = "support_only"
    elif trust_level == "low" and liquidity_profile != "very_low" and market_cap_profile != "micro":
        usefulness = "secondary"
    else:
        usefulness = "unreliable"

    return trust_level, usefulness, rationale


def _verdict_weight_profile(
    *,
    liquidity_profile: str,
    market_cap_profile: str,
    volatility_profile: str,
    persistence_score: float,
    gvpr_buy_pct: float,
    gvpr_sell_pct: float,
    buy_hhi: float,
    sell_hhi: float,
) -> tuple[str, dict[str, float]]:
    institutional_driven = (
        abs(persistence_score) >= 25
        and max(gvpr_buy_pct, gvpr_sell_pct) >= 0.55
        and max(buy_hhi, sell_hhi) >= 1500
    )

    if volatility_profile == "high_volatility":
        return "high_volatility", {
            "cadi": 0.15,
            "mfi": 0.18,
            "persistence": 0.18,
            "execution": 0.08,
            "gvpr": 0.08,
            "concentration": 0.12,
            "frequency": 0.11,
            "correlation": 0.10,
        }
    if institutional_driven:
        return "institutional_driven", {
            "cadi": 0.18,
            "mfi": 0.08,
            "persistence": 0.25,
            "execution": 0.10,
            "gvpr": 0.10,
            "concentration": 0.10,
            "frequency": 0.11,
            "correlation": 0.08,
        }
    if market_cap_profile == "large" and liquidity_profile == "high":
        return "blue_chip_high_liquidity", {
            "cadi": 0.18,
            "mfi": 0.11,
            "persistence": 0.20,
            "execution": 0.09,
            "gvpr": 0.09,
            "concentration": 0.10,
            "frequency": 0.14,
            "correlation": 0.08,
        }
    if liquidity_profile in {"low", "very_low"} or market_cap_profile in {"small", "micro"}:
        return "low_liquidity_small_cap", {
            "cadi": 0.14,
            "mfi": 0.10,
            "persistence": 0.16,
            "execution": 0.09,
            "gvpr": 0.15,
            "concentration": 0.16,
            "frequency": 0.14,
            "correlation": 0.06,
        }
    return "mid_cap_moderate", {
        "cadi": 0.17,
        "mfi": 0.10,
        "persistence": 0.20,
        "execution": 0.09,
        "gvpr": 0.10,
        "concentration": 0.12,
        "frequency": 0.14,
        "correlation": 0.08,
    }


def _baseline_verdict(
    *,
    cadi_value: float,
    persistence_score: float,
    mfi_value: float,
    buy_vwap_dev: float,
    gvpr_bias: float,
    concentration_bias: float,
    frequency_score: float,
    correlation_value: float,
    divergence_state: str,
    trust_level: str,
    cadi_trend: str,
    avg_coverage: float,
    wash_risk_state: str,
    correlation_state: str,
    weight_profile: dict[str, float],
) -> tuple[str, float, str, list[str], list[str]]:
    divergence_bias = (
        0.08
        if divergence_state == "bullish_divergence"
        else -0.08
        if divergence_state == "bearish_divergence"
        else 0.0
    )
    trust_bias = 0.0
    cadi_component = _clip(cadi_value, -1.0, 1.0)
    persistence_component = _clip(persistence_score / 100.0, -1.0, 1.0)
    mfi_component = _clip((50.0 - mfi_value) / 50.0, -1.0, 1.0)
    execution_component = _clip(buy_vwap_dev / 0.01, -1.0, 1.0)
    gvpr_component = _clip(gvpr_bias * 8.0, -1.0, 1.0)
    concentration_component = _clip(concentration_bias, -1.0, 1.0)
    frequency_component = _clip(frequency_score, -1.0, 1.0)
    score = (
        cadi_component * weight_profile["cadi"]
        + mfi_component * weight_profile["mfi"]
        + persistence_component * weight_profile["persistence"]
        + execution_component * weight_profile["execution"]
        + gvpr_component * weight_profile["gvpr"]
        + concentration_component * weight_profile["concentration"]
        + frequency_component * weight_profile["frequency"]
        + divergence_bias
        + trust_bias
    )
    score = _clip(score, -1.0, 1.0)

    if score >= 0.06:
        verdict = "ACCUMULATION"
    elif score <= -0.06:
        verdict = "DISTRIBUTION"
    else:
        verdict = "NEUTRAL"

    conviction_pct = round(min(50.0 + abs(score) * 50.0, 100.0), 2)

    if abs(persistence_score) >= 35 and abs(concentration_bias) >= 0.20 and trust_level != "low":
        sponsor_quality = "strong"
    elif verdict != "NEUTRAL" and trust_level != "low":
        sponsor_quality = "constructive"
    elif verdict == "NEUTRAL":
        sponsor_quality = "mixed"
    else:
        sponsor_quality = "weak"

    support_factors: list[str] = []
    caution_factors: list[str] = []

    if cadi_trend == "rising":
        support_factors.append("CADI is rising over the 30-session primary window")
    elif cadi_trend == "falling":
        caution_factors.append("CADI is falling over the 30-session primary window")

    if mfi_value < 40:
        support_factors.append("MFI is below 40, which supports a bullish exhaustion read")
    elif mfi_value > 60:
        caution_factors.append("MFI is above 60, which adds bearish pressure")

    if persistence_score >= 12:
        support_factors.append("buy-side persistence is stronger than sell-side persistence")
    elif persistence_score <= -12:
        caution_factors.append("sell-side persistence is stronger than buy-side persistence")

    if buy_vwap_dev > 0.0025:
        support_factors.append("buyers are paying above session VWAP")
    elif buy_vwap_dev < -0.0025:
        caution_factors.append("buyers are still executing below selected-period VWAP")

    if gvpr_bias >= 0.03:
        support_factors.append("buy-side participation concentration is stronger than sell-side")
    elif gvpr_bias <= -0.03:
        caution_factors.append("sell-side participation concentration is stronger than buy-side")

    if concentration_bias >= 0.20:
        support_factors.append("buy-side concentration asymmetry favors accumulation")
    elif concentration_bias <= -0.20:
        caution_factors.append("sell-side concentration asymmetry favors distribution")

    if frequency_score >= 0.18:
        support_factors.append("buy-side ticket size profile looks more institutional")
    elif frequency_score <= -0.18:
        caution_factors.append("sell-side ticket size profile looks more institutional")

    if avg_coverage < LOW_COVERAGE_THRESHOLD:
        caution_factors.append("top-25 broker coverage is partial")
    if wash_risk_state != "low":
        caution_factors.append("overlap-based anomaly risk is elevated")
    if correlation_state in {"weak", "minimal"}:
        caution_factors.append("flow-price trust is weak on the 60-session window")
    if divergence_state == "bullish_divergence":
        support_factors.append("flow is improving ahead of price")
    elif divergence_state == "bearish_divergence":
        caution_factors.append("flow is deteriorating while price still holds up")
    elif divergence_state == "mixed":
        caution_factors.append("divergence signals are mixed across CADI, MFI, and frequency-Gini")

    return verdict, conviction_pct, sponsor_quality, support_factors[:4], caution_factors[:4]


def _integration_hook(
    verdict: str, trust_level: str, divergence_state: str, primary_days: list[dict[str, Any]]
) -> tuple[dict[str, Any], float]:
    price_values = [float(day["close"]) for day in primary_days]
    avg_price = sum(price_values) / len(price_values) if price_values else 0.0
    price_slope = _series_slope(price_values)
    normalized_price_slope = _safe_ratio(price_slope, avg_price)

    if verdict == "ACCUMULATION" and normalized_price_slope >= 0.001:
        timing_relation = "confirm"
        alignment = "aligned_bullish"
        signal_role = "confirmation"
        summary = ["flow and price are aligned on the bullish side"]
    elif verdict == "ACCUMULATION":
        timing_relation = "lead"
        alignment = "flow_bullish_price_weaker"
        signal_role = "early_turn" if trust_level != "low" else "noise"
        summary = ["flow is constructive before price has fully confirmed"]
    elif verdict == "DISTRIBUTION" and normalized_price_slope <= -0.001:
        timing_relation = "confirm"
        alignment = "aligned_bearish"
        signal_role = "confirmation"
        summary = ["flow and price are aligned on the bearish side"]
    elif verdict == "DISTRIBUTION":
        timing_relation = "warning"
        alignment = "flow_bearish_price_stronger"
        signal_role = "early_warning"
        summary = ["flow is deteriorating while price is still stronger than the flow read"]
    else:
        timing_relation = "unclear"
        alignment = "mixed"
        signal_role = "noise"
        summary = ["flow direction is not decisive enough to anchor a timing read"]

    if divergence_state == "bullish_divergence":
        summary.append("bullish divergence keeps the read in early-turn territory")
    elif divergence_state == "bearish_divergence":
        summary.append("bearish divergence keeps the read in warning territory")
    elif divergence_state == "mixed":
        summary.append("divergence signals are mixed across broker-flow, MFI, and frequency-Gini")

    return {
        "timing_relation": timing_relation,
        "price_structure_alignment": alignment,
        "signal_role": signal_role,
        "integration_summary": summary[:3],
    }, normalized_price_slope


def _update_context(
    *,
    verdict: str,
    divergence_state: str,
    cadi_trend: str,
    status_drift: str,
    persistence_state: str,
) -> dict[str, str]:
    if verdict == "NEUTRAL":
        flow_status = "invalidated"
    elif status_drift == "improving":
        flow_status = "improving"
    elif status_drift == "degrading":
        flow_status = "degrading"
    else:
        flow_status = "intact"

    if divergence_state in {"bullish_divergence", "bearish_divergence"}:
        review_reason = "contradiction"
    elif divergence_state == "mixed":
        review_reason = "contradiction"
    elif (
        verdict == "ACCUMULATION" and persistence_state in {"sell_persistence", "strong_sell_persistence"}
    ) or (
        verdict == "DISTRIBUTION" and persistence_state in {"buy_persistence", "strong_buy_persistence"}
    ):
        review_reason = "sponsor_shift"
    elif cadi_trend == "flat" and status_drift in {"degrading", "stalling"}:
        review_reason = "regime_change"
    else:
        review_reason = "routine"

    return {
        "flow_status": flow_status,
        "review_reason": review_reason,
    }


def _monitoring(
    verdict: str,
    cadi_trend: str,
    persistence_state: str,
    wash_risk_state: str,
    avg_coverage: float,
    recent_net_ratio: float,
    normalized_price_slope: float,
) -> dict[str, Any]:
    confirm_if: list[str] = []
    weaken_if: list[str] = []
    invalidate_if: list[str] = []

    if verdict == "ACCUMULATION":
        confirm_if = [
            "CADI keeps rising over the next 3 sessions",
            "buy-side persistence remains stronger than sell-side persistence",
            "buyers continue to execute at or above session VWAP",
        ]
        weaken_if = [
            "recent visible net flow turns flat or negative",
            "coverage falls below the usable range",
            "wash-risk proxy rises materially",
        ]
        invalidate_if = [
            "30-session CADI trend flips negative",
            "sell-side persistence overtakes buy-side persistence",
            "distribution verdict replaces accumulation on the next review",
        ]
    elif verdict == "DISTRIBUTION":
        confirm_if = [
            "CADI keeps falling over the next 3 sessions",
            "sell-side persistence remains stronger than buy-side persistence",
            "sellers continue to execute below session VWAP",
        ]
        weaken_if = [
            "recent visible net flow turns flat or positive",
            "coverage falls below the usable range",
            "wash-risk proxy rises materially",
        ]
        invalidate_if = [
            "30-session CADI trend flips positive",
            "buy-side persistence overtakes sell-side persistence",
            "accumulation verdict replaces distribution on the next review",
        ]
    else:
        confirm_if = [
            "one side establishes cleaner persistence over the next 3 to 5 sessions",
            "CADI slope becomes directional instead of flat",
        ]
        weaken_if = [
            "coverage deteriorates further",
            "anomaly risk rises while direction stays mixed",
        ]
        invalidate_if = [
            "direction stays mixed while trust drops to unreliable",
        ]

    if wash_risk_state == "high" or avg_coverage < LOW_COVERAGE_THRESHOLD:
        next_review = "next_session"
    elif (
        verdict == "NEUTRAL"
        and cadi_trend == "flat"
        and abs(recent_net_ratio) < 0.0005
        and abs(normalized_price_slope) < 0.001
    ):
        next_review = "10_sessions"
    elif verdict == "NEUTRAL" or abs(normalized_price_slope) < 0.001:
        next_review = "3_sessions"
    else:
        next_review = "5_sessions"

    if verdict == "ACCUMULATION" and recent_net_ratio > 0 and cadi_trend == "rising":
        status_drift = "improving" if persistence_state in {"buy_persistence", "strong_buy_persistence"} else "stable"
    elif verdict == "DISTRIBUTION" and recent_net_ratio < 0 and cadi_trend == "falling":
        status_drift = "degrading" if persistence_state in {"sell_persistence", "strong_sell_persistence"} else "stable"
    elif abs(recent_net_ratio) < 0.001:
        status_drift = "stalling"
    else:
        status_drift = "stable"

    return {
        "confirm_if": confirm_if,
        "weaken_if": weaken_if,
        "invalidate_if": invalidate_if,
        "next_review_window": next_review,
        "status_drift": status_drift,
    }


def _history_block(days: list[dict[str, Any]]) -> dict[str, Any]:
    cadi_running = 0.0
    dates: list[str] = []
    price_close_series: list[float] = []
    cadi_series: list[float] = []
    net_flow_ratio_series: list[float] = []
    gvpr_buy_series: list[float] = []
    gvpr_sell_series: list[float] = []
    buy_hhi_series: list[float] = []
    sell_hhi_series: list[float] = []
    wash_risk_series: list[float] = []

    for day in days:
        cadi_running += float(day["cadi_increment"])
        dates.append(str(day["date"]))
        price_close_series.append(round(float(day["close"]), 6))
        cadi_series.append(round(cadi_running, 6))
        net_flow_ratio_series.append(
            round(
                _safe_ratio(float(day["net_flow_visible_value"]), float(day["market_value"])),
                6,
            )
        )
        gvpr_buy_series.append(round(float(day["gvpr_buy_pct"]), 6))
        gvpr_sell_series.append(round(float(day["gvpr_sell_pct"]), 6))
        buy_hhi_series.append(round(float(day["buy_hhi"]), 2))
        sell_hhi_series.append(round(float(day["sell_hhi"]), 2))
        wash_risk_series.append(round(float(day["wash_risk_pct"]), 2))

    return {
        "dates": dates,
        "price_close_series": price_close_series,
        "cadi_series": cadi_series,
        "net_flow_ratio_series": net_flow_ratio_series,
        "gvpr_buy_series": gvpr_buy_series,
        "gvpr_sell_series": gvpr_sell_series,
        "buy_hhi_series": buy_hhi_series,
        "sell_hhi_series": sell_hhi_series,
        "wash_risk_series": wash_risk_series,
    }


def build_flow_context_result(
    *,
    symbol: str,
    broker_flow: dict[str, Any],
    daily_ohlcv: pd.DataFrame,
    benchmark_daily_ohlcv: pd.DataFrame | None,
    purpose_mode: str,
) -> dict[str, Any]:
    payload_symbol = str(broker_flow.get("symbol", "")).strip().upper()
    if payload_symbol and payload_symbol != symbol:
        raise ValueError(
            f"symbol mismatch: builder symbol {symbol} but broker-flow payload is {payload_symbol}"
        )

    series_raw = broker_flow.get("series", [])
    if len(series_raw) < MIN_REQUIRED_FLOW_DAYS:
        raise ValueError(
            f"broker-flow payload needs at least {MIN_REQUIRED_FLOW_DAYS} sessions; got {len(series_raw)}"
        )

    daily_by_date = daily_ohlcv.set_index("date", drop=False)
    days: list[dict[str, Any]] = []
    for item in series_raw:
        if not isinstance(item, dict):
            continue
        date = str(item.get("date", "")).strip()
        if not date:
            continue
        if date not in daily_by_date.index:
            raise ValueError(f"missing OHLCV daily row for broker-flow date {date}")
        buy_rows = _normalize_rows(item.get("buy_rows"))
        sell_rows = _normalize_rows(item.get("sell_rows"))
        market_row = daily_by_date.loc[date]
        if isinstance(market_row, pd.DataFrame):
            market_row = market_row.iloc[-1]
        days.append(_daily_metrics(date, buy_rows, sell_rows, market_row))

    if len(days) < MIN_REQUIRED_FLOW_DAYS:
        raise ValueError("no valid broker-flow days survived normalization")

    trust_days = days[-min(TRUST_WINDOW_DAYS, len(days)) :]
    primary_days = trust_days[-min(PRIMARY_WINDOW_DAYS, len(trust_days)) :]
    recent_days = primary_days[-min(RECENT_WINDOW_DAYS, len(primary_days)) :]
    as_of_date = str(
        (broker_flow.get("window") or {}).get("as_of_date") or primary_days[-1]["date"]
    )

    cadi_running = 0.0
    cadi_series: list[float] = []
    for day in trust_days:
        cadi_running += float(day["cadi_increment"])
        cadi_series.append(cadi_running)
    primary_cadi_series = cadi_series[-len(primary_days) :]

    cadi_slope = _series_slope(primary_cadi_series)
    cadi_trend, cadi_slope_strength = _trend_strength_from_slope(
        cadi_slope, primary_cadi_series
    )
    mfi_value = _money_flow_index(primary_days)
    mfi_state = _mfi_state(mfi_value)

    avg_coverage_buy = float(pd.Series([day["coverage_buy"] for day in primary_days]).mean())
    avg_coverage_sell = float(pd.Series([day["coverage_sell"] for day in primary_days]).mean())
    avg_coverage = min(avg_coverage_buy, avg_coverage_sell)
    avg_wash_risk = float(pd.Series([day["wash_risk_pct"] for day in primary_days]).mean())

    net_flow_total_value = float(sum(day["net_flow_visible_value"] for day in primary_days))
    total_market_value_primary = float(sum(day["market_value"] for day in primary_days))
    recent_net_value = float(sum(day["net_flow_visible_value"] for day in recent_days))
    total_market_value_recent = float(sum(day["market_value"] for day in recent_days))
    recent_net_ratio = _safe_ratio(recent_net_value, total_market_value_recent)

    primary_buy_rows = _aggregate_rows([day["buy_rows"] for day in primary_days])
    primary_sell_rows = _aggregate_rows([day["sell_rows"] for day in primary_days])
    primary_window_vwap = _window_vwap(primary_days)
    primary_buy_avg_px = _weighted_average_price(primary_buy_rows)
    primary_sell_avg_px = _weighted_average_price(primary_sell_rows)
    avg_buy_dev = (
        _safe_ratio(primary_buy_avg_px, primary_window_vwap) - 1.0
        if primary_buy_avg_px > 0 and primary_window_vwap > 0
        else 0.0
    )
    avg_sell_dev = (
        _safe_ratio(primary_sell_avg_px, primary_window_vwap) - 1.0
        if primary_sell_avg_px > 0 and primary_window_vwap > 0
        else 0.0
    )
    avg_bs_spread = avg_buy_dev - avg_sell_dev

    primary_buy_values = sorted(
        (_to_float(row.get("value")) for row in primary_buy_rows), reverse=True
    )
    primary_sell_values = sorted(
        (_to_float(row.get("value")) for row in primary_sell_rows), reverse=True
    )
    avg_gvpr_buy = _safe_ratio(
        sum(primary_buy_values[:GVPR_TOP_BROKERS]), total_market_value_primary
    )
    avg_gvpr_sell = _safe_ratio(
        sum(primary_sell_values[:GVPR_TOP_BROKERS]), total_market_value_primary
    )
    avg_buy_hhi = _hhi_from_rows(primary_buy_rows)
    avg_sell_hhi = _hhi_from_rows(primary_sell_rows)
    avg_buy_gini = float(pd.Series([day["buy_gini"] for day in primary_days]).mean())
    avg_sell_gini = float(pd.Series([day["sell_gini"] for day in primary_days]).mean())
    avg_gini_asymmetry = avg_buy_gini - avg_sell_gini
    avg_top_buyer_share = _safe_ratio(
        primary_buy_values[0] if primary_buy_values else 0.0, total_market_value_primary
    )
    avg_top_seller_share = _safe_ratio(
        primary_sell_values[0] if primary_sell_values else 0.0, total_market_value_primary
    )
    frequency_score, frequency_profile = _frequency_profile(primary_buy_rows, primary_sell_rows)

    persistence_score, persistence_state = _persistence(primary_days)
    concentration_state = _gini_asymmetry_state(
        avg_gini_asymmetry,
        avg_buy_hhi,
        avg_sell_hhi,
        avg_gvpr_buy,
        avg_gvpr_sell,
    )
    divergence_states = _divergence_states(primary_days)
    divergence_summary = divergence_states["divergence_summary"]
    net_accumulation_metrics = _net_accumulation_metrics(primary_days)

    closes_trust = [float(day["close"]) for day in trust_days]
    flow_price_correlation = _spearman_corr(cadi_series, closes_trust)
    correlation_state = _correlation_state(flow_price_correlation)

    avg_daily_value_for_trust = float(pd.Series([day["market_value"] for day in trust_days]).mean())
    liquidity_profile = _liquidity_profile(avg_daily_value_for_trust)
    latest_market_cap = float(primary_days[-1]["market_cap_close"])
    market_cap_profile = _market_cap_profile(latest_market_cap)
    volatility_metrics = _atr_volatility_metrics(trust_days)
    beta_metrics = (
        _beta_metrics(
            daily_ohlcv,
            benchmark_daily_ohlcv,
            as_of_date=as_of_date,
        )
        if benchmark_daily_ohlcv is not None
        else {}
    )

    if avg_wash_risk >= 12:
        wash_risk_state = "high"
    elif avg_wash_risk >= 4:
        wash_risk_state = "moderate"
    else:
        wash_risk_state = "low"

    anomaly_risk_state = (
        "elevated"
        if wash_risk_state == "high" or avg_coverage < VERY_LOW_COVERAGE_THRESHOLD
        else "watch"
        if wash_risk_state == "moderate" or avg_coverage < LOW_COVERAGE_THRESHOLD
        else "clean"
    )

    trust_level, ticker_flow_usefulness, trust_rationale = _trust_regime(
        liquidity_profile=liquidity_profile,
        market_cap_profile=market_cap_profile,
        avg_coverage=avg_coverage,
        wash_risk_state=wash_risk_state,
        correlation_value=flow_price_correlation,
        trust_window_days=len(trust_days),
    )

    weight_profile_name, weight_profile = _verdict_weight_profile(
        liquidity_profile=liquidity_profile,
        market_cap_profile=market_cap_profile,
        volatility_profile=str(volatility_metrics["volatility_profile"]),
        persistence_score=persistence_score,
        gvpr_buy_pct=avg_gvpr_buy,
        gvpr_sell_pct=avg_gvpr_sell,
        buy_hhi=avg_buy_hhi,
        sell_hhi=avg_sell_hhi,
    )
    concentration_bias = _clip(
        (_safe_ratio(avg_gini_asymmetry, GINI_STRONG_THRESHOLD) * 0.75)
        + (((avg_buy_hhi - avg_sell_hhi) / 2000.0) * 0.25),
        -1.0,
        1.0,
    )
    verdict, conviction_pct, sponsor_quality, support_factors, caution_factors = (
        _baseline_verdict(
            cadi_value=float(primary_cadi_series[-1]) if primary_cadi_series else 0.0,
            persistence_score=persistence_score,
            mfi_value=mfi_value,
            buy_vwap_dev=avg_buy_dev,
            gvpr_bias=avg_gvpr_buy - avg_gvpr_sell,
            concentration_bias=concentration_bias,
            frequency_score=frequency_score,
            correlation_value=flow_price_correlation,
            divergence_state=divergence_summary,
            trust_level=trust_level,
            cadi_trend=cadi_trend,
            avg_coverage=avg_coverage,
            wash_risk_state=wash_risk_state,
            correlation_state=correlation_state,
            weight_profile=weight_profile,
        )
    )

    integration_hook, normalized_price_slope = _integration_hook(
        verdict, trust_level, divergence_summary, primary_days
    )
    monitoring = _monitoring(
        verdict=verdict,
        cadi_trend=cadi_trend,
        persistence_state=persistence_state,
        wash_risk_state=wash_risk_state,
        avg_coverage=avg_coverage,
        recent_net_ratio=recent_net_ratio,
        normalized_price_slope=normalized_price_slope,
    )

    requested_trading_days = int(
        _to_float((broker_flow.get("window") or {}).get("requested_trading_days"), PRIMARY_WINDOW_DAYS)
    )
    actual_trading_days = int(
        _to_float((broker_flow.get("window") or {}).get("actual_trading_days"), len(days))
    )

    return {
        "analysis": {
            "symbol": symbol,
            "as_of_date": as_of_date,
            "purpose_mode": purpose_mode,
            "window_mode": "multi_day",
            "trading_days": actual_trading_days,
        },
        "window": {
            "from": str((broker_flow.get("window") or {}).get("from") or primary_days[0]["date"]),
            "to": str((broker_flow.get("window") or {}).get("to") or primary_days[-1]["date"]),
            "requested_trading_days": requested_trading_days,
            "actual_trading_days": actual_trading_days,
            "primary_window_trading_days": PRIMARY_WINDOW_DAYS,
            "trust_window_trading_days": TRUST_WINDOW_DAYS,
            "today_snapshot_included": bool(broker_flow.get("today_snapshot_included", False)),
            "today_snapshot_ready_after_wib": "19:00",
        },
        "history": {
            "active_30d": _history_block(primary_days),
            "trust_60d": {
                "dates": [str(day["date"]) for day in trust_days],
                "price_close_series": [round(float(day["close"]), 6) for day in trust_days],
                "cadi_series": [round(value, 6) for value in cadi_series],
            },
        },
        "core_metrics": {
            "gross_read_note": "gross_primary_net_secondary",
            "coverage_buy_pct": round(avg_coverage_buy, 6),
            "coverage_sell_pct": round(avg_coverage_sell, 6),
            "net_flow_total_value": round(net_flow_total_value, 2),
            "net_flow_recent_value": round(recent_net_value, 2),
            "cadi_value": round(float(primary_cadi_series[-1]) if primary_cadi_series else 0.0, 6),
            "cadi_trend": cadi_trend,
            "cadi_slope_strength": cadi_slope_strength,
            "buy_avg_vs_vwap_pct": round(avg_buy_dev, 6),
            "sell_avg_vs_vwap_pct": round(avg_sell_dev, 6),
            "buy_execution_quality": _execution_quality("buy", avg_buy_dev),
            "sell_execution_quality": _execution_quality("sell", avg_sell_dev),
            "bs_spread_pct": round(avg_bs_spread, 6),
            "bs_spread_trend": (
                "widening_buy_pressure"
                if avg_bs_spread >= 0.003
                else "widening_sell_pressure"
                if avg_bs_spread <= -0.003
                else "mixed"
                if max(abs(avg_buy_dev), abs(avg_sell_dev)) >= 0.003
                else "stable"
            ),
            "gvpr_buy_pct": round(avg_gvpr_buy, 6),
            "gvpr_sell_pct": round(avg_gvpr_sell, 6),
            "gvpr_pattern": (
                "buy_dominant"
                if avg_gvpr_buy - avg_gvpr_sell >= 0.03
                else "sell_dominant"
                if avg_gvpr_sell - avg_gvpr_buy >= 0.03
                else "mixed"
                if avg_gvpr_buy >= 0.4 and avg_gvpr_sell >= 0.4
                else "balanced"
            ),
            "top_buyer_share_pct": round(avg_top_buyer_share, 6),
            "top_seller_share_pct": round(avg_top_seller_share, 6),
            **net_accumulation_metrics,
        },
        "advanced_signals": {
            "persistence_score": round(persistence_score, 2),
            "persistence_state": persistence_state,
            "buy_hhi": round(avg_buy_hhi, 2),
            "sell_hhi": round(avg_sell_hhi, 2),
            "buy_gini": round(avg_buy_gini, 6),
            "sell_gini": round(avg_sell_gini, 6),
            "gini_asymmetry": round(avg_gini_asymmetry, 6),
            "gini_asymmetry_state": concentration_state,
            "mfi_value": round(mfi_value, 2),
            "mfi_state": mfi_state,
            "frequency_score": round(frequency_score, 6),
            "frequency_profile": frequency_profile,
            "flow_price_correlation_spearman": round(flow_price_correlation, 6),
            "flow_price_correlation_state": correlation_state,
            **divergence_states,
            "divergence_state": divergence_summary,
            "wash_risk_pct": round(avg_wash_risk, 2),
            "wash_risk_state": wash_risk_state,
            "anomaly_risk_state": anomaly_risk_state,
        },
        "trust_regime": {
            "liquidity_profile": liquidity_profile,
            "market_cap_profile": market_cap_profile,
            "market_cap_value": round(latest_market_cap, 2),
            "atr_pct": volatility_metrics["atr_pct"],
            "volatility_profile": volatility_metrics["volatility_profile"],
            **beta_metrics,
            "ticker_flow_usefulness": ticker_flow_usefulness,
            "trust_level": trust_level,
            "verdict_weight_profile": weight_profile_name,
            "trust_rationale": trust_rationale[:5],
        },
        "baseline_verdict": {
            "verdict": verdict,
            "conviction_pct": conviction_pct,
            "sponsor_quality": sponsor_quality,
            "strongest_support_factors": support_factors,
            "strongest_caution_factors": caution_factors,
        },
        "integration_hook": integration_hook,
        "monitoring": monitoring,
        **(
            {"update_context": _update_context(
                verdict=verdict,
                divergence_state=divergence_summary,
                cadi_trend=cadi_trend,
                status_drift=str(monitoring["status_drift"]),
                persistence_state=persistence_state,
            )}
            if purpose_mode == "UPDATE"
            else {}
        ),
    }


def main() -> None:
    args = parse_args()
    symbol = args.symbol.strip().upper()
    if not symbol or not symbol.isalpha() or len(symbol) != 4:
        raise ValueError("symbol must be a 4-letter IDX ticker")

    broker_flow_path = Path(args.broker_flow).expanduser().resolve()
    ohlcv_path = Path(args.ohlcv).expanduser().resolve()
    benchmark_ohlcv_path = (
        Path(args.benchmark_ohlcv).expanduser().resolve()
        if args.benchmark_ohlcv
        else None
    )
    outdir = Path(args.outdir).expanduser().resolve()
    output_path = (
        Path(args.output).expanduser().resolve()
        if args.output
        else outdir / f"{symbol}_flow_context.json"
    )

    broker_flow = load_broker_flow(broker_flow_path)
    daily_ohlcv = load_daily_ohlcv(ohlcv_path)
    benchmark_daily_ohlcv = (
        load_daily_ohlcv(benchmark_ohlcv_path)
        if benchmark_ohlcv_path is not None
        else None
    )
    result = build_flow_context_result(
        symbol=symbol,
        broker_flow=broker_flow,
        daily_ohlcv=daily_ohlcv,
        benchmark_daily_ohlcv=benchmark_daily_ohlcv,
        purpose_mode=args.purpose_mode,
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
        f.write("\n")

    print(str(output_path))


if __name__ == "__main__":
    main()
