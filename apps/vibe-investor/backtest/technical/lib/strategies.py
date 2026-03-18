"""Deterministic baseline strategies for daily-only technical backtests."""

from __future__ import annotations

from typing import Any

import pandas as pd

from .policy import (
    PolicyDecision,
    evaluate_flat_policy,
    evaluate_long_policy,
    liquidity_entry_alignment,
    liquidity_exit_pressure,
)

STRATEGY_ORDER = [
    "ablation", "buy_and_hold", "ma_trend",
    "trend_pullback", "breakout_volume", "range_reclaim",
]

_STRATEGY_SETUP_IDS = {
    "buy_and_hold": "BUY_AND_HOLD", "ma_trend": "MA_TREND",
    "trend_pullback": "TREND_PULLBACK", "breakout_volume": "BREAKOUT_VOLUME",
    "range_reclaim": "RANGE_RECLAIM",
}

_PENDING_EXPIRY_BARS = {"breakout_volume": 3}


def strategy_setup_id(strategy_name: str) -> str:
    return _STRATEGY_SETUP_IDS.get(strategy_name, "NO_VALID_SETUP")


def pending_expiry(strategy_name: str) -> int:
    return _PENDING_EXPIRY_BARS.get(strategy_name, 5)


def _ema(series: pd.Series, span: int) -> pd.Series:
    return series.ewm(span=span, adjust=False).mean()


def _sma(series: pd.Series, window: int) -> pd.Series:
    return series.rolling(window).mean()


def _volume_ratio(history: pd.DataFrame, lookback: int = 20) -> float | None:
    if history.empty:
        return None
    vols = pd.to_numeric(history["volume"], errors="coerce")
    if len(vols) < 2:
        return None
    baseline = vols.iloc[:-1].tail(lookback).mean()
    if pd.isna(baseline) or float(baseline) <= 0:
        return None
    return float(vols.iloc[-1] / baseline)


def _ma_snapshot(history: pd.DataFrame) -> dict[str, float | None]:
    closes = pd.to_numeric(history["close"], errors="coerce")
    ema21 = _ema(closes, 21).iloc[-1] if not closes.empty else None
    sma50 = _sma(closes, 50).iloc[-1] if not closes.empty else None
    sma200 = _sma(closes, 200).iloc[-1] if not closes.empty else None
    prev_ema21 = _ema(closes.iloc[:-1], 21).iloc[-1] if len(closes) > 1 else None
    prev_sma50 = _sma(closes.iloc[:-1], 50).iloc[-1] if len(closes) > 1 else None
    prev_sma200 = _sma(closes.iloc[:-1], 200).iloc[-1] if len(closes) > 1 else None
    return {
        "close": float(closes.iloc[-1]) if not closes.empty else None,
        "prev_close": float(closes.iloc[-2]) if len(closes) > 1 else None,
        "ema21": float(ema21) if pd.notna(ema21) else None,
        "sma50": float(sma50) if pd.notna(sma50) else None,
        "sma200": float(sma200) if pd.notna(sma200) else None,
        "prev_ema21": float(prev_ema21) if pd.notna(prev_ema21) else None,
        "prev_sma50": float(prev_sma50) if pd.notna(prev_sma50) else None,
        "prev_sma200": float(prev_sma200) if pd.notna(prev_sma200) else None,
    }


def _first_zone(context: dict[str, Any], zone_key: str) -> dict[str, Any] | None:
    zones = context.get("location", {}).get(zone_key, [])
    if isinstance(zones, list) and zones:
        zone = zones[0]
        if isinstance(zone, dict):
            return zone
    return None


def _high_flag_codes(context: dict[str, Any]) -> set[str]:
    flags = context.get("red_flags", [])
    out: set[str] = set()
    if not isinstance(flags, list):
        return out
    for item in flags:
        if not isinstance(item, dict):
            continue
        if str(item.get("severity", "")).lower() != "high":
            continue
        code = item.get("code")
        if isinstance(code, str) and code:
            out.add(code)
    return out


def _trend_active(ma: dict[str, float | None]) -> bool:
    close, ema21, sma50, sma200 = ma.get("close"), ma.get("ema21"), ma.get("sma50"), ma.get("sma200")
    return bool(close and ema21 and sma50 and sma200 and close > sma200 and ema21 > sma50)


def _trend_active_prev(ma: dict[str, float | None]) -> bool:
    c, e, s50, s200 = ma.get("prev_close"), ma.get("prev_ema21"), ma.get("prev_sma50"), ma.get("prev_sma200")
    return bool(c and e and s50 and s200 and c > s200 and e > s50)


# --- Buy and Hold ---

