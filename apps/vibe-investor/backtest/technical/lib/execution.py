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
) -> OpenPosition:
    stop_level, target_level, notes = build_position_levels(context, entry_price)
    return OpenPosition(
        entry_date=entry_date, entry_price=float(entry_price), size=float(size),
        setup_id=setup_id, stop_level=stop_level, target_level=target_level,
        source=source, notes=notes,
    )


def open_position_plain(
    *, entry_date: str, entry_price: float, size: float,
    setup_id: str, source: str, notes: list[str] | None = None,
) -> OpenPosition:
    return OpenPosition(
        entry_date=entry_date, entry_price=float(entry_price), size=float(size),
        setup_id=setup_id, source=source, notes=list(notes or []),
    )


def close_position(
    position: OpenPosition, *, exit_date: str, exit_price: float,
    exit_reason: str, extra_notes: list[str] | None = None,
) -> ClosedTrade:
    notes = list(position.notes)
    if extra_notes:
        notes.extend(extra_notes)
    pnl = (float(exit_price) - position.entry_price) * position.size
    invested = position.entry_price * position.size
    return_pct = (pnl / invested) if invested > 0 else 0.0
    return ClosedTrade(
        entry_date=position.entry_date, entry_price=position.entry_price,
        exit_date=exit_date, exit_price=float(exit_price), size=position.size,
        setup_id=position.setup_id, exit_reason=exit_reason,
        pnl=float(pnl), return_pct=float(return_pct),
        source=position.source, notes=notes,
    )


def process_intrabar_exit(
    position: OpenPosition, *, trade_date: str,
    open_price: float, high_price: float, low_price: float,
) -> tuple[ClosedTrade | None, str | None]:
    stop = position.stop_level
    target = position.target_level
    stop_gap = stop is not None and open_price <= stop
    target_gap = target is not None and open_price >= target
    stop_hit = stop is not None and low_price <= stop
    target_hit = target is not None and high_price >= target

    if stop_hit and target_hit:
        price = open_price if stop_gap else float(stop)
        return close_position(
            position, exit_date=trade_date, exit_price=price,
            exit_reason="stop_hit_same_bar_ambiguity",
            extra_notes=["same_bar_ambiguity_stop_wins"],
        ), "stop_and_target_same_bar"
    if stop_hit:
        price = open_price if stop_gap else float(stop)
        return close_position(
            position, exit_date=trade_date, exit_price=price,
            exit_reason="stop_hit",
            extra_notes=["gap_through_stop"] if stop_gap else None,
        ), "stop_hit"
    if target_hit:
        price = open_price if target_gap else float(target)
        return close_position(
            position, exit_date=trade_date, exit_price=price,
            exit_reason="target_hit",
            extra_notes=["gap_through_target"] if target_gap else None,
        ), "target_hit"
    return None, None


def pending_setup_expired(pending: PendingSetup, current_index: int) -> bool:
    return (current_index - pending.start_index) >= pending.expiry_bars
