from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from ta_common import add_atr14, add_ma_stack, add_volume_features

IDX_PRICE_LIMIT_PROXIMITY_THRESHOLD_PCT = 0.01
HIGH_LIQUIDITY_ADTV = 50_000_000_000.0
MEDIUM_LIQUIDITY_ADTV = 10_000_000_000.0
LOW_LIQUIDITY_ADTV = 1_000_000_000.0


def normalize_red_flags(red_flags: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {
            "code": str(flag["flag_id"]),
            "severity": str(flag["severity"]).lower(),
            "summary": str(flag["why"]),
        }
        for flag in red_flags.get("flags", [])
    ]


def count_distribution_days(df: pd.DataFrame, window: int = 20) -> dict[str, Any]:
    x = add_volume_features(df).tail(window)
    days = x[(x["ret"] < -0.03) & (x["vol_ratio"] > 1.2)]
    return {
        "count": int(len(days)),
        "dates": [str(value) for value in days["datetime"].tolist()]
        if "datetime" in days.columns
        else [],
    }


def average_daily_value_profile(
    df: pd.DataFrame, window: int = 20,
) -> dict[str, Any] | None:
    if df.empty:
        return None
    x = df.tail(window).copy()
    if "value" in x.columns:
        value_series = pd.to_numeric(x["value"], errors="coerce")
    else:
        value_series = pd.Series(index=x.index, dtype=float)
    if value_series.isna().all():
        value_series = (
            pd.to_numeric(x.get("close"), errors="coerce")
            * pd.to_numeric(x.get("volume"), errors="coerce")
        )
    value_series = value_series.dropna()
    if value_series.empty:
        return None
    avg_daily_value = float(value_series.mean())
    if avg_daily_value > HIGH_LIQUIDITY_ADTV:
        category = "high"
    elif avg_daily_value >= MEDIUM_LIQUIDITY_ADTV:
        category = "medium"
    elif avg_daily_value >= LOW_LIQUIDITY_ADTV:
        category = "low"
    else:
        category = "very_low"
    return {
        "avg_daily_value": round(avg_daily_value, 2),
        "category": category,
        "window": int(min(len(df), window)),
    }


def detect_ma_whipsaw(
    df: pd.DataFrame,
    adaptive_period: int | None = None,
    lookback: int = 30,
) -> list[dict[str, Any]]:
    x = add_atr14(add_ma_stack(df)).tail(lookback).copy()
    if x.empty:
        return []

    ma_specs: list[tuple[str, str]] = [
        ("EMA21", "ema21"),
        ("SMA50", "sma50"),
    ]
    if adaptive_period is not None:
        adaptive_col = f"SMA{int(adaptive_period)}"
        if adaptive_col not in x.columns:
            x[adaptive_col] = x["close"].rolling(int(adaptive_period)).mean()
        ma_specs.append((adaptive_col, f"adaptive_sma{int(adaptive_period)}"))

    diagnostics: list[dict[str, Any]] = []
    for col, label in ma_specs:
        y = x.dropna(subset=[col]).copy()
        if len(y) < 12:
            continue
        band = y["ATR14"].fillna((y["high"] - y["low"]).rolling(5).mean()).fillna(
            (y["high"] - y["low"]).median()
        ) * 0.18
        dist = y["close"] - y[col]
        state = pd.Series(
            np.where(dist > band, 1, np.where(dist < -band, -1, 0)),
            index=y.index,
        )
        state_ffill = state.replace(0, np.nan).ffill()
        cross_mask = (
            state_ffill.notna()
            & state_ffill.shift(1).notna()
            & (state_ffill != state_ffill.shift(1))
        )
        cross_count = int(cross_mask.sum())
        if cross_count == 0:
            continue

        cross_positions = np.flatnonzero(cross_mask.to_numpy())
        recent_cluster_count = 0
        for i in range(1, len(cross_positions)):
            if int(cross_positions[i] - cross_positions[i - 1]) <= 4:
                recent_cluster_count += 1
        last_state = int(state.iloc[-1])
        severity = None
        if cross_count >= 4 or recent_cluster_count >= 2:
            severity = "HIGH"
        elif cross_count >= 3 or recent_cluster_count >= 1:
            severity = "MEDIUM"
        if severity is None:
            continue
        diagnostics.append(
            {
                "flag_id": "F15_MA_WHIPSAW",
                "severity": severity,
                "why": (
                    f"{label}_cross_count_{cross_count}_cluster_count_{recent_cluster_count}"
                    f"_last_state_{last_state}"
                ),
            }
        )
    return diagnostics


