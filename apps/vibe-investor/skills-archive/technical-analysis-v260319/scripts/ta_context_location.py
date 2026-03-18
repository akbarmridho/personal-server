from __future__ import annotations

from typing import Any

import pandas as pd

from ta_context_state import acceptance_vs_value, ma_posture


def ma_role(close_price: float, ma_value: float | None, tol: float = 0.03) -> str:
    if ma_value is None or pd.isna(ma_value):
        return "noise"
    if abs(close_price - float(ma_value)) / max(abs(close_price), 1e-9) > tol:
        return "noise"
    return "support" if close_price >= float(ma_value) else "resistance"


def ma_proximity_pct(close_price: float, ma_value: float | None) -> float | None:
    if ma_value is None or pd.isna(ma_value):
        return None
    return round(
        abs(close_price - float(ma_value)) / max(abs(close_price), 1e-9) * 100.0,
        3,
    )


def baseline_ma_payload(row: pd.Series) -> dict[str, Any]:
    close_price = float(row["close"])
    ema21 = float(row.get("EMA21", close_price))
    sma50 = float(row.get("SMA50", close_price))
    sma200 = float(row.get("SMA200", close_price))
    posture = ma_posture(row)
    posture["ema21_role"] = ma_role(close_price, ema21)
    posture["sma50_role"] = ma_role(close_price, sma50)
    posture["sma200_role"] = ma_role(close_price, sma200)
    posture["ema21_proximity_pct"] = ma_proximity_pct(close_price, ema21)
    posture["sma50_proximity_pct"] = ma_proximity_pct(close_price, sma50)
    posture["sma200_proximity_pct"] = ma_proximity_pct(close_price, sma200)
    return posture


def zone_strength(value: str) -> str:
    if value in {"strong_first_test", "strong"}:
        return "strong"
    if value == "weakening":
        return "moderate"
    return "weak"


def zone_payload(
    level: dict[str, Any],
    label: str,
    kind: str,
    source: str = "horizontal",
    timeframe: str = "1d",
) -> dict[str, Any]:
    return {
        "label": label,
        "kind": kind,
        "low": float(level["zone_low"]),
        "high": float(level["zone_high"]),
        "mid": float(level["zone_mid"]),
        "timeframe": timeframe,
        "strength": zone_strength(str(level.get("strength", ""))),
        "source": source,
    }


