#!/usr/bin/env python3
"""Scenario-manifest parser for daily-first technical backtest windows."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any


def _parse_date(value: Any, field_name: str) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be a YYYY-MM-DD string")
    try:
        parsed = date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError(f"{field_name} must be a valid YYYY-MM-DD date") from exc
    return parsed.isoformat()


def _require_string(raw: Any, field_name: str) -> str:
    if not isinstance(raw, str) or not raw.strip():
        raise ValueError(f"{field_name} must be a non-empty string")
    return raw.strip()


def _require_price(raw: Any, field_name: str) -> float:
    if not isinstance(raw, (int, float)) or isinstance(raw, bool):
        raise ValueError(f"{field_name} must be numeric")
    value = float(raw)
    if value <= 0:
        raise ValueError(f"{field_name} must be greater than 0")
    return value


def _validate_symbol(raw: Any, field_name: str = "symbol") -> str:
    symbol = _require_string(raw, field_name).upper()
    if len(symbol) != 4 or not symbol.isalpha():
        raise ValueError(f"{field_name} must be a 4-letter IDX ticker")
    return symbol


def _optional_string(raw: Any, field_name: str) -> str | None:
    if raw is None:
        return None
    return _require_string(raw, field_name)


@dataclass(frozen=True)
class InitialPosition:
    state: str
    entry_date: str | None = None
    entry_price: float | None = None
    size: float = 1.0


@dataclass(frozen=True)
class ActualTrade:
    entry_date: str | None = None
    entry_price: float | None = None
    exit_date: str | None = None
    exit_price: float | None = None
    notes: str | None = None


@dataclass(frozen=True)
class BacktestScenario:
    id: str
    symbol: str
    ohlcv_path: str
    window_start_date: str
    window_end_date: str
    initial_position: InitialPosition
    actual_trade: ActualTrade | None = None
    notes: str | None = None


@dataclass(frozen=True)
class BacktestManifest:
    scenarios: list[BacktestScenario]


def _validate_initial_position(raw: Any, scenario_id: str) -> InitialPosition:
    if not isinstance(raw, dict):
        raise ValueError(f"scenario {scenario_id}: initial_position must be an object")

    state = _require_string(
        raw.get("state"),
        f"scenario {scenario_id}: initial_position.state",
    )
    if state not in {"flat", "long"}:
        raise ValueError(
            f"scenario {scenario_id}: initial_position.state must be 'flat' or 'long'"
        )

    entry_date = None
    entry_price = None
    if state == "long":
        entry_date = _parse_date(
            raw.get("entry_date"),
            f"scenario {scenario_id}: initial_position.entry_date",
        )
        entry_price = _require_price(
            raw.get("entry_price"),
            f"scenario {scenario_id}: initial_position.entry_price",
        )

    size_raw = raw.get("size", 1)
    size = _require_price(size_raw, f"scenario {scenario_id}: initial_position.size")
    return InitialPosition(
        state=state,
        entry_date=entry_date,
        entry_price=entry_price,
        size=size,
    )


def _validate_actual_trade(raw: Any, scenario_id: str) -> ActualTrade:
    if not isinstance(raw, dict):
        raise ValueError(f"scenario {scenario_id}: actual_trade must be an object")

    entry_date = None
    entry_price = None
    exit_date = None
    exit_price = None

    if "entry_date" in raw or "entry_price" in raw:
        entry_date = _parse_date(
            raw.get("entry_date"),
            f"scenario {scenario_id}: actual_trade.entry_date",
        )
        entry_price = _require_price(
            raw.get("entry_price"),
            f"scenario {scenario_id}: actual_trade.entry_price",
        )

    if "exit_date" in raw or "exit_price" in raw:
        exit_date = _parse_date(
            raw.get("exit_date"),
            f"scenario {scenario_id}: actual_trade.exit_date",
        )
        exit_price = _require_price(
            raw.get("exit_price"),
            f"scenario {scenario_id}: actual_trade.exit_price",
        )

    if entry_date is None and exit_date is None:
        raise ValueError(
            f"scenario {scenario_id}: actual_trade must include entry_* or exit_* fields"
        )
    if entry_date is not None and exit_date is not None and exit_date < entry_date:
        raise ValueError(
            f"scenario {scenario_id}: actual_trade.exit_date must be on or after actual_trade.entry_date"
        )

    return ActualTrade(
        entry_date=entry_date,
        entry_price=entry_price,
        exit_date=exit_date,
        exit_price=exit_price,
        notes=_optional_string(
            raw.get("notes"),
            f"scenario {scenario_id}: actual_trade.notes",
        ),
    )


def _validate_scenario(
    raw: Any,
    manifest_dir: Path,
    check_files: bool,
) -> BacktestScenario:
    if not isinstance(raw, dict):
        raise ValueError("each scenario must be an object")

    scenario_id = _require_string(raw.get("id"), "scenario.id")
    symbol = _validate_symbol(raw.get("symbol"))
    ohlcv_path_raw = _require_string(
        raw.get("ohlcv_path"),
        f"scenario {scenario_id}: ohlcv_path",
    )
    ohlcv_path = Path(ohlcv_path_raw)
    resolved_ohlcv_path = (
        ohlcv_path if ohlcv_path.is_absolute() else (manifest_dir / ohlcv_path)
    ).resolve()
    if check_files and not resolved_ohlcv_path.is_file():
        raise ValueError(
            f"scenario {scenario_id}: ohlcv_path does not exist: {resolved_ohlcv_path}"
        )

    window_start_date = _parse_date(
        raw.get("window_start_date"),
        f"scenario {scenario_id}: window_start_date",
    )
    window_end_date = _parse_date(
        raw.get("window_end_date"),
        f"scenario {scenario_id}: window_end_date",
    )
    if window_end_date < window_start_date:
        raise ValueError(
            f"scenario {scenario_id}: window_end_date must be on or after window_start_date"
        )

    initial_position = _validate_initial_position(
        raw.get("initial_position"), scenario_id
    )
    if (
        initial_position.entry_date is not None
        and initial_position.entry_date > window_end_date
    ):
        raise ValueError(
            f"scenario {scenario_id}: initial_position.entry_date must be on or before window_end_date"
        )

    actual_trade = None
    if "actual_trade" in raw and raw.get("actual_trade") is not None:
        actual_trade = _validate_actual_trade(raw.get("actual_trade"), scenario_id)
        if (
            actual_trade.entry_date is not None
            and actual_trade.entry_date > window_end_date
        ):
            raise ValueError(
                f"scenario {scenario_id}: actual_trade.entry_date must be on or before window_end_date"
            )
        if (
            actual_trade.exit_date is not None
            and actual_trade.exit_date < window_start_date
        ):
            raise ValueError(
                f"scenario {scenario_id}: actual_trade.exit_date must be on or after window_start_date"
            )

    return BacktestScenario(
        id=scenario_id,
        symbol=symbol,
        ohlcv_path=str(resolved_ohlcv_path),
        window_start_date=window_start_date,
        window_end_date=window_end_date,
        initial_position=initial_position,
        actual_trade=actual_trade,
        notes=_optional_string(raw.get("notes"), f"scenario {scenario_id}: notes"),
    )


def load_backtest_manifest(
    manifest_path: Path,
    check_files: bool = False,
) -> BacktestManifest:
    with manifest_path.open("r", encoding="utf-8") as f:
        raw = json.load(f)

    if not isinstance(raw, dict):
        raise ValueError("manifest root must be an object")
    scenarios_raw = raw.get("scenarios")
    if not isinstance(scenarios_raw, list) or not scenarios_raw:
        raise ValueError("manifest.scenarios must be a non-empty array")

    manifest_dir = manifest_path.parent.resolve()
    scenarios: list[BacktestScenario] = []
    seen_ids: set[str] = set()
    for item in scenarios_raw:
        scenario = _validate_scenario(
            item,
            manifest_dir=manifest_dir,
            check_files=check_files,
        )
        if scenario.id in seen_ids:
            raise ValueError(f"duplicate scenario id: {scenario.id}")
        seen_ids.add(scenario.id)
        scenarios.append(scenario)
    return BacktestManifest(scenarios=scenarios)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate a daily-first technical backtest scenario manifest."
    )
    parser.add_argument("--input", required=True, help="Manifest JSON path.")
    parser.add_argument(
        "--check-files",
        action="store_true",
        help="Also require each scenario ohlcv_path to exist on disk.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    manifest_path = Path(args.input).expanduser().resolve()
    manifest = load_backtest_manifest(
        manifest_path=manifest_path,
        check_files=bool(args.check_files),
    )
    print(
        json.dumps(
            {
                "status": "ok",
                "manifest_path": str(manifest_path),
                "scenario_count": len(manifest.scenarios),
                "symbols": sorted({scenario.symbol for scenario in manifest.scenarios}),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
