#!/usr/bin/env python3
"""Execution helpers for daily-only technical backtests."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
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
    source: str = "simulated_entry"
    notes: list[str] = field(default_factory=list)


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


def build_position_levels(
    context: dict[str, Any],
    entry_price: float,
) -> tuple[float | None, float | None, list[str]]:
    risk_map = context.get("risk_map", {})
    notes: list[str] = []

    stop_level = risk_map.get("stop_level")
    if isinstance(stop_level, (int, float)):
        stop = float(stop_level)
    else:
        stop = None
        notes.append("no_stop_level_from_context")

    target_level = risk_map.get("next_zone_target")
    if isinstance(target_level, (int, float)):
        target = float(target_level)
    else:
        target = None
        notes.append("no_target_level_from_context")

    if stop is not None and stop >= entry_price:
        stop = None
        notes.append("invalid_stop_level_dropped")
    if target is not None and target <= entry_price:
        target = None
        notes.append("invalid_target_level_dropped")

    return stop, target, notes


def open_position_from_context(
    *,
    entry_date: str,
    entry_price: float,
    size: float,
    setup_id: str,
    context: dict[str, Any],
    source: str,
) -> OpenPosition:
    stop_level, target_level, notes = build_position_levels(
        context=context,
        entry_price=entry_price,
    )
    return OpenPosition(
        entry_date=entry_date,
        entry_price=float(entry_price),
        size=float(size),
        setup_id=setup_id,
        stop_level=stop_level,
        target_level=target_level,
        source=source,
        notes=notes,
    )


def close_position(
    position: OpenPosition,
    *,
    exit_date: str,
    exit_price: float,
    exit_reason: str,
    extra_notes: list[str] | None = None,
) -> ClosedTrade:
    notes = list(position.notes)
    if extra_notes:
        notes.extend(extra_notes)
    pnl = (float(exit_price) - position.entry_price) * position.size
    invested = position.entry_price * position.size
    return_pct = (pnl / invested) if invested > 0 else 0.0
    return ClosedTrade(
        entry_date=position.entry_date,
        entry_price=position.entry_price,
        exit_date=exit_date,
        exit_price=float(exit_price),
        size=position.size,
        setup_id=position.setup_id,
        exit_reason=exit_reason,
        pnl=float(pnl),
        return_pct=float(return_pct),
        source=position.source,
        notes=notes,
    )


def process_intrabar_exit(
    position: OpenPosition,
    *,
    trade_date: str,
    open_price: float,
    high_price: float,
    low_price: float,
) -> tuple[ClosedTrade | None, str | None]:
    stop = position.stop_level
    target = position.target_level

    stop_hit = stop is not None and low_price <= stop
    target_hit = target is not None and high_price >= target

    if stop_hit and target_hit:
        price = open_price if stop is not None and open_price <= stop else float(stop)
        closed = close_position(
            position,
            exit_date=trade_date,
            exit_price=price,
            exit_reason="stop_hit_same_bar_ambiguity",
            extra_notes=["same_bar_ambiguity_stop_wins"],
        )
        return closed, "stop_and_target_same_bar"

    if stop_hit:
        price = open_price if stop is not None and open_price <= stop else float(stop)
        closed = close_position(
            position,
            exit_date=trade_date,
            exit_price=price,
            exit_reason="stop_hit",
            extra_notes=["gap_through_stop"] if stop is not None and open_price <= stop else None,
        )
        return closed, "stop_hit"

    if target_hit:
        price = open_price if target is not None and open_price >= target else float(target)
        closed = close_position(
            position,
            exit_date=trade_date,
            exit_price=price,
            exit_reason="target_hit",
            extra_notes=["gap_through_target"] if target is not None and open_price >= target else None,
        )
        return closed, "target_hit"

    return None, None


def pending_setup_expired(pending: PendingSetup, current_index: int) -> bool:
    return (current_index - pending.start_index) >= pending.expiry_bars


def serialize_closed_trade(trade: ClosedTrade) -> dict[str, Any]:
    return asdict(trade)


def serialize_open_position(position: OpenPosition) -> dict[str, Any]:
    return asdict(position)


def serialize_pending_setup(pending: PendingSetup | None) -> dict[str, Any] | None:
    if pending is None:
        return None
    return asdict(pending)
