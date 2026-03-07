#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from portfolio_common import parse_stop_from_symbol_note, read_latest_portfolio, to_float


def build_checks(symbols_root: Path) -> dict[str, Any]:
    snapshot = read_latest_portfolio()
    equity = to_float(snapshot.get("equity"))
    positions = snapshot.get("positions", [])
    if not isinstance(positions, list):
        raise ValueError("positions must be an array")

    normalized_positions: list[dict[str, Any]] = []
    for raw in positions:
        if not isinstance(raw, dict):
            continue
        symbol = str(raw.get("symbol", "")).upper().strip()
        if not symbol:
            continue
        market_value = to_float(raw.get("market_value"))
        last = to_float(raw.get("last"))
        stop = parse_stop_from_symbol_note(symbols_root / f"{symbol}.md")
        weight = (market_value / equity) if equity > 0 else 0.0
        stop_triggered = stop is not None and last <= stop
        normalized_positions.append(
            {
                "symbol": symbol,
                "last": last,
                "stop": stop,
                "weight": weight,
                "market_value": market_value,
                "stop_triggered": stop_triggered,
            }
        )

    ordered = sorted(
        normalized_positions,
        key=lambda item: float(item["weight"]),
        reverse=True,
    )
    top3_concentration = sum(item["weight"] for item in ordered[:3])
    oversize_positions = [item for item in ordered if item["weight"] > 0.30]
    stop_hits = [item for item in ordered if item["stop_triggered"]]

    return {
        "as_of": snapshot.get("as_of"),
        "captured_at": snapshot.get("captured_at"),
        "equity": equity,
        "position_count": len(ordered),
        "top3_concentration": top3_concentration,
        "oversize_positions": oversize_positions,
        "stop_hits": stop_hits,
        "positions": ordered,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Run deterministic portfolio checks")
    parser.add_argument(
        "--symbols-root",
        default="memory/state/symbols",
        help="Path to symbol note directory used to extract stop/invalidation hints",
    )
    args = parser.parse_args()
    result = build_checks(Path(args.symbols_root).expanduser().resolve())
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
