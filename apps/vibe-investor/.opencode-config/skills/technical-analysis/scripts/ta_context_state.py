from __future__ import annotations

from typing import Any

import pandas as pd

from ta_common import add_volume_features, profile_from_range


def infer_state(
    last_close: float,
    value_low: float,
    value_high: float,
    follow_close: float | None = None,
) -> tuple[str, str]:
    outside = (last_close > value_high) or (last_close < value_low)
    if not outside:
        return "balance", "inside_value_area"
    if follow_close is None:
        return "imbalance", "outside_value_area_unconfirmed"
    if last_close > value_high and follow_close >= value_high:
        return "imbalance", "accepted_above_value"
    if last_close < value_low and follow_close <= value_low:
        return "imbalance", "accepted_below_value"
    return "balance", "failed_acceptance_back_inside"


def role_reversal(last_close: float, level: float, was_support: bool) -> str:
    if was_support and last_close < level:
        return "support_broken_may_flip_to_resistance"
    if (not was_support) and last_close > level:
        return "resistance_broken_may_flip_to_support"
    return "no_flip_signal"


def ma_posture(row: pd.Series) -> dict[str, bool]:
    close_price = float(row["close"])
    return {
        "above_ema21": close_price >= float(row.get("EMA21", close_price)),
        "above_sma50": close_price >= float(row.get("SMA50", close_price)),
        "above_sma200": close_price >= float(row.get("SMA200", close_price)),
    }


def time_based_opens(df_daily: pd.DataFrame) -> dict[str, Any]:
    latest = df_daily.iloc[-1]
    daily_open = float(
        df_daily[df_daily["datetime"].dt.date == latest["datetime"].date()].iloc[0]["open"]
    )
    week_key = latest["datetime"].isocalendar().week
    week_df = df_daily[df_daily["datetime"].dt.isocalendar().week == week_key]
    month_key = latest["datetime"].to_period("M")
    month_df = df_daily[df_daily["datetime"].dt.to_period("M") == month_key]
    return {
        "daily_open": daily_open,
        "weekly_open": float(week_df.iloc[0]["open"]) if len(week_df) > 0 else None,
        "monthly_open": float(month_df.iloc[0]["open"]) if len(month_df) > 0 else None,
    }


def nearest_round_levels(price: float, step: float = 100.0) -> dict[str, float]:
    base = round(price / step) * step
    return {
        "round_below": float(base - step),
        "round_at": float(base),
        "round_above": float(base + step),
    }


def acceptance_vs_value(
    close_price: float, vah: float, val: float, prev_close: float | None = None
) -> str:
    if close_price > vah:
        if prev_close is not None and prev_close >= vah:
            return "accepted_above_vah"
        return "probe_above_vah"
    if close_price < val:
        if prev_close is not None and prev_close <= val:
            return "accepted_below_val"
        return "probe_below_val"
    return "inside_value"


def vpvr_core(df: pd.DataFrame, bins: int = 40) -> dict[str, Any]:
    return profile_from_range(df, bins=bins)


def anchored_profile(
    df_daily: pd.DataFrame, trend_bias: str, max_bars: int = 260
) -> dict[str, Any]:
    x = df_daily.tail(max_bars).copy()
    lows = x[x["swing_low"].notna()]
    highs = x[x["swing_high"].notna()]
    if trend_bias == "bearish" and len(highs) > 0:
        anchor = highs.iloc[-1]
        anchor_type = "swing_high"
    elif len(lows) > 0:
        anchor = lows.iloc[-1]
        anchor_type = "swing_low"
    else:
        anchor = x.iloc[0]
        anchor_type = "range_start"
    anchor_dt = pd.Timestamp(anchor["datetime"])
    rng = x[x["datetime"] >= anchor_dt]
    if len(rng) < 20:
        rng = x
    return {
        "mode": "anchored",
        "anchor_type": anchor_type,
        "anchor_datetime": str(anchor_dt),
        "anchor_end": str(x["datetime"].iloc[-1]),
        **profile_from_range(rng, bins=35),
    }


def breakout_snapshot(df: pd.DataFrame, levels: list[dict[str, Any]]) -> dict[str, Any]:
    x = add_volume_features(df).tail(10).reset_index(drop=True)
    if len(x) < 2:
        return {"status": "insufficient_data"}
    last_close = float(x.iloc[-1]["close"])
    mids = sorted(float(z["zone_mid"]) for z in levels)
    above = [value for value in mids if value > last_close]
    below = [value for value in mids if value < last_close]
    up_level = above[0] if above else None
    down_level = below[-1] if below else None
    trigger_bar = x.iloc[-2]
    follow_bar = x.iloc[-1]

    status = "no_breakout"
    side = None
    level = None
    if up_level is not None and float(trigger_bar["close"]) > up_level:
        side = "up"
        level = float(up_level)
    elif down_level is not None and float(trigger_bar["close"]) < down_level:
        side = "down"
        level = float(down_level)

    if side is not None and level is not None:
        status, proof = breakout_quality(df, level=level, side=side)
    else:
        proof = {
            "trigger_dt": str(trigger_bar["datetime"]),
            "trigger_close": float(trigger_bar["close"]),
            "follow_dt": str(follow_bar["datetime"]),
            "follow_close": float(follow_bar["close"]),
            "trigger_vol_ratio": (
                float(trigger_bar["vol_ratio"])
                if pd.notna(trigger_bar["vol_ratio"])
                else None
            ),
            "volume_confirmed": False,
            "close_position_quality": "moderate",
            "same_day_reversal": False,
        }

    return {
        "status": status,
        "side": side,
        "up_level": up_level,
        "down_level": down_level,
        "trigger_dt": proof["trigger_dt"],
        "trigger_close": proof["trigger_close"],
        "follow_dt": proof["follow_dt"],
        "follow_close": proof["follow_close"],
        "trigger_vol_ratio": proof["trigger_vol_ratio"],
        "volume_confirmed": proof.get("volume_confirmed", False),
        "close_position_quality": proof.get("close_position_quality", "moderate"),
        "same_day_reversal": proof.get("same_day_reversal", False),
    }