def _policy_buy_and_hold_flat(
    *, cooldown_active: bool, is_first_window_bar: bool, has_ever_entered: bool,
) -> PolicyDecision:
    if cooldown_active or has_ever_entered:
        return PolicyDecision("WAIT", "buy_and_hold_no_reentry", "BUY_AND_HOLD", False)
    if is_first_window_bar:
        return PolicyDecision("BUY", "buy_first_window_open", "BUY_AND_HOLD", False)
    return PolicyDecision("WAIT", "await_first_window_bar", "BUY_AND_HOLD", False)


def _policy_buy_and_hold_long() -> PolicyDecision:
    return PolicyDecision("HOLD", "buy_and_hold_hold_to_window_end", "BUY_AND_HOLD", False)


# --- MA Trend ---

def _policy_ma_trend_flat(
    *, history_visible: pd.DataFrame, cooldown_active: bool,
    is_first_window_bar: bool, has_ever_entered: bool,
) -> PolicyDecision:
    if cooldown_active or has_ever_entered:
        return PolicyDecision("WAIT", "ma_trend_no_reentry", "MA_TREND", False)
    ma = _ma_snapshot(history_visible)
    if _trend_active(ma) and (is_first_window_bar or not _trend_active_prev(ma)):
        return PolicyDecision("BUY", "ma_trend_signal_active", "MA_TREND", False)
    return PolicyDecision("WAIT", "ma_trend_not_active", "MA_TREND", False)


def _policy_ma_trend_long(*, history_visible: pd.DataFrame) -> PolicyDecision:
    ma = _ma_snapshot(history_visible)
    close, sma50, sma200 = ma.get("close"), ma.get("sma50"), ma.get("sma200")
    if close is None or sma50 is None or sma200 is None:
        return PolicyDecision("HOLD", "ma_trend_insufficient_ma_history", "MA_TREND", False)
    if close < sma50 or close < sma200:
        return PolicyDecision("EXIT", "ma_trend_close_below_ma", "MA_TREND", False)
    return PolicyDecision("HOLD", "ma_trend_holding", "MA_TREND", False)


# --- Trend Pullback ---

def _policy_trend_pullback_flat(
    *, context: dict[str, Any], history_visible: pd.DataFrame,
    cooldown_active: bool, has_ever_entered: bool,
) -> PolicyDecision:
    if cooldown_active or has_ever_entered:
        return PolicyDecision("WAIT", "trend_pullback_no_reentry", "TREND_PULLBACK", False)
    daily = context.get("daily_thesis", {})
    risk_map = context.get("risk_map", {})
    ma = _ma_snapshot(history_visible)
    liquidity_alignment = liquidity_entry_alignment(context, "S2")
    if str(daily.get("trend_bias")) != "bullish" or str(daily.get("structure_status")) != "trend_intact":
        return PolicyDecision("WAIT", "trend_pullback_daily_not_supportive", "TREND_PULLBACK", False)
    if liquidity_alignment == "contradictory":
        return PolicyDecision("WAIT", "trend_pullback_liquidity_contradiction", "TREND_PULLBACK", False)
    if any(ma.get(k) is None for k in ("close", "sma200", "ema21", "sma50")):
        return PolicyDecision("WAIT", "trend_pullback_insufficient_ma_history", "TREND_PULLBACK", False)
    close, ema21, sma50, sma200 = float(ma["close"]), float(ma["ema21"]), float(ma["sma50"]), float(ma["sma200"])
    if close <= sma200:
        return PolicyDecision("WAIT", "trend_pullback_below_sma200", "TREND_PULLBACK", False)
    prev_bar = history_visible.iloc[-2] if len(history_visible) > 1 else history_visible.iloc[-1]
    support_touch = float(history_visible.iloc[-1]["low"]) <= ema21 * 1.01 or float(history_visible.iloc[-1]["low"]) <= sma50 * 1.01
    reclaim = close >= ema21 and close > float(prev_bar["close"])
    if support_touch and reclaim and str(risk_map.get("risk_status")) == "valid":
        return PolicyDecision("BUY", "trend_pullback_reclaim", "TREND_PULLBACK", False)
    if support_touch or str(context.get("setup", {}).get("primary_setup")) == "S2":
        return PolicyDecision(
            "WAIT", "trend_pullback_watch", "TREND_PULLBACK", True,
            pending_setup_id="TREND_PULLBACK", pending_setup_expiry_bars=pending_expiry("trend_pullback"),
        )
    return PolicyDecision("WAIT", "trend_pullback_not_ready", "TREND_PULLBACK", False)


