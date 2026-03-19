"""Execution helpers for daily-only technical backtests."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class PendingSetup:
    setup_id: str
    start_index: int
    first_seen_date: str
    expiry_bars: int
    reason: str


@dataclass
class PendingOrder:
    side: str
    signal_index: int
    signal_date: str
    intended_entry_date: str
    reason: str
    setup_id: str


@dataclass
class OpenPosition:
    entry_date: str
    entry_price: float
    size: float
    setup_id: str
    stop_level: float | None = None
    target_level: float | None = None
    trail_mode: str = "STRUCTURE"
    trail_anchor: float | None = None
    tranches: list["PositionTranche"] = field(default_factory=list)
    profit_state: str = "PRE_T1"
    bars_since_entry: int = 0
    bars_since_last_high: int = 0
    time_stop_pre_t1: int | None = None
    time_stop_post_t1_no_new_high: int | None = None
    highest_high: float | None = None
    source: str = "simulated_entry"
    notes: list[str] = field(default_factory=list)


@dataclass
class PositionTranche:
    size_pct: float
    target_level: float | None
    target_id: str
    filled: bool = False


@dataclass
class ClosedTrade:
    entry_date: str
    entry_price: float
    exit_date: str
    exit_price: float
    size: float
    setup_id: str
    exit_reason: str
    pnl: float
    return_pct: float
    source: str
    notes: list[str]
    partial: bool = False
    tranche_id: str | None = None


def build_position_levels(
    context: dict[str, Any], entry_price: float,
) -> tuple[float | None, float | None, list[str]]:
    risk_map = context.get("risk_map", {})
    notes: list[str] = []
    stop = risk_map.get("stop_level")
    if not isinstance(stop, (int, float)):
        stop = None
        notes.append("no_stop_level_from_context")
    else:
        stop = float(stop)
    target = risk_map.get("next_zone_target")
    if not isinstance(target, (int, float)):
        target = None
        notes.append("no_target_level_from_context")
    else:
        target = float(target)
    if stop is not None and stop >= entry_price:
        stop = None
        notes.append("invalid_stop_level_dropped")
    if target is not None and target <= entry_price:
        target = None
        notes.append("invalid_target_level_dropped")
    return stop, target, notes


def open_position_from_context(
    *, entry_date: str, entry_price: float, size: float,
    setup_id: str, context: dict[str, Any], source: str,
    enable_trade_management: bool = False,
) -> OpenPosition:
    stop_level, target_level, notes = build_position_levels(context, entry_price)
    trade_management = context.get("trade_management", {})
    technical_plan = (
        trade_management.get("technical_plan", {})
        if isinstance(trade_management, dict)
        else {}
    )
    time_stop = (
        technical_plan.get("time_stop", {})
        if isinstance(technical_plan, dict)
        else {}
    )
    technical_state = (
        trade_management.get("technical_state", {})
        if isinstance(trade_management, dict)
        else {}
    )
    tranches = (
        build_tranches_from_context(context) if enable_trade_management else []
    )
    return OpenPosition(
        entry_date=entry_date, entry_price=float(entry_price), size=float(size),
        setup_id=setup_id, stop_level=stop_level, target_level=target_level,
        trail_mode=str(technical_plan.get("trail_mode", "STRUCTURE")),
        trail_anchor=(
            float(technical_state["active_trail_anchor_price"])
            if isinstance(technical_state.get("active_trail_anchor_price"), (int, float))
            else stop_level
        ),
        tranches=tranches,
        profit_state=str(technical_state.get("profit_state", "PRE_T1")),
        time_stop_pre_t1=(
            int(time_stop["max_sessions_pre_t1"])
            if isinstance(time_stop.get("max_sessions_pre_t1"), int)
            else None
        ),
        time_stop_post_t1_no_new_high=(
            int(time_stop["max_sessions_post_t1_no_new_high"])
            if isinstance(time_stop.get("max_sessions_post_t1_no_new_high"), int)
            else None
        ),
        highest_high=float(entry_price),
        source=source, notes=notes,
    )


def open_position_plain(
    *, entry_date: str, entry_price: float, size: float,
    setup_id: str, source: str, notes: list[str] | None = None,
) -> OpenPosition:
    return OpenPosition(
        entry_date=entry_date, entry_price=float(entry_price), size=float(size),
        setup_id=setup_id, highest_high=float(entry_price),
        source=source, notes=list(notes or []),
    )


def close_position(
    position: OpenPosition, *, exit_date: str, exit_price: float,
    exit_reason: str, extra_notes: list[str] | None = None,
    size: float | None = None, partial: bool = False, tranche_id: str | None = None,
) -> ClosedTrade:
    notes = list(position.notes)
    if extra_notes:
        notes.extend(extra_notes)
    trade_size = float(size if size is not None else position.size)
    pnl = (float(exit_price) - position.entry_price) * trade_size
    invested = position.entry_price * trade_size
    return_pct = (pnl / invested) if invested > 0 else 0.0
    return ClosedTrade(
        entry_date=position.entry_date, entry_price=position.entry_price,
        exit_date=exit_date, exit_price=float(exit_price), size=trade_size,
        setup_id=position.setup_id, exit_reason=exit_reason,
        pnl=float(pnl), return_pct=float(return_pct),
        source=position.source, notes=notes, partial=partial, tranche_id=tranche_id,
    )


def remaining_position_size(position: OpenPosition) -> float:
    if not position.tranches:
        return float(position.size)
    remaining_pct = sum(
        float(tranche.size_pct)
        for tranche in position.tranches
        if not tranche.filled
    )
    return float(position.size * (remaining_pct / 100.0))


def build_tranches_from_context(context: dict[str, Any]) -> list[PositionTranche]:
    trade_management = context.get("trade_management", {})
    if not isinstance(trade_management, dict):
        return []
    technical_plan = trade_management.get("technical_plan", {})
    if not isinstance(technical_plan, dict):
        return []
    partial_plan = technical_plan.get("partial_plan", [])
    if not isinstance(partial_plan, list):
        return []
    tranches: list[PositionTranche] = []
    for item in partial_plan:
        if not isinstance(item, dict):
            continue
        target_id = str(item.get("target_id", ""))
        size_pct = item.get("size_pct")
        if target_id not in {"T1", "T2", "T3"} or not isinstance(size_pct, (int, float)):
            continue
        raw_level = item.get("level")
        level = float(raw_level) if isinstance(raw_level, (int, float)) else None
        tranches.append(
            PositionTranche(
                size_pct=float(size_pct),
                target_level=level,
                target_id=target_id,
            )
        )
    return tranches


def active_target_levels(position: OpenPosition) -> list[float]:
    if position.tranches:
        return [
            float(tranche.target_level)
            for tranche in position.tranches
            if not tranche.filled and tranche.target_level is not None
        ]
    if position.target_level is not None:
        return [float(position.target_level)]
    return []


def process_intrabar_stop(
    position: OpenPosition, *, trade_date: str,
    open_price: float, high_price: float, low_price: float,
    active_targets: list[float] | None = None,
) -> tuple[ClosedTrade | None, str | None]:
    stop = position.stop_level
    targets = list(active_targets or active_target_levels(position))
    stop_gap = stop is not None and open_price <= stop
    target_gap = bool(targets) and open_price >= min(targets)
    stop_hit = stop is not None and low_price <= stop
    target_hit = bool(targets) and high_price >= min(targets)

    if stop_hit and target_hit:
        price = open_price if stop_gap else float(stop)
        return close_position(
            position, exit_date=trade_date, exit_price=price,
            exit_reason="stop_hit_same_bar_ambiguity",
            extra_notes=["same_bar_ambiguity_stop_wins"],
            size=remaining_position_size(position),
        ), "stop_and_target_same_bar"
    if stop_hit:
        price = open_price if stop_gap else float(stop)
        return close_position(
            position, exit_date=trade_date, exit_price=price,
            exit_reason="stop_hit",
            extra_notes=["gap_through_stop"] if stop_gap else None,
            size=remaining_position_size(position),
        ), "stop_hit"
    if target_hit and not position.tranches:
        target = min(targets)
        price = open_price if target_gap else float(target)
        return close_position(
            position, exit_date=trade_date, exit_price=price,
            exit_reason="target_hit",
            extra_notes=["gap_through_target"] if target_gap else None,
        ), "target_hit"
    return None, None


def process_intrabar_exit(
    position: OpenPosition, *, trade_date: str,
    open_price: float, high_price: float, low_price: float,
) -> tuple[ClosedTrade | None, str | None]:
    return process_intrabar_stop(
        position,
        trade_date=trade_date,
        open_price=open_price,
        high_price=high_price,
        low_price=low_price,
        active_targets=None,
    )


def advance_profit_state(position: OpenPosition) -> str:
    if not position.tranches:
        return position.profit_state
    filled_ids = {tranche.target_id for tranche in position.tranches if tranche.filled}
    runner_only = any(
        tranche.target_id == "T3" and tranche.target_level is None and not tranche.filled
        for tranche in position.tranches
    )
    if {"T1", "T2"}.issubset(filled_ids) and runner_only:
        return "RUNNER_ONLY"
    if {"T1", "T2"}.issubset(filled_ids):
        return "POST_T2"
    if "T1" in filled_ids:
        return "POST_T1"
    return "PRE_T1"


def update_position_counters(position: OpenPosition, *, high_price: float) -> None:
    position.bars_since_entry += 1
    if position.highest_high is None or float(high_price) > float(position.highest_high):
        position.highest_high = float(high_price)
        position.bars_since_last_high = 0
        return
    position.bars_since_last_high += 1


def update_trailing_stop(position: OpenPosition, context: dict[str, Any]) -> float | None:
    trade_management = context.get("trade_management", {})
    if not isinstance(trade_management, dict):
        return position.stop_level
    technical_state = trade_management.get("technical_state", {})
    if not isinstance(technical_state, dict):
        return position.stop_level
    raw_anchor = technical_state.get("active_trail_anchor_price")
    if not isinstance(raw_anchor, (int, float)):
        return position.stop_level
    anchor = float(raw_anchor)
    # The long-context anchor is structural; the fill-aware floor comes from live position state.
    if position.profit_state in {"POST_T1", "POST_T2", "RUNNER_ONLY"}:
        anchor = max(anchor, position.entry_price)
    position.trail_anchor = anchor
    if position.stop_level is None:
        position.stop_level = anchor
    else:
        position.stop_level = max(float(position.stop_level), anchor)
    return position.stop_level


def process_partial_exits(
    position: OpenPosition, *, trade_date: str, open_price: float, high_price: float,
) -> list[ClosedTrade]:
    if not position.tranches:
        return []
    closed: list[ClosedTrade] = []
    for tranche in sorted(
        [tranche for tranche in position.tranches if not tranche.filled],
        key=lambda item: float(item.target_level) if item.target_level is not None else float("inf"),
    ):
        if tranche.target_level is None:
            continue
        if high_price < float(tranche.target_level):
            continue
        tranche_gap = open_price >= float(tranche.target_level)
        fill_price = open_price if tranche_gap else float(tranche.target_level)
        tranche.filled = True
        closed.append(
            close_position(
                position,
                exit_date=trade_date,
                exit_price=fill_price,
                exit_reason="target_hit",
                extra_notes=["gap_through_target"] if tranche_gap else None,
                size=position.size * (float(tranche.size_pct) / 100.0),
                partial=True,
                tranche_id=tranche.target_id,
            )
        )
        break
    position.profit_state = advance_profit_state(position)
    return closed


def pending_setup_expired(pending: PendingSetup, current_index: int) -> bool:
    return (current_index - pending.start_index) >= pending.expiry_bars
