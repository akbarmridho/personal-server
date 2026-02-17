#!/usr/bin/env python3

"""Compute derived portfolio metrics from a canonical input snapshot."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def _to_float(value: object) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def compute(snapshot: dict) -> dict:
    cash = _to_float(snapshot.get("cash"))
    positions = snapshot.get("positions", [])

    derived_positions = []
    total_market_value = 0.0
    total_cost = 0.0

    for position in positions:
        lots = _to_float(position.get("lots"))
        avg = _to_float(position.get("avg"))
        last = _to_float(position.get("last"))

        shares = lots * 100.0
        cost = shares * avg
        market_value = shares * last
        pnl = market_value - cost

        derived_positions.append(
            {
                "symbol": position.get("symbol"),
                "lots": lots,
                "shares": shares,
                "avg": avg,
                "last": last,
                "cost": cost,
                "market_value": market_value,
                "pnl": pnl,
            }
        )

        total_market_value += market_value
        total_cost += cost

    total_equity = cash + total_market_value
    for position in derived_positions:
        position["weight"] = (
            position["market_value"] / total_equity if total_equity > 0 else 0.0
        )

    top3_concentration = sum(
        position["weight"]
        for position in sorted(
            derived_positions, key=lambda item: item["weight"], reverse=True
        )[:3]
    )

    return {
        "as_of": snapshot.get("as_of"),
        "cash": cash,
        "total_cost": total_cost,
        "total_market_value": total_market_value,
        "total_equity": total_equity,
        "top3_concentration": top3_concentration,
        "positions": derived_positions,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Compute portfolio metrics from notes/portfolio_inputs/*.json"
    )
    parser.add_argument("input_path", help="Path to canonical portfolio input JSON")
    parser.add_argument(
        "--output",
        help="Optional path to write result JSON; defaults to stdout",
    )
    args = parser.parse_args()

    payload = json.loads(Path(args.input_path).read_text(encoding="utf-8"))
    result = compute(payload)

    formatted = json.dumps(result, indent=2, ensure_ascii=False)
    if args.output:
        Path(args.output).write_text(formatted + "\n", encoding="utf-8")
    else:
        print(formatted)


if __name__ == "__main__":
    main()
