#!/usr/bin/env python3
# pyright: reportGeneralTypeIssues=false, reportArgumentType=false, reportAttributeAccessIssue=false

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import pandas as pd

from ta_common import (
    add_atr14,
    add_ma_stack,
    add_swings,
    add_volume_features,
    classify_price_volume,
    classify_regime,
    choose_adaptive_ma,
    derive_levels,
    detect_structure_events,
    detect_sweep_events,
    detect_trendline_levels,
    detect_wyckoff_spring,
    liquidity_draws,
    liquidity_path_after_event,
    mixed_swing_ma_bias,
    pick_draw_targets,
    structure_status,
)
from ta_context_execution import (
    build_disabled_intraday_timing,
    build_intraday_timing,
    build_risk_map,
    build_trade_management,
    build_trigger_confirmation,
)
from ta_context_flags import (
    average_daily_value_profile,
    build_red_flags,
    count_distribution_days,
    detect_ma_whipsaw,
    enrich_red_flags,
    idx_price_limit_proximity,
    normalize_red_flags,
)
from ta_context_location import (
    baseline_ma_payload,
    build_value_area,
    classify_liquidity_sweep,
    derive_internal_liquidity_levels,
    find_equal_liquidity_clusters,
    infer_location_state,
    remap_liquidity_draws,
    round_level_payload,
    split_support_resistance,
)
from ta_context_setup import select_setup
from ta_context_state import (
    base_quality,
    build_intent,
    breakout_displacement,
    breakout_snapshot,
    infer_state,
    nearest_round_levels,
    normalize_structure_status,
    role_reversal,
    time_based_opens,
    vpvr_core,
)
from wyckoff_state import build_wyckoff_state


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build deterministic technical-analysis context from OHLCV JSON."
    )
    parser.add_argument(
        "--input",
        required=True,
        help="Input JSON path (must match fetch-ohlcv output_path).",
    )
    parser.add_argument("--symbol", required=True, help="Ticker symbol, e.g. BBCA.")
    parser.add_argument("--outdir", default="work", help="Output directory.")
    parser.add_argument(
        "--output", default=None, help="Optional explicit output JSON path."
    )
    parser.add_argument(
        "--modules",
        default="core",
        help="Comma-separated modules: core,vpvr,breakout or all.",
    )
    parser.add_argument(
        "--purpose-mode",
        choices=["INITIAL", "UPDATE", "POSTMORTEM"],
        default="INITIAL",
        help="Runtime purpose mode.",
    )
    parser.add_argument(
        "--position-state",
        choices=["flat", "long"],
        default="flat",
        help="Current position state.",
    )
    parser.add_argument(
        "--min-rr-required",
        type=float,
        default=1.2,
        help="Minimum reward-to-risk required for an actionable plan.",
    )
    parser.add_argument(
        "--prior-thesis-json",
        default=None,
        help="Optional JSON file for prior thesis context. Required for UPDATE and POSTMORTEM.",
    )
    parser.add_argument(
        "--thesis-status",
        choices=["intact", "improving", "degrading", "invalidated"],
        default=None,
        help="Required when purpose-mode is UPDATE.",
    )
    parser.add_argument(
        "--review-reason",
        choices=[
            "routine",
            "contradiction",
            "level_break",
            "regime_change",
            "trigger_failure",
        ],
        default=None,
        help="Required when purpose-mode is UPDATE.",
    )
    parser.add_argument(
        "--swing-n", type=int, default=2, help="Swing pivot lookback (default 2)."
    )
    parser.add_argument(
        "--ihsg-regime",
        type=float,
        default=None,
        help="IHSG regime score (0.0-1.0). When provided, breakout setup scores are mechanically modified.",
    )
    return parser.parse_args()


def parse_modules(raw: str) -> set[str]:
    out = {value.strip().lower() for value in raw.split(",") if value.strip()}
    if not out:
        out = {"core"}
    if "all" in out:
        return {"core", "vpvr", "breakout"}
    out.add("core")
    return out