def split_support_resistance(
    levels: list[dict[str, Any]], last_close: float
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    supports = [
        zone_payload(zone, f"support_{i+1}", "support")
        for i, zone in enumerate(
            sorted(
                [level for level in levels if float(level["zone_mid"]) <= last_close],
                key=lambda item: float(item["zone_mid"]),
                reverse=True,
            )[:4]
        )
    ]
    resistances = [
        zone_payload(zone, f"resistance_{i+1}", "resistance")
        for i, zone in enumerate(
            sorted(
                [level for level in levels if float(level["zone_mid"]) > last_close],
                key=lambda item: float(item["zone_mid"]),
            )[:4]
        )
    ]
    return supports, resistances


def round_level_payload(round_levels: dict[str, float]) -> list[dict[str, Any]]:
    return [{"price": float(price), "label": label} for label, price in round_levels.items()]


def build_value_area(
    vp: dict[str, Any], close_price: float, prev_close: float | None
) -> dict[str, Any]:
    vah = float(vp["vah"]) if vp.get("vah") is not None else close_price
    val = float(vp["val"]) if vp.get("val") is not None else close_price
    return {
        "poc": float(vp["poc"]) if vp.get("poc") is not None else close_price,
        "vah": vah,
        "val": val,
        "acceptance_state": acceptance_vs_value(
            close_price,
            vah,
            val,
            prev_close=prev_close,
        ),
        "major_hvn": [float(x) for x in vp.get("hvn_top3", [])],
        "major_lvn": [float(x) for x in vp.get("lvn_top3", [])],
    }


def near_zone(close_price: float, zone: dict[str, Any], pct: float = 0.025) -> bool:
    low = float(zone.get("low", zone["mid"]))
    high = float(zone.get("high", zone["mid"]))
    buffer = max(close_price, 1e-9) * pct
    return (low - buffer) <= close_price <= (high + buffer)


def infer_location_state(
    close_price: float,
    trend_bias: str,
    regime: str,
    supports: list[dict[str, Any]],
    resistances: list[dict[str, Any]],
) -> str:
    nearest_support = supports[0] if supports else None
    nearest_resistance = resistances[0] if resistances else None
    if regime == "range_rotation":
        if nearest_support and near_zone(close_price, nearest_support):
            return "at_range_edge"
        if nearest_resistance and near_zone(close_price, nearest_resistance):
            return "at_range_edge"
    if trend_bias == "bullish" and nearest_support and near_zone(close_price, nearest_support):
        return "near_support_in_bullish_structure"
    if trend_bias == "bearish" and nearest_resistance and near_zone(close_price, nearest_resistance):
        return "near_resistance_in_bearish_structure"
    if nearest_resistance and close_price > float(nearest_resistance["high"]):
        return "accepted_above_resistance"
    if (
        nearest_support
        and trend_bias in {"bullish", "neutral"}
        and close_price > float(nearest_support["high"])
        and (close_price - float(nearest_support["high"])) / max(close_price, 1e-9) <= 0.04
    ):
        return "accepted_above_resistance"
    if nearest_support and close_price < float(nearest_support["low"]):
        return "accepted_below_support"
    return "mid_range_noise"


def is_meaningful_location(location_state: str) -> bool:
    return location_state in {
        "near_support_in_bullish_structure",
        "at_range_edge",
        "accepted_above_resistance",
    }


def dedupe_price_levels(levels: list[float], rel_tol: float = 0.0035) -> list[float]:
    ordered = sorted(float(level) for level in levels)
    deduped: list[float] = []
    for level in ordered:
        if not deduped:
            deduped.append(level)
            continue
        prev = deduped[-1]
        if abs(level - prev) / max(abs(prev), 1e-9) > rel_tol:
            deduped.append(level)
    return deduped


def derive_internal_liquidity_levels(
    df_daily: pd.DataFrame,
    close_price: float,
    external_levels: list[float],
    max_levels: int = 8,
) -> list[float]:
    ext_up = min((level for level in external_levels if level > close_price), default=None)
    ext_dn = max((level for level in external_levels if level < close_price), default=None)

    candidate_levels: list[float] = []
    swing_highs = (
        df_daily[df_daily["swing_high"].notna()][["swing_high"]].tail(8)
        if "swing_high" in df_daily.columns
        else pd.DataFrame(columns=["swing_high"])
    )
    swing_lows = (
        df_daily[df_daily["swing_low"].notna()][["swing_low"]].tail(8)
        if "swing_low" in df_daily.columns
        else pd.DataFrame(columns=["swing_low"])
    )

    for value in swing_highs["swing_high"].tolist():
        level = float(value)
        if level <= close_price:
            continue
        if ext_up is not None and level >= ext_up:
            continue
        candidate_levels.append(level)
    for value in swing_lows["swing_low"].tolist():
        level = float(value)
        if level >= close_price:
            continue
        if ext_dn is not None and level <= ext_dn:
            continue
        candidate_levels.append(level)

    deduped = dedupe_price_levels(candidate_levels)
    if len(deduped) <= max_levels:
        return deduped
    below = sorted(
        [level for level in deduped if level < close_price],
        reverse=True,
    )[: max_levels // 2]
    above = sorted([level for level in deduped if level > close_price])[: max_levels // 2]
    return sorted(below + above)


def find_equal_liquidity_clusters(
    df_daily: pd.DataFrame,
    atr14: float,
    lookback: int = 80,
) -> dict[str, list[float]]:
    x = df_daily.tail(lookback).copy()
    tolerance_abs = max(
        float(atr14) * 0.35 if atr14 > 0 else 0.0,
        float(x["close"].iloc[-1]) * 0.003,
    )

    def _cluster(series: pd.Series) -> list[float]:
        values = [float(v) for v in series.dropna().tail(10).tolist()]
        clusters: list[list[float]] = []
        for value in values:
            for cluster in clusters:
                midpoint = sum(cluster) / len(cluster)
                if abs(value - midpoint) <= max(tolerance_abs, abs(midpoint) * 0.0035):
                    cluster.append(value)
                    break
            else:
                clusters.append([value])
        return [
            round(sum(cluster) / len(cluster), 4)
            for cluster in clusters
            if len(cluster) >= 2
        ]

    highs = _cluster(x["swing_high"]) if "swing_high" in x.columns else []
    lows = _cluster(x["swing_low"]) if "swing_low" in x.columns else []
    return {
        "eqh_levels": dedupe_price_levels(highs),
        "eql_levels": dedupe_price_levels(lows),
    }


def classify_liquidity_sweep(
    *,
    sweep_events: list[dict[str, Any]],
) -> tuple[str, str, str, str | None]:
    if not sweep_events:
        return "none", "unresolved", "none", None

    type_rank = {"eqh": 4, "eql": 4, "trendline": 3, "swing": 2}
    latest_event = max(
        sweep_events,
        key=lambda event: (
            int(event.get("bar_index", -1)),
            1 if str(event.get("outcome")) in {"accepted", "rejected"} else 0,
            type_rank.get(str(event.get("sweep_type")), 0),
        ),
    )
    sweep_label = {
        "eqh": "eqh_swept",
        "eql": "eql_swept",
        "trendline": "trendline_swept",
        "swing": "swing_swept",
    }.get(str(latest_event.get("sweep_type")), "swing_swept")
    return (
        sweep_label,
        str(latest_event.get("outcome", "unresolved")),
        str(latest_event.get("event_scope", "none")),
        str(latest_event.get("side")) if latest_event.get("side") is not None else None,
    )


def remap_liquidity_draws(
    *,
    liq: dict[str, Any],
    event_scope: str,
    sweep_outcome_value: str,
    sweep_side: str | None,
) -> None:
    if sweep_side not in {"up", "down"} or sweep_outcome_value not in {
        "accepted",
        "rejected",
    }:
        return

    draw_targets = (
        liq.get("draw_targets") if isinstance(liq.get("draw_targets"), dict) else {}
    )
    current_draw = liq.get("current_draw")
    opposing_draw = liq.get("opposing_draw")

    if event_scope == "external_sweep":
        if sweep_side == "up":
            if sweep_outcome_value == "accepted":
                current_draw = draw_targets.get("external_up") or current_draw
                opposing_draw = draw_targets.get("internal_down") or opposing_draw
            else:
                current_draw = draw_targets.get("internal_down") or current_draw
                opposing_draw = draw_targets.get("external_down") or opposing_draw
        else:
            if sweep_outcome_value == "accepted":
                current_draw = draw_targets.get("external_down") or current_draw
                opposing_draw = draw_targets.get("internal_up") or opposing_draw
            else:
                current_draw = draw_targets.get("internal_up") or current_draw
                opposing_draw = draw_targets.get("external_up") or opposing_draw
    elif event_scope == "internal_tag":
        if sweep_side == "up":
            if sweep_outcome_value == "accepted":
                current_draw = draw_targets.get("external_up") or current_draw
                opposing_draw = draw_targets.get("internal_down") or opposing_draw
            else:
                current_draw = draw_targets.get("external_down") or current_draw
                opposing_draw = draw_targets.get("internal_down") or opposing_draw
        else:
            if sweep_outcome_value == "accepted":
                current_draw = draw_targets.get("external_down") or current_draw
                opposing_draw = draw_targets.get("internal_up") or opposing_draw
            else:
                current_draw = draw_targets.get("external_up") or current_draw
                opposing_draw = draw_targets.get("internal_up") or opposing_draw

    liq["current_draw"] = current_draw
    liq["opposing_draw"] = opposing_draw