def _has_pullback(df: pd.DataFrame, lookback: int = 30, threshold: float = 0.05) -> bool:
    """Check whether any swing high in the last *lookback* bars was followed
    by a pullback of at least *threshold* (fraction) before price recovered."""
    x = df.tail(lookback)
    if x.empty or "swing_high" not in x.columns:
        return False
    swing_highs = x[x["swing_high"].notna()]
    for _, row in swing_highs.iterrows():
        sh = float(row["swing_high"])
        subsequent = x.loc[row.name:]  # type: ignore[arg-type]
        if subsequent.empty:
            continue
        min_low = float(subsequent["low"].min())
        if sh > 0 and (sh - min_low) / sh >= threshold:
            return True
    return False


def build_red_flags(
    regime: str,
    breakout_state: str,
    level_touches: int,
    structure_state: str,
    last_close: float,
    ema21: float,
    sma50: float,
    position_state: str,
    risk_status: str,
    distribution_day_count: int,
    liquidity_category: str | None = None,
    price_limit_proximity: str | None = None,
    price_limit_proximity_mode: str | None = None,
    breakout_displacement_state: str | None = None,
    ma_whipsaw_flags: list[dict[str, Any]] | None = None,
    price_change_30d_pct: float | None = None,
    daily_df: pd.DataFrame | None = None,
) -> dict[str, Any]:
    flags: list[dict[str, Any]] = []
    breakout_failure_severity = (
        "HIGH"
        if (
            (position_state == "long" and last_close < sma50)
            or (
                regime != "trend_continuation"
                and structure_state in {"choch_only", "choch_plus_bos_confirmed"}
            )
        )
        else "MEDIUM"
    )
    if regime == "potential_reversal":
        flags.append(
            {
                "flag_id": "F1_STRUCTURE_BREAK",
                "severity": "HIGH",
                "why": "daily_structure_transitioning",
            }
        )
    if breakout_state == "failed_breakout":
        flags.append(
            {
                "flag_id": "F3_WEAK_BREAKOUT",
                "severity": breakout_failure_severity,
                "why": "breakout_failed_follow_through",
            }
        )
    if breakout_state == "failed_breakout_intraday":
        flags.append(
            {
                "flag_id": "F3_WEAK_BREAKOUT",
                "severity": "HIGH",
                "why": "breakout_reversed_same_day",
            }
        )
    if breakout_state == "weak_breakout":
        flags.append(
            {
                "flag_id": "F3_WEAK_BREAKOUT",
                "severity": "MEDIUM",
                "why": "breakout_low_volume_or_weak_close_position",
            }
        )
    if level_touches >= 4:
        flags.append(
            {
                "flag_id": "F4_LEVEL_EXHAUSTION",
                "severity": "MEDIUM",
                "why": "repeated_tests_reduce_level_reliability",
            }
        )
    if structure_state == "choch_only":
        flags.append(
            {
                "flag_id": "F9_UNCONFIRMED_STRUCTURE_SHIFT",
                "severity": "MEDIUM",
                "why": "choch_without_confirmation_bos",
            }
        )
    if last_close < ema21 and last_close < sma50:
        flags.append(
            {
                "flag_id": "F6_MA_BREAKDOWN",
                "severity": "HIGH",
                "why": "price_below_ema21_and_sma50",
            }
        )
    elif last_close < sma50:
        flags.append(
            {
                "flag_id": "F6_MA_BREAKDOWN",
                "severity": "HIGH",
                "why": "price_below_sma50",
            }
        )
    elif last_close < ema21:
        flags.append(
            {
                "flag_id": "F6_MA_BREAKDOWN",
                "severity": "MEDIUM",
                "why": "price_below_ema21",
            }
        )
    if position_state == "long" and (
        risk_status != "valid" or last_close < ema21 or last_close < sma50
    ):
        flags.append(
            {
                "flag_id": "F7_POSITION_RISK",
                "severity": "HIGH" if last_close < ema21 else "MEDIUM",
                "why": "open_position_under_technical_stress",
            }
        )
    if risk_status == "no_clear_path":
        flags.append(
            {
                "flag_id": "F10_NO_NEXT_ZONE_PATH",
                "severity": "MEDIUM",
                "why": "risk_map_missing_next_zone_target",
            }
        )
    if distribution_day_count >= 4:
        flags.append(
            {
                "flag_id": "F2_DISTRIBUTION",
                "severity": "HIGH",
                "why": f"{distribution_day_count}_distribution_days_detected",
            }
        )
    elif distribution_day_count >= 2:
        flags.append(
            {
                "flag_id": "F2_DISTRIBUTION",
                "severity": "MEDIUM",
                "why": f"{distribution_day_count}_distribution_days_detected",
            }
        )
    if breakout_state in {"valid_breakout", "weak_breakout"} and breakout_displacement_state == "stalling":
        flags.append(
            {
                "flag_id": "F12_BREAKOUT_STALLING",
                "severity": "MEDIUM",
                "why": "breakout_lacks_clean_displacement",
            }
        )
    if liquidity_category == "very_low":
        flags.append(
            {
                "flag_id": "F17_LIQUIDITY_WEAK",
                "severity": "HIGH",
                "why": "average_daily_value_very_low_below_1b",
            }
        )
    elif liquidity_category == "low":
        flags.append(
            {
                "flag_id": "F17_LIQUIDITY_WEAK",
                "severity": "MEDIUM",
                "why": "average_daily_value_low_1b_to_10b",
            }
        )
    if price_limit_proximity == "near_ara":
        flags.append(
            {
                "flag_id": "F16_PRICE_LIMIT_PROXIMITY",
                "severity": (
                    "HIGH"
                    if price_limit_proximity_mode == "close" and breakout_state == "valid_breakout"
                    else "MEDIUM"
                ),
                "why": (
                    "close_near_idx_upper_auto_rejection_limit"
                    if price_limit_proximity_mode == "close"
                    else "intrabar_high_near_idx_upper_auto_rejection_limit"
                ),
            }
        )
    elif price_limit_proximity == "near_arb":
        flags.append(
            {
                "flag_id": "F16_PRICE_LIMIT_PROXIMITY",
                "severity": (
                    "HIGH"
                    if price_limit_proximity_mode == "close" and position_state == "long"
                    else "MEDIUM"
                ),
                "why": (
                    "close_near_idx_lower_auto_rejection_limit"
                    if price_limit_proximity_mode == "close"
                    else "intrabar_low_near_idx_lower_auto_rejection_limit"
                ),
            }
        )
    for flag in ma_whipsaw_flags or []:
        add_flag(
            flags,
            str(flag["flag_id"]),
            str(flag["severity"]),
            str(flag["why"]),
        )
    # F18: extended move without meaningful pullback
    if (
        price_change_30d_pct is not None
        and daily_df is not None
        and price_change_30d_pct > 30.0
        and not _has_pullback(daily_df, lookback=30, threshold=0.05)
    ):
        flags.append(
            {
                "flag_id": "F18_EXTENDED_MOVE",
                "severity": "MEDIUM",
                "why": f"price_up_{price_change_30d_pct:.1f}pct_in_30d_without_5pct_pullback",
            }
        )
    severity_rank = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}
    overall = "LOW"
    if flags:
        overall = max(flags, key=lambda flag: severity_rank[flag["severity"]])["severity"]
    return {"flags": flags, "overall_severity": overall}