def load_prior_thesis(path_str: str | None) -> dict[str, Any] | None:
    if not path_str:
        return None
    path = Path(path_str).expanduser().resolve()
    with path.open("r", encoding="utf-8") as f:
        raw = json.load(f)
    if not isinstance(raw, dict):
        raise ValueError("prior thesis JSON must be an object")
    return raw


def validate_runtime_requirements(
    purpose_mode: str,
    prior_thesis_json: str | None,
    thesis_status: str | None,
    review_reason: str | None,
) -> None:
    if purpose_mode in {"UPDATE", "POSTMORTEM"} and not prior_thesis_json:
        raise ValueError("prior thesis context is required for UPDATE and POSTMORTEM")
    if purpose_mode == "UPDATE" and (
        thesis_status is None or review_reason is None
    ):
        raise ValueError("thesis-status and review-reason are required for UPDATE")


def build_ta_context_result(
    *,
    symbol: str,
    daily: pd.DataFrame,
    intraday_1m: pd.DataFrame,
    intraday: pd.DataFrame,
    modules: set[str],
    purpose_mode: str,
    position_state: str,
    min_rr_required: float,
    prior_thesis: dict[str, Any] | None,
    thesis_status: str | None = None,
    review_reason: str | None = None,
    swing_n: int = 2,
    timeframe_mode: str = "full",
    ihsg_regime: float | None = None,
) -> dict[str, Any]:
    daily = add_ma_stack(daily)
    daily = add_atr14(daily)
    daily = add_swings(daily, n=swing_n)
    daily = add_volume_features(daily)

    events = detect_structure_events(daily)
    last_labels = [event["label"] for event in events[-4:]]
    choch_triggered = "CHOCH" in last_labels
    bos_confirmed = choch_triggered and ("BOS" in last_labels)

    swings_h = daily[daily["swing_high"].notna()][["datetime", "swing_high"]].tail(4)
    swings_l = daily[daily["swing_low"].notna()][["datetime", "swing_low"]].tail(4)
    if len(swings_h) >= 2 and len(swings_l) >= 2:
        hh = swings_h["swing_high"].iloc[-1] > swings_h["swing_high"].iloc[-2]
        hl = swings_l["swing_low"].iloc[-1] > swings_l["swing_low"].iloc[-2]
        lh = swings_h["swing_high"].iloc[-1] < swings_h["swing_high"].iloc[-2]
        ll = swings_l["swing_low"].iloc[-1] < swings_l["swing_low"].iloc[-2]
        if hh and hl:
            prelim_bias = "bullish"
        elif lh and ll:
            prelim_bias = "bearish"
        else:
            prelim_bias = mixed_swing_ma_bias(
                daily.iloc[-1], hh=hh, hl=hl, lh=lh, ll=ll
            )
    else:
        prelim_bias = "neutral"

    structure_state_value = structure_status(prelim_bias, choch_triggered, bos_confirmed)
    regime = classify_regime(daily, structure_status_val=structure_state_value)
    normalized_structure = normalize_structure_status(
        structure_state_value, regime["regime"], regime["trend_bias"]
    )

    levels = derive_levels(daily)
    last = daily.iloc[-1]
    last_open = float(last["open"])
    last_high = float(last["high"])
    last_low = float(last["low"])
    last_close = float(last["close"])
    prev_close = float(daily.iloc[-2]["close"]) if len(daily) > 1 else None
    posture = baseline_ma_payload(last)
    adaptive_ma = choose_adaptive_ma(daily)
    ma_whipsaw_flags = detect_ma_whipsaw(
        daily,
        adaptive_period=(
            int(adaptive_ma["adaptive_period"])
            if adaptive_ma.get("adaptive_period") is not None
            else None
        ),
    )
    liquidity_profile = average_daily_value_profile(daily, window=20)
    price_limit_proximity = (
        idx_price_limit_proximity(
            prev_close=float(prev_close),
            last_high=last_high,
            last_low=last_low,
            last_close=last_close,
        )
        if prev_close is not None
        else None
    )
    vp_base = vpvr_core(daily.tail(260))
    value_area = build_value_area(vp_base, last_close, prev_close)

    state, _state_reason = infer_state(
        last_close,
        float(vp_base["val"]) if vp_base["val"] is not None else last_close,
        float(vp_base["vah"]) if vp_base["vah"] is not None else last_close,
        follow_close=prev_close,
    )

    wyckoff_state = build_wyckoff_state(daily)
    dist_days = count_distribution_days(daily, window=20)

    nearest_mid = levels[-1]["zone_mid"] if levels else last_close
    role_reversal_note = role_reversal(
        last_close, float(nearest_mid), was_support=(regime["trend_bias"] == "bullish")
    )
    breakout_snapshot_value = breakout_snapshot(daily, levels)
    breakout_displacement_value = (
        breakout_displacement(
            daily,
            level=float(
                breakout_snapshot_value.get("up_level")
                or breakout_snapshot_value.get("down_level")
                or last_close
            ),
            side=breakout_snapshot_value.get("side") or "up",
        )
        if breakout_snapshot_value.get("status") in {"valid_breakout", "weak_breakout"}
        else None
    )
    spring = detect_wyckoff_spring(
        daily, events, str(wyckoff_state["current_cycle_phase"])
    )
    supports, resistances = split_support_resistance(levels, last_close)
    location_state = infer_location_state(
        last_close, regime["trend_bias"], regime["regime"], supports, resistances
    )
    intraday_timing = (
        build_disabled_intraday_timing(mode="daily_only")
        if timeframe_mode == "daily_only"
        else build_intraday_timing(intraday, intraday_1m, regime["trend_bias"])
    )
    setup_selection = select_setup(
        regime=regime["regime"],
        trend_bias=regime["trend_bias"],
        breakout_state=breakout_snapshot_value.get("status", "no_breakout"),
        structure_state=structure_state_value,
        spring_confirmed=bool(spring.get("detected", False)),
        location_state=location_state,
        intraday_timing=intraday_timing,
        supports=supports,
        displacement=breakout_displacement_value,
        ihsg_regime=ihsg_regime,
    )
    setup_id = str(setup_selection["primary_setup"])
    risk_map = build_risk_map(
        setup_id=setup_id,
        position_state=position_state,
        close_price=last_close,
        atr14=float(last.get("ATR14", 0.0) or 0.0),
        location_state=location_state,
        supports=supports,
        resistances=resistances,
        min_rr_required=min_rr_required,
        breakout=breakout_snapshot_value,
    )
    trade_management = build_trade_management(
        setup_id=setup_id,
        position_state=position_state,
        close_price=last_close,
        atr14=float(last.get("ATR14", 0.0) or 0.0),
        ema21=float(last.get("EMA21", last_close)),
        state=state,
        regime=str(regime["regime"]),
        structure_status=normalized_structure,
        current_cycle_phase=str(wyckoff_state["current_cycle_phase"]),
        maturity=str(wyckoff_state["wyckoff_current_maturity"]),
        wyckoff_history=list(wyckoff_state["wyckoff_history"]),
        value_acceptance_state=str(value_area["acceptance_state"]),
        supports=supports,
        daily=daily,
        risk_map=risk_map,
        prior_thesis=prior_thesis,
    )

    # Price change overview (1d, 7d, 30d, 90d) — computed early so F18 can use it
    price_changes: dict[str, Any] = {}
    for label, lookback in [("1d", 1), ("7d", 7), ("30d", 30), ("90d", 90)]:
        if len(daily) > lookback:
            ref = float(daily.iloc[-(lookback + 1)]["close"])
            pct = round((last_close - ref) / ref * 100, 2)
            price_changes[label] = {"from": ref, "to": last_close, "pct": pct}

    max_touches = max((level["touches"] for level in levels), default=0)
    red_flags = build_red_flags(
        regime=regime["regime"],
        breakout_state=breakout_snapshot_value.get("status", "no_breakout"),
        level_touches=max_touches,
        structure_state=structure_state_value,
        last_close=last_close,
        ema21=float(last.get("EMA21", last_close)),
        sma50=float(last.get("SMA50", last_close)),
        position_state=position_state,
        risk_status=str(risk_map["risk_status"]),
        distribution_day_count=dist_days["count"],
        liquidity_category=(
            str(liquidity_profile["category"])
            if isinstance(liquidity_profile, dict)
            else None
        ),
        price_limit_proximity=(
            str(price_limit_proximity["state"])
            if isinstance(price_limit_proximity, dict)
            else None
        ),
        price_limit_proximity_mode=(
            str(price_limit_proximity["mode"])
            if isinstance(price_limit_proximity, dict)
            else None
        ),
        breakout_displacement_state=breakout_displacement_value,
        ma_whipsaw_flags=ma_whipsaw_flags,
        price_change_30d_pct=(
            float(price_changes["30d"]["pct"])
            if "30d" in price_changes
            else None
        ),
        daily_df=daily,
    )

    external_levels = [float(level["zone_mid"]) for level in levels]
    internal_levels = derive_internal_liquidity_levels(daily, last_close, external_levels)
    liquidity = liquidity_draws(last_close, levels, internal_levels=internal_levels)
    liquidity["draw_targets"] = pick_draw_targets(external_levels, internal_levels, last_close)
    equal_liquidity = find_equal_liquidity_clusters(
        daily, float(last.get("ATR14", 0.0) or 0.0)
    )
    trendlines = detect_trendline_levels(daily)
    sweep_events = detect_sweep_events(
        daily,
        eqh_levels=equal_liquidity["eqh_levels"],
        eql_levels=equal_liquidity["eql_levels"],
        internal_levels=internal_levels,
        trendlines=trendlines,
    )
    sweep_event, sweep_outcome_value, event_type, sweep_side = classify_liquidity_sweep(
        sweep_events=sweep_events
    )
    remap_liquidity_draws(
        liq=liquidity,
        event_scope=event_type,
        sweep_outcome_value=sweep_outcome_value,
        sweep_side=sweep_side,
    )
    liquidity["sweep_event"] = sweep_event
    liquidity["sweep_outcome"] = sweep_outcome_value
    liquidity["liquidity_path"] = liquidity_path_after_event(
        event_type, sweep_outcome_value
    )

    breakout_result = None
    if "breakout" in modules:
        breakout_result = breakout_snapshot(daily, levels)
        latest = add_volume_features(daily).iloc[-1]
        breakout_result["price_volume_class"] = classify_price_volume(
            float(latest.get("ret", 0.0) or 0.0),
            float(latest.get("vol_ratio", 1.0) or 1.0),
        )
        breakout_result["base_quality"] = base_quality(daily.tail(35))
        if breakout_displacement_value is not None:
            breakout_result["displacement"] = breakout_displacement_value

    trigger_confirmation = build_trigger_confirmation(
        setup_id=setup_id,
        breakout=breakout_result or breakout_snapshot_value,
        raw_structure_status=structure_state_value,
        spring=spring,
        events=events,
        regime=regime["regime"],
        value_acceptance_state=value_area["acceptance_state"],
        displacement=breakout_displacement_value,
        intraday_timing=intraday_timing,
        location_state=location_state,
        supports=supports,
        resistances=resistances,
        last_open=last_open,
        last_high=last_high,
        last_low=last_low,
        last_close=last_close,
        prev_close=prev_close,
        ema21=float(last.get("EMA21", last_close)),
        latest_event_age_bars=(
            int((daily["datetime"] > pd.Timestamp(events[-1]["datetime"])).sum())
            if events
            else None
        ),
    )

    if prior_thesis is None and purpose_mode in {"UPDATE", "POSTMORTEM"}:
        raise ValueError("prior thesis context is required")

    enriched_red_flags = enrich_red_flags(
        red_flags=red_flags,
        last_close=last_close,
        regime=regime["regime"],
        levels=levels,
        modules=modules,
        liquidity=liquidity,
        vpvr={
            "poc": value_area["poc"],
            "vah": value_area["vah"],
            "val": value_area["val"],
        },
        breakout=breakout_result,
    )

    analysis_payload: dict[str, Any] = {
        "symbol": symbol,
        "as_of_date": str(daily["datetime"].iloc[-1].date()),
        "purpose_mode": purpose_mode,
        "intent": build_intent(purpose_mode, position_state),
        "position_state": position_state,
        "daily_timeframe": "1d",
        "min_rr_required": float(min_rr_required),
        "price_changes": price_changes,
    }
    if ihsg_regime is not None:
        _rbm = 1.0
        if ihsg_regime >= 0.50:
            _rbm = 1.0
        elif ihsg_regime >= 0.35:
            _rbm = 0.7
        else:
            _rbm = 0.4
        analysis_payload["ihsg_regime"] = round(float(ihsg_regime), 4)
        analysis_payload["regime_breakout_modifier"] = _rbm
    if timeframe_mode == "daily_only":
        analysis_payload["timeframe_mode"] = "daily_only"
    else:
        analysis_payload["intraday_timeframe"] = "15m"
        analysis_payload["intraday_source_timeframe"] = "1m"

    result: dict[str, Any] = {
        "analysis": analysis_payload,
        "daily_thesis": {
            "state": state,
            "regime": regime["regime"],
            "trend_bias": regime["trend_bias"],
            "structure_status": normalized_structure,
            "current_cycle_phase": str(wyckoff_state["current_cycle_phase"]),
            "current_wyckoff_phase": str(wyckoff_state["current_wyckoff_phase"]),
            "wyckoff_current_confidence": int(
                wyckoff_state["wyckoff_current_confidence"]
            ),
            "wyckoff_current_maturity": str(
                wyckoff_state["wyckoff_current_maturity"]
            ),
            "wyckoff_history": list(wyckoff_state["wyckoff_history"]),
            "baseline_ma_posture": posture,
        },
        "intraday_timing": intraday_timing,
        "location": {
            "location_state": location_state,
            "support_zones": supports,
            "resistance_zones": resistances,
            "value_area": value_area,
            "liquidity_map": {
                "current_draw": liquidity.get("current_draw"),
                "opposing_draw": liquidity.get("opposing_draw"),
                "last_sweep_type": liquidity.get("sweep_event", "none"),
                "last_sweep_outcome": liquidity.get("sweep_outcome", "unresolved"),
                "path_state": liquidity.get("liquidity_path", "unclear"),
                **(
                    {"last_sweep_side": sweep_side}
                    if sweep_side in {"up", "down"}
                    else {}
                ),
            },
            "time_levels": time_based_opens(daily),
            "round_levels": round_level_payload(nearest_round_levels(last_close)),
        },
        "setup": {
            "primary_setup": setup_id,
            "candidate_setups": list(setup_selection["candidate_setups"]),
            "candidate_evaluations": list(setup_selection["candidate_evaluations"]),
            "setup_side": "long" if setup_id != "NO_VALID_SETUP" else "neutral",
            "setup_validity": (
                "invalid"
                if setup_id == "NO_VALID_SETUP"
                else "valid"
                if (
                    str(setup_selection["setup_validity"]) == "valid"
                    and trigger_confirmation["trigger_state"] == "triggered"
                )
                else "watchlist_only"
            ),
            "setup_drivers": list(
                dict.fromkeys(
                    value
                    for value in list(setup_selection["setup_drivers"]) + [role_reversal_note]
                    if value
                )
            ),
        },
        "trigger_confirmation": trigger_confirmation,
        "risk_map": risk_map,
        "red_flags": normalize_red_flags(enriched_red_flags),
    }
    # Trend persistence bonus: when markup is confirmed and sustained,
    # surface a bonus so the LLM skill can distinguish "hold/trail" from "add".
    _wyckoff_phase = str(wyckoff_state["current_cycle_phase"])
    _wyckoff_conf = int(wyckoff_state["wyckoff_current_confidence"])
    _wyckoff_history = list(wyckoff_state["wyckoff_history"])
    _current_seg = _wyckoff_history[-1] if _wyckoff_history else None
    _markup_duration = int(_current_seg["duration_bars"]) if _current_seg else 0
    if _wyckoff_phase == "markup" and _wyckoff_conf > 75 and _markup_duration > 10:
        bonus = 8 if _markup_duration > 20 else 5
        result["daily_thesis"]["trend_persistence_bonus"] = {
            "bonus": bonus,
            "markup_duration_bars": _markup_duration,
            "markup_confidence": _wyckoff_conf,
        }
    # Trend health: when markup is strong but no valid entry setup exists,
    # annotate so the LLM skill reads the score as "hold quality" not
    # "position deteriorating".
    if (
        _wyckoff_phase == "markup"
        and _wyckoff_conf > 75
        and setup_id == "NO_VALID_SETUP"
    ):
        result["daily_thesis"]["trend_health"] = {
            "phase": "markup",
            "confidence": _wyckoff_conf,
            "duration_bars": _markup_duration,
            "all_mas_below": bool(
                posture.get("above_ema21", False)
                and posture.get("above_sma50", False)
            ),
            "annotation": "trend_intact_no_entry_setup",
        }
    if trade_management is not None:
        result["trade_management"] = trade_management

    if purpose_mode == "UPDATE":
        result["analysis"]["thesis_status"] = str(thesis_status)
        result["analysis"]["review_reason"] = str(review_reason)
    if adaptive_ma.get("adaptive_period") is not None:
        adaptive_details = (
            adaptive_ma.get("details")
            if isinstance(adaptive_ma.get("details"), dict)
            else {}
        )
        justification_bits = [
            f"touches={int(adaptive_details.get('touch_count', 0))}",
            f"reclaims={int(adaptive_details.get('reclaim_count', 0))}",
            f"whipsaws={int(adaptive_details.get('whipsaw_count', 0))}",
        ]
        result["daily_thesis"]["adaptive_ma"] = {
            "period": int(adaptive_ma["adaptive_period"]),
            "ma_type": "sma",
            "respect_score": float(adaptive_ma["score"]),
            "role": "timing_refinement",
            "justification": ",".join(justification_bits),
        }
    if prior_thesis is not None:
        result["prior_thesis"] = prior_thesis

    return result