def _policy_trend_pullback_long(*, context: dict[str, Any], history_visible: pd.DataFrame) -> PolicyDecision:
    daily = context.get("daily_thesis", {})
    ma = _ma_snapshot(history_visible)
    close, sma50, sma200 = ma.get("close"), ma.get("sma50"), ma.get("sma200")
    exit_pressure = liquidity_exit_pressure(context)
    if exit_pressure == "hard_exit":
        return PolicyDecision("EXIT", "trend_pullback_accepted_downside_sweep", "TREND_PULLBACK", False)
    if str(daily.get("trend_bias")) == "bearish" or str(daily.get("structure_status")) == "damaged":
        return PolicyDecision("EXIT", "trend_pullback_thesis_broken", "TREND_PULLBACK", False)
    if close is not None and sma50 is not None and close < sma50:
        return PolicyDecision("EXIT", "trend_pullback_close_below_sma50", "TREND_PULLBACK", False)
    if close is not None and sma200 is not None and close < sma200:
        return PolicyDecision("EXIT", "trend_pullback_close_below_sma200", "TREND_PULLBACK", False)
    return PolicyDecision("HOLD", "trend_pullback_holding", "TREND_PULLBACK", False)


# --- Breakout Volume ---

def _policy_breakout_volume_flat(
    *, context: dict[str, Any], history_visible: pd.DataFrame,
    cooldown_active: bool, has_ever_entered: bool,
) -> PolicyDecision:
    if cooldown_active or has_ever_entered:
        return PolicyDecision("WAIT", "breakout_volume_no_reentry", "BREAKOUT_VOLUME", False)
    setup = context.get("setup", {})
    trigger = context.get("trigger_confirmation", {})
    risk_map = context.get("risk_map", {})
    bq = trigger.get("breakout_quality", {})
    vol_ratio = _volume_ratio(history_visible)
    liquidity_alignment = liquidity_entry_alignment(context, "S1")
    if liquidity_alignment == "contradictory":
        return PolicyDecision("WAIT", "breakout_volume_liquidity_contradiction", "BREAKOUT_VOLUME", False)
    if (
        str(setup.get("primary_setup")) == "S1"
        and str(trigger.get("trigger_state")) == "triggered"
        and str(risk_map.get("risk_status")) == "valid"
        and str(bq.get("status", "stalling")) in {"clean", "adequate"}
        and (vol_ratio is None or vol_ratio >= 1.2)
    ):
        return PolicyDecision("BUY", "breakout_volume_triggered", "BREAKOUT_VOLUME", False)
    high_flags = _high_flag_codes(context)
    if str(setup.get("primary_setup")) == "S1" or "F3_WEAK_BREAKOUT" in high_flags:
        return PolicyDecision(
            "WAIT", "breakout_volume_watch", "BREAKOUT_VOLUME", True,
            pending_setup_id="BREAKOUT_VOLUME", pending_setup_expiry_bars=pending_expiry("breakout_volume"),
        )
    return PolicyDecision("WAIT", "breakout_volume_not_ready", "BREAKOUT_VOLUME", False)


def _policy_breakout_volume_long(*, context: dict[str, Any]) -> PolicyDecision:
    daily = context.get("daily_thesis", {})
    exit_pressure = liquidity_exit_pressure(context)
    if exit_pressure == "hard_exit":
        return PolicyDecision("EXIT", "breakout_volume_accepted_downside_sweep", "BREAKOUT_VOLUME", False)
    if exit_pressure == "caution_exit":
        return PolicyDecision("EXIT", "breakout_volume_upside_sweep_rejected", "BREAKOUT_VOLUME", False)
    if "F3_WEAK_BREAKOUT" in _high_flag_codes(context):
        return PolicyDecision("EXIT", "breakout_volume_failed_breakout", "BREAKOUT_VOLUME", False)
    if str(daily.get("trend_bias")) == "bearish" or str(daily.get("structure_status")) == "damaged":
        return PolicyDecision("EXIT", "breakout_volume_thesis_broken", "BREAKOUT_VOLUME", False)
    return PolicyDecision("HOLD", "breakout_volume_holding", "BREAKOUT_VOLUME", False)


# --- Range Reclaim ---