def add_flag(
    flags: list[dict[str, Any]], flag_id: str, severity: str, why: str
) -> None:
    key = (flag_id, why)
    for flag in flags:
        if (flag.get("flag_id"), flag.get("why")) == key:
            return
    flags.append({"flag_id": flag_id, "severity": severity, "why": why})


def nearest_support_distance_pct(
    last_close: float, levels: list[dict[str, Any]]
) -> float | None:
    supports = [
        float(zone["zone_mid"]) for zone in levels if float(zone["zone_mid"]) < last_close
    ]
    if not supports:
        return None
    nearest = max(supports)
    return abs((last_close - nearest) / max(last_close, 1e-9))


def idx_price_limit_proximity(
    *,
    prev_close: float,
    last_high: float,
    last_low: float,
    last_close: float,
) -> dict[str, Any] | None:
    if prev_close <= 0:
        return None
    if prev_close <= 200:
        ara_pct = 0.35
    elif prev_close <= 5000:
        ara_pct = 0.25
    else:
        ara_pct = 0.20
    arb_pct = 0.15

    upper_limit = float(prev_close) * (1.0 + ara_pct)
    lower_limit = float(prev_close) * (1.0 - arb_pct)
    close_near_upper = float(last_close) >= upper_limit * (
        1.0 - IDX_PRICE_LIMIT_PROXIMITY_THRESHOLD_PCT
    )
    close_near_lower = float(last_close) <= lower_limit * (
        1.0 + IDX_PRICE_LIMIT_PROXIMITY_THRESHOLD_PCT
    )
    intrabar_near_upper = (
        float(last_high) >= upper_limit * (1.0 - IDX_PRICE_LIMIT_PROXIMITY_THRESHOLD_PCT)
        and not close_near_upper
    )
    intrabar_near_lower = (
        float(last_low) <= lower_limit * (1.0 + IDX_PRICE_LIMIT_PROXIMITY_THRESHOLD_PCT)
        and not close_near_lower
    )

    if close_near_upper:
        state = "near_ara"
        mode = "close"
    elif close_near_lower:
        state = "near_arb"
        mode = "close"
    elif intrabar_near_upper and not intrabar_near_lower:
        state = "near_ara"
        mode = "intrabar"
    elif intrabar_near_lower and not intrabar_near_upper:
        state = "near_arb"
        mode = "intrabar"
    else:
        return None

    return {
        "state": state,
        "mode": mode,
        "upper_limit": round(float(upper_limit), 4),
        "lower_limit": round(float(lower_limit), 4),
    }


