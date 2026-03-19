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
RECENT_WINDOW_DAYS = 5
DIVERGENCE_WINDOW_DAYS = 10
CADI_TOP_BROKERS = 10
GVPR_TOP_BROKERS = 5
MIN_REQUIRED_FLOW_DAYS = 10

LOW_COVERAGE_THRESHOLD = 0.45
VERY_LOW_COVERAGE_THRESHOLD = 0.30


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
        help="Input JSON path from fetch-ohlcv.",
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
    if avg_daily_value > 50_000_000_000:
        return "high"
    if avg_daily_value >= 10_000_000_000:
        return "medium"
    if avg_daily_value >= 1_000_000_000:
        return "low"
    return "very_low"


def _market_cap_profile(market_cap_value: float) -> str:
    if market_cap_value > 10_000_000_000_000:
        return "large"
    if market_cap_value >= 1_000_000_000_000:
        return "mid"
    if market_cap_value >= 100_000_000_000:
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

    buy_coverage = _safe_ratio(
        sum(_to_float(row.get("value")) for row in buy_rows), market_value
    )
    sell_coverage = _safe_ratio(
        sum(_to_float(row.get("value")) for row in sell_rows), market_value
    )

    buy_avg_px = _weighted_average_price(buy_rows)
    sell_avg_px = _weighted_average_price(sell_rows)
    buy_dev = _safe_ratio(buy_avg_px, vwap_day) - 1.0 if buy_avg_px > 0 else 0.0
    sell_dev = _safe_ratio(sell_avg_px, vwap_day) - 1.0 if sell_avg_px > 0 else 0.0

    buy_top_values = sorted((_to_float(row.get("value")) for row in buy_rows), reverse=True)
    sell_top_values = sorted((_to_float(row.get("value")) for row in sell_rows), reverse=True)

    return {
        "date": date,
        "close": close,
        "market_value": market_value,
        "market_cap_close": market_cap_close,
        "coverage_buy": buy_coverage,
        "coverage_sell": sell_coverage,
        "buy_avg_vs_vwap_pct": buy_dev,
        "sell_avg_vs_vwap_pct": sell_dev,
        "bs_spread_pct": buy_dev - sell_dev,
        "top_buyer_share_pct": _safe_ratio(buy_top_values[0] if buy_top_values else 0.0, market_value),
        "top_seller_share_pct": _safe_ratio(sell_top_values[0] if sell_top_values else 0.0, market_value),
        "gvpr_buy_pct": _safe_ratio(sum(buy_top_values[:GVPR_TOP_BROKERS]), market_value),
        "gvpr_sell_pct": _safe_ratio(sum(sell_top_values[:GVPR_TOP_BROKERS]), market_value),
        "buy_hhi": _hhi_from_rows(buy_rows),
        "sell_hhi": _hhi_from_rows(sell_rows),
        "net_flow_visible_value": sum(sanitized_net_by_broker.values()),
        "cadi_increment": cadi_increment,
        "wash_risk_pct": _clip(wash_risk_raw * 100.0, 0.0, 100.0),
        "overlap_count": len(overlapping),
        "sanitized_net_by_broker": sanitized_net_by_broker,
        "visible_gross_by_broker": visible_gross_by_broker,
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


def _concentration_state(avg_buy_hhi: float, avg_sell_hhi: float, avg_gvpr_buy: float, avg_gvpr_sell: float) -> str:
    if avg_buy_hhi - avg_sell_hhi >= 250 and avg_gvpr_buy - avg_gvpr_sell >= 0.02:
        return "buy_heavy"
    if avg_sell_hhi - avg_buy_hhi >= 250 and avg_gvpr_sell - avg_gvpr_buy >= 0.02:
        return "sell_heavy"
    return "balanced"


def _divergence_state(primary_days: list[dict[str, Any]]) -> str:
    if len(primary_days) < 5:
        return "unclear"
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
        return "bullish_divergence"
    if normalized_price_slope >= 0.001 and cadi_slope <= -0.0025:
        return "bearish_divergence"
    return "none"


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


def _baseline_verdict(
    *,
    cadi_value: float,
    recent_net_ratio: float,
    persistence_score: float,
    execution_bias: float,
    concentration_bias: float,
    divergence_state: str,
    trust_level: str,
    cadi_trend: str,
    avg_coverage: float,
    wash_risk_state: str,
    correlation_state: str,
) -> tuple[str, float, str, list[str], list[str]]:
    divergence_bias = 0.15 if divergence_state == "bullish_divergence" else -0.15 if divergence_state == "bearish_divergence" else 0.0
    trust_bias = 0.10 if trust_level == "high" else 0.0
    score = (
        _clip(cadi_value, -1.0, 1.0) * 0.30
        + _clip(recent_net_ratio * 2.0, -1.0, 1.0) * 0.25
        + _clip(persistence_score / 100.0, -1.0, 1.0) * 0.20
        + _clip(execution_bias * 50.0, -1.0, 1.0) * 0.15
        + _clip(concentration_bias, -1.0, 1.0) * 0.10
        + divergence_bias
        + trust_bias
    )
    score = _clip(score, -1.0, 1.0)

    if score >= 0.12:
        verdict = "ACCUMULATION"
    elif score <= -0.12:
        verdict = "DISTRIBUTION"
    else:
        verdict = "NEUTRAL"

    conviction_pct = round(min(abs(score) * 100.0, 100.0), 2)

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

    if recent_net_ratio > 0:
        support_factors.append("recent visible net flow remains positive")
    elif recent_net_ratio < 0:
        caution_factors.append("recent visible net flow remains negative")

    if persistence_score >= 12:
        support_factors.append("buy-side persistence is stronger than sell-side persistence")
    elif persistence_score <= -12:
        caution_factors.append("sell-side persistence is stronger than buy-side persistence")

    if execution_bias > 0.0025:
        support_factors.append("buyers are paying above session VWAP")
    elif execution_bias < -0.0025:
        caution_factors.append("sellers are getting cleaner execution than buyers")

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

    return {
        "timing_relation": timing_relation,
        "price_structure_alignment": alignment,
        "signal_role": signal_role,
        "integration_summary": summary[:3],
    }, normalized_price_slope


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


def build_flow_context_result(
    *,
    symbol: str,
    broker_flow: dict[str, Any],
    daily_ohlcv: pd.DataFrame,
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

    avg_coverage_buy = float(pd.Series([day["coverage_buy"] for day in primary_days]).mean())
    avg_coverage_sell = float(pd.Series([day["coverage_sell"] for day in primary_days]).mean())
    avg_coverage = min(avg_coverage_buy, avg_coverage_sell)
    avg_buy_dev = float(pd.Series([day["buy_avg_vs_vwap_pct"] for day in primary_days]).mean())
    avg_sell_dev = float(pd.Series([day["sell_avg_vs_vwap_pct"] for day in primary_days]).mean())
    avg_bs_spread = float(pd.Series([day["bs_spread_pct"] for day in primary_days]).mean())
    avg_gvpr_buy = float(pd.Series([day["gvpr_buy_pct"] for day in primary_days]).mean())
    avg_gvpr_sell = float(pd.Series([day["gvpr_sell_pct"] for day in primary_days]).mean())
    avg_buy_hhi = float(pd.Series([day["buy_hhi"] for day in primary_days]).mean())
    avg_sell_hhi = float(pd.Series([day["sell_hhi"] for day in primary_days]).mean())
    avg_top_buyer_share = float(pd.Series([day["top_buyer_share_pct"] for day in recent_days]).mean())
    avg_top_seller_share = float(pd.Series([day["top_seller_share_pct"] for day in recent_days]).mean())
    avg_wash_risk = float(pd.Series([day["wash_risk_pct"] for day in primary_days]).mean())

    net_flow_total_value = float(sum(day["net_flow_visible_value"] for day in primary_days))
    total_market_value_primary = float(sum(day["market_value"] for day in primary_days))
    recent_net_value = float(sum(day["net_flow_visible_value"] for day in recent_days))
    total_market_value_recent = float(sum(day["market_value"] for day in recent_days))
    recent_net_ratio = _safe_ratio(recent_net_value, total_market_value_recent)

    persistence_score, persistence_state = _persistence(primary_days)
    concentration_state = _concentration_state(
        avg_buy_hhi, avg_sell_hhi, avg_gvpr_buy, avg_gvpr_sell
    )
    divergence_state = _divergence_state(primary_days)

    closes_trust = [float(day["close"]) for day in trust_days]
    flow_price_correlation = _spearman_corr(cadi_series, closes_trust)
    correlation_state = _correlation_state(flow_price_correlation)

    avg_daily_value_for_trust = float(pd.Series([day["market_value"] for day in trust_days]).mean())
    liquidity_profile = _liquidity_profile(avg_daily_value_for_trust)
    latest_market_cap = float(primary_days[-1]["market_cap_close"])
    market_cap_profile = _market_cap_profile(latest_market_cap)

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

    execution_bias = avg_buy_dev - avg_sell_dev
    concentration_bias = _clip(
        ((avg_gvpr_buy - avg_gvpr_sell) * 4.0) + ((avg_buy_hhi - avg_sell_hhi) / 2000.0),
        -1.0,
        1.0,
    )
    verdict, conviction_pct, sponsor_quality, support_factors, caution_factors = (
        _baseline_verdict(
            cadi_value=float(primary_cadi_series[-1]) if primary_cadi_series else 0.0,
            recent_net_ratio=recent_net_ratio,
            persistence_score=persistence_score,
            execution_bias=execution_bias,
            concentration_bias=concentration_bias,
            divergence_state=divergence_state,
            trust_level=trust_level,
            cadi_trend=cadi_trend,
            avg_coverage=avg_coverage,
            wash_risk_state=wash_risk_state,
            correlation_state=correlation_state,
        )
    )

    integration_hook, normalized_price_slope = _integration_hook(
        verdict, trust_level, divergence_state, primary_days
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
    as_of_date = str((broker_flow.get("window") or {}).get("as_of_date") or primary_days[-1]["date"])

    return {
        "analysis": {
            "symbol": symbol,
            "as_of_date": as_of_date,
            "purpose_mode": purpose_mode,
            "window_mode": "multi_day" if actual_trading_days > 1 else "single_day",
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
                else "stable"
            ),
            "gvpr_buy_pct": round(avg_gvpr_buy, 6),
            "gvpr_sell_pct": round(avg_gvpr_sell, 6),
            "gvpr_pattern": (
                "buy_dominant"
                if avg_gvpr_buy - avg_gvpr_sell >= 0.03
                else "sell_dominant"
                if avg_gvpr_sell - avg_gvpr_buy >= 0.03
                else "balanced"
            ),
            "top_buyer_share_pct": round(avg_top_buyer_share, 6),
            "top_seller_share_pct": round(avg_top_seller_share, 6),
        },
        "advanced_signals": {
            "persistence_score": round(persistence_score, 2),
            "persistence_state": persistence_state,
            "buy_hhi": round(avg_buy_hhi, 2),
            "sell_hhi": round(avg_sell_hhi, 2),
            "concentration_asymmetry_state": concentration_state,
            "flow_price_correlation_spearman": round(flow_price_correlation, 6),
            "flow_price_correlation_state": correlation_state,
            "divergence_state": divergence_state,
            "wash_risk_pct": round(avg_wash_risk, 2),
            "wash_risk_state": wash_risk_state,
            "anomaly_risk_state": anomaly_risk_state,
        },
        "trust_regime": {
            "liquidity_profile": liquidity_profile,
            "market_cap_profile": market_cap_profile,
            "market_cap_value": round(latest_market_cap, 2),
            "ticker_flow_usefulness": ticker_flow_usefulness,
            "trust_level": trust_level,
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
    }


def main() -> None:
    args = parse_args()
    symbol = args.symbol.strip().upper()
    if not symbol or not symbol.isalpha() or len(symbol) != 4:
        raise ValueError("symbol must be a 4-letter IDX ticker")

    broker_flow_path = Path(args.broker_flow).expanduser().resolve()
    ohlcv_path = Path(args.ohlcv).expanduser().resolve()
    outdir = Path(args.outdir).expanduser().resolve()
    output_path = (
        Path(args.output).expanduser().resolve()
        if args.output
        else outdir / f"{symbol}_flow_context.json"
    )

    broker_flow = load_broker_flow(broker_flow_path)
    daily_ohlcv = load_daily_ohlcv(ohlcv_path)
    result = build_flow_context_result(
        symbol=symbol,
        broker_flow=broker_flow,
        daily_ohlcv=daily_ohlcv,
        purpose_mode=args.purpose_mode,
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
        f.write("\n")

    print(str(output_path))


if __name__ == "__main__":
    main()