def _policy_range_reclaim_flat(
    *, context: dict[str, Any], history_visible: pd.DataFrame,
    cooldown_active: bool, has_ever_entered: bool,
) -> PolicyDecision:
    if cooldown_active or has_ever_entered:
        return PolicyDecision("WAIT", "range_reclaim_no_reentry", "RANGE_RECLAIM", False)
    daily = context.get("daily_thesis", {})
    risk_map = context.get("risk_map", {})
    support = _first_zone(context, "support_zones")
    liquidity_alignment = liquidity_entry_alignment(context, "S4")
    if support is None:
        return PolicyDecision("WAIT", "range_reclaim_no_support_zone", "RANGE_RECLAIM", False)
    if str(daily.get("state")) != "balance" and str(daily.get("regime")) != "range_rotation":
        return PolicyDecision("WAIT", "range_reclaim_not_in_range", "RANGE_RECLAIM", False)
    if liquidity_alignment == "contradictory":
        return PolicyDecision("WAIT", "range_reclaim_liquidity_contradiction", "RANGE_RECLAIM", False)
    bar = history_visible.iloc[-1]
    support_high = float(support.get("high", support.get("mid", bar["close"])))
    support_mid = float(support.get("mid", bar["close"]))
    reclaim = float(bar["low"]) <= support_high and float(bar["close"]) >= support_mid and float(bar["close"]) > float(bar["open"])
    if reclaim and str(risk_map.get("risk_status")) == "valid" and liquidity_alignment == "supportive":
        return PolicyDecision("BUY", "range_reclaim_triggered", "RANGE_RECLAIM", False)
    if str(context.get("setup", {}).get("primary_setup")) == "S4":
        return PolicyDecision(
            "WAIT", "range_reclaim_watch", "RANGE_RECLAIM", True,
            pending_setup_id="RANGE_RECLAIM", pending_setup_expiry_bars=pending_expiry("range_reclaim"),
        )
    return PolicyDecision("WAIT", "range_reclaim_not_ready", "RANGE_RECLAIM", False)


def _policy_range_reclaim_long(*, context: dict[str, Any], history_visible: pd.DataFrame) -> PolicyDecision:
    support = _first_zone(context, "support_zones")
    daily = context.get("daily_thesis", {})
    exit_pressure = liquidity_exit_pressure(context)
    if exit_pressure == "hard_exit":
        return PolicyDecision("EXIT", "range_reclaim_accepted_downside_sweep", "RANGE_RECLAIM", False)
    if exit_pressure == "caution_exit":
        return PolicyDecision("EXIT", "range_reclaim_upside_sweep_rejected", "RANGE_RECLAIM", False)
    if str(daily.get("trend_bias")) == "bearish" or str(daily.get("structure_status")) == "damaged":
        return PolicyDecision("EXIT", "range_reclaim_thesis_broken", "RANGE_RECLAIM", False)
    if support is not None:
        support_low = float(support.get("low", support.get("mid", history_visible.iloc[-1]["close"])))
        if float(history_visible.iloc[-1]["close"]) < support_low:
            return PolicyDecision("EXIT", "range_reclaim_close_below_support", "RANGE_RECLAIM", False)
    return PolicyDecision("HOLD", "range_reclaim_holding", "RANGE_RECLAIM", False)


# --- Dispatchers ---

def evaluate_strategy_flat(
    *, strategy_name: str, context: dict[str, Any], history_visible: pd.DataFrame,
    cooldown_active: bool, is_first_window_bar: bool, has_ever_entered: bool,
) -> PolicyDecision:
    if strategy_name == "ablation":
        return evaluate_flat_policy(context, cooldown_active=cooldown_active)
    handlers = {
        "buy_and_hold": lambda: _policy_buy_and_hold_flat(
            cooldown_active=cooldown_active, is_first_window_bar=is_first_window_bar, has_ever_entered=has_ever_entered),
        "ma_trend": lambda: _policy_ma_trend_flat(
            history_visible=history_visible, cooldown_active=cooldown_active,
            is_first_window_bar=is_first_window_bar, has_ever_entered=has_ever_entered),
        "trend_pullback": lambda: _policy_trend_pullback_flat(
            context=context, history_visible=history_visible,
            cooldown_active=cooldown_active, has_ever_entered=has_ever_entered),
        "breakout_volume": lambda: _policy_breakout_volume_flat(
            context=context, history_visible=history_visible,
            cooldown_active=cooldown_active, has_ever_entered=has_ever_entered),
        "range_reclaim": lambda: _policy_range_reclaim_flat(
            context=context, history_visible=history_visible,
            cooldown_active=cooldown_active, has_ever_entered=has_ever_entered),
    }
    handler = handlers.get(strategy_name)
    if handler is None:
        raise ValueError(f"Unsupported strategy: {strategy_name}")
    return handler()


def evaluate_strategy_long(
    *, strategy_name: str, context: dict[str, Any], history_visible: pd.DataFrame,
) -> PolicyDecision:
    if strategy_name == "ablation":
        return evaluate_long_policy(context)
    handlers = {
        "buy_and_hold": lambda: _policy_buy_and_hold_long(),
        "ma_trend": lambda: _policy_ma_trend_long(history_visible=history_visible),
        "trend_pullback": lambda: _policy_trend_pullback_long(context=context, history_visible=history_visible),
        "breakout_volume": lambda: _policy_breakout_volume_long(context=context),
        "range_reclaim": lambda: _policy_range_reclaim_long(context=context, history_visible=history_visible),
    }
    handler = handlers.get(strategy_name)
    if handler is None:
        raise ValueError(f"Unsupported strategy: {strategy_name}")
    return handler()