def enrich_red_flags(
    red_flags: dict[str, Any],
    last_close: float,
    regime: str,
    levels: list[dict[str, Any]],
    modules: set[str],
    liquidity: dict[str, Any],
    vpvr: dict[str, Any] | None,
    breakout: dict[str, Any] | None,
) -> dict[str, Any]:
    flags: list[dict[str, Any]] = [dict(item) for item in red_flags.get("flags", [])]

    if breakout is not None:
        breakout_status = str(breakout.get("status", "no_breakout"))
        breakout_side = breakout.get("side")
        breakout_base = breakout.get("base_quality", {})
        if breakout_status == "valid_breakout" and regime in {
            "range_rotation",
            "potential_reversal",
        }:
            add_flag(
                flags,
                "F5_MARKET_CONTEXT_MISMATCH",
                "MEDIUM",
                "breakout_signal_conflicts_with_current_regime",
            )
        if breakout_status == "valid_breakout":
            base_ok = (
                bool(breakout_base.get("status") == "ok")
                if isinstance(breakout_base, dict)
                else True
            )
            context_ok = regime in {"trend_continuation"}
            if not (base_ok and context_ok):
                add_flag(
                    flags,
                    "F14_BREAKOUT_FILTER_WEAK",
                    "MEDIUM",
                    "breakout_filters_weak_base_or_context",
                )

            targets = (
                liquidity.get("draw_targets", {}) if isinstance(liquidity, dict) else {}
            )
            if breakout_side == "up" and targets.get("external_up") is None:
                add_flag(
                    flags,
                    "F10_NO_NEXT_ZONE_PATH",
                    "MEDIUM",
                    "breakout_without_next_zone_target",
                )
            if breakout_side == "down" and targets.get("external_down") is None:
                add_flag(
                    flags,
                    "F10_NO_NEXT_ZONE_PATH",
                    "MEDIUM",
                    "breakout_without_next_zone_target",
                )

    nearest_support = nearest_support_distance_pct(last_close, levels)
    if nearest_support is not None and nearest_support > 0.10:
        add_flag(
            flags,
            "F8_NO_NEARBY_SUPPORT",
            "MEDIUM",
            "nearest_support_too_far_from_current_price",
        )

    missing_liq = any(
        liquidity.get(key) is None
        for key in ("current_draw", "opposing_draw", "sweep_event")
    )
    if missing_liq:
        add_flag(
            flags,
            "F11_LIQUIDITY_MAP_MISSING",
            "MEDIUM",
            "liquidity_map_incomplete_draw_targets_or_sweep",
        )

    if "vpvr" in modules and vpvr is not None:
        has_key = (
            vpvr.get("poc") is not None
            and vpvr.get("vah") is not None
            and vpvr.get("val") is not None
        )
        if not has_key:
            add_flag(
                flags,
                "F13_VOLUME_CONFLUENCE_WEAK",
                "MEDIUM",
                "volume_profile_context_lacks_core_levels",
            )

    severity_rank = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}
    overall = "LOW"
    if flags:
        overall = max(
            flags,
            key=lambda flag: severity_rank.get(str(flag.get("severity")), 1),
        )["severity"]
    return {"flags": flags, "overall_severity": overall}