def _close_position_quality(bar: pd.Series) -> str:
    """Classify where the close sits in the bar's range."""
    hi = float(bar["high"])
    lo = float(bar["low"])
    if hi <= lo:
        return "moderate"
    pos = (float(bar["close"]) - lo) / (hi - lo)
    if pos >= 0.75:
        return "strong"
    if pos <= 0.25:
        return "weak"
    return "moderate"


def breakout_quality(
    df: pd.DataFrame, level: float, side: str
) -> tuple[str, dict[str, Any]]:
    x = add_volume_features(df).tail(10).reset_index(drop=True)
    if len(x) < 2:
        return "no_breakout", {"reason": "insufficient_data"}
    trigger_bar = x.iloc[-2]
    follow_bar = x.iloc[-1]
    if side == "up":
        trigger = float(trigger_bar["close"]) > level
        follow = float(follow_bar["close"]) >= level
    else:
        trigger = float(trigger_bar["close"]) < level
        follow = float(follow_bar["close"]) <= level

    vol_ratio = (
        float(trigger_bar["vol_ratio"])
        if pd.notna(trigger_bar["vol_ratio"])
        else None
    )
    vol_ok = vol_ratio is not None and vol_ratio >= 1.2
    volume_confirmed = vol_ratio is not None and vol_ratio >= 1.5
    close_pos = _close_position_quality(trigger_bar)

    # Same-day reversal: trigger bar opened beyond the level but closed back
    trigger_open = float(trigger_bar["open"])
    if side == "up":
        same_day_reversal = trigger_open > level and float(trigger_bar["close"]) < level
    else:
        same_day_reversal = trigger_open < level and float(trigger_bar["close"]) > level

    if same_day_reversal:
        quality = "failed_breakout_intraday"
    elif trigger and follow and vol_ok:
        # Downgrade to weak_breakout when volume is below average or close
        # position is weak, even if the basic 1.2x threshold passed.
        if (vol_ratio is not None and vol_ratio < 1.0) or close_pos == "weak":
            quality = "weak_breakout"
        else:
            quality = "valid_breakout"
    elif trigger and not follow:
        quality = "failed_breakout"
    elif trigger and not vol_ok:
        quality = "weak_breakout"
    else:
        quality = "no_breakout"

    proof = {
        "trigger_dt": str(trigger_bar["datetime"]),
        "trigger_close": float(trigger_bar["close"]),
        "follow_dt": str(follow_bar["datetime"]),
        "follow_close": float(follow_bar["close"]),
        "trigger_vol_ratio": vol_ratio,
        "volume_confirmed": volume_confirmed,
        "close_position_quality": close_pos,
        "same_day_reversal": same_day_reversal,
    }
    return quality, proof


def breakout_displacement(df: pd.DataFrame, level: float, side: str) -> str:
    x = add_volume_features(df).tail(5).reset_index(drop=True)
    if len(x) < 2:
        return "stalling"
    trigger_bar = x.iloc[-2]
    atr14 = (
        float(trigger_bar["ATR14"])
        if "ATR14" in trigger_bar.index and pd.notna(trigger_bar.get("ATR14"))
        else 0.0
    )
    if atr14 <= 0:
        return "stalling"
    candle_range = abs(float(trigger_bar["close"]) - float(trigger_bar["open"]))
    return "clean_displacement" if candle_range >= atr14 * 0.8 else "stalling"


def base_quality(
    window: pd.DataFrame, min_weeks: int = 7, max_depth: float = 0.35
) -> dict[str, Any]:
    n_days = len(window)
    weeks = n_days / 5.0
    high = float(window["high"].max())
    low = float(window["low"].min())
    depth = (high - low) / high if high > 0 else 0.0
    too_short = weeks < min_weeks
    too_deep = depth > max_depth
    status = "weak" if (too_short or too_deep) else "ok"
    return {
        "weeks": float(weeks),
        "depth": float(depth),
        "too_short": bool(too_short),
        "too_deep": bool(too_deep),
        "status": status,
    }


def build_intent(purpose_mode: str, position_state: str) -> str:
    if purpose_mode == "POSTMORTEM":
        return "postmortem"
    if position_state == "long":
        return "maintenance"
    return "entry"


def normalize_structure_status(
    raw_status: str, regime: str, trend_bias: str
) -> str:
    if raw_status in {"choch_only", "choch_plus_bos_confirmed"}:
        return "transitioning"
    if regime == "potential_reversal":
        return "damaged"
    if regime == "trend_continuation" and trend_bias in {"bullish", "bearish"}:
        return "trend_intact"
    if regime == "range_rotation":
        return "range_intact"
    if regime == "no_trade":
        return "unclear"
    return "unclear"