def main() -> None:
    from ta_common import load_ohlcv

    args = parse_args()
    modules = parse_modules(args.modules)
    symbol = args.symbol.strip().upper()

    validate_runtime_requirements(
        purpose_mode=args.purpose_mode,
        prior_thesis_json=args.prior_thesis_json,
        thesis_status=args.thesis_status,
        review_reason=args.review_reason,
    )

    input_path = Path(args.input).expanduser().resolve()
    outdir = Path(args.outdir).expanduser().resolve()
    outdir.mkdir(parents=True, exist_ok=True)

    daily, intraday_1m, intraday, _corp = load_ohlcv(input_path)
    prior_thesis = load_prior_thesis(args.prior_thesis_json)
    result = build_ta_context_result(
        symbol=symbol,
        daily=daily,
        intraday_1m=intraday_1m,
        intraday=intraday,
        modules=modules,
        purpose_mode=args.purpose_mode,
        position_state=args.position_state,
        min_rr_required=args.min_rr_required,
        prior_thesis=prior_thesis,
        thesis_status=args.thesis_status,
        review_reason=args.review_reason,
        swing_n=args.swing_n,
        timeframe_mode="full",
        ihsg_regime=args.ihsg_regime,
    )

    output_path = (
        Path(args.output).expanduser().resolve()
        if args.output
        else outdir / f"{symbol}_ta_context.json"
    )
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    print(json.dumps({"ok": True, "output": str(output_path)}, indent=2))


if __name__ == "__main__":
    main()
