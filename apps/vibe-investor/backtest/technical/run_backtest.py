#!/usr/bin/env python3
"""Daily-only replay runner for technical backtests."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from dataclasses import asdict
from pathlib import Path
from typing import Any

import pandas as pd

from backtest_manifest import (
    BacktestManifest,
    BacktestScenario,
    load_backtest_manifest,
)
from execution import (
    ClosedTrade,
    OpenPosition,
    PendingOrder,
    PendingSetup,
    close_position,
    open_position_from_context,
    pending_setup_expired,
    process_intrabar_exit,
    serialize_closed_trade,
    serialize_open_position,
    serialize_pending_setup,
)
from policy_ablation import PolicyDecision, evaluate_flat_policy, evaluate_long_policy


def _skill_script_dir() -> Path:
    return (
        Path(__file__).resolve().parents[2]
        / ".opencode-config"
        / "skills"
        / "technical-analysis"
        / "scripts"
    )


if str(_skill_script_dir()) not in sys.path:
    sys.path.insert(0, str(_skill_script_dir()))

from ta_common import load_ohlcv  # type: ignore[import-not-found]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run a daily-only technical backtest over scenario windows."
    )
    parser.add_argument("--manifest", required=True, help="Scenario manifest JSON path.")
    parser.add_argument("--outdir", required=True, help="Output directory.")
    parser.add_argument(
        "--modules",
        default="core,vpvr,breakout",
        help="Comma-separated modules passed to the daily TA context builder.",
    )
    parser.add_argument(
        "--min-rr-required",
        type=float,
        default=1.2,
        help="Minimum RR required for actionable entry context.",
    )
    parser.add_argument(
        "--check-files",
        action="store_true",
        help="Require every scenario OHLCV file to exist before starting.",
    )
    return parser.parse_args()


def _build_daily_context(
    *,
    python_executable: str,
    builder_path: Path,
    snapshot_path: Path,
    context_path: Path,
    symbol: str,
    modules: str,
    position_state: str,
    min_rr_required: float,
) -> dict[str, Any]:
    args = [
        python_executable,
        str(builder_path),
        "--input",
        str(snapshot_path),
        "--symbol",
        symbol,
        "--outdir",
        str(context_path.parent),
        "--output",
        str(context_path),
        "--modules",
        modules,
        "--position-state",
        position_state,
        "--min-rr-required",
        str(min_rr_required),
    ]
    subprocess.run(args, check=True, capture_output=True, text=True)
    with context_path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _daily_slice_to_payload(df: pd.DataFrame) -> dict[str, Any]:
    fields = [
        "timestamp",
        "datetime",
        "date",
        "open",
        "high",
        "low",
        "close",
        "volume",
        "value",
    ]
    rows: list[dict[str, Any]] = []
    for _, row in df.iterrows():
        item: dict[str, Any] = {}
        for field in fields:
            if field not in row.index or pd.isna(row[field]):
                continue
            value = row[field]
            if field == "datetime":
                item[field] = pd.Timestamp(value).isoformat()
            elif field == "date":
                item[field] = pd.Timestamp(value).date().isoformat()
            elif field == "timestamp":
                item[field] = int(value)
            elif field in {"open", "high", "low", "close", "volume", "value"}:
                item[field] = float(value)
            else:
                item[field] = value
        rows.append(item)
    return {"daily": rows, "corp_actions": []}


def _prepare_daily_frames(
    scenario: BacktestScenario,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    daily, intraday_1m, intraday, corp = load_ohlcv(
        Path(scenario.ohlcv_path),
        include_intraday=False,
    )
    daily = daily.copy()
    daily["date"] = pd.to_datetime(daily["datetime"]).dt.date
    window_start = pd.to_datetime(scenario.window_start_date).date()
    window_end = pd.to_datetime(scenario.window_end_date).date()

    history = daily[daily["date"] <= window_end].copy()
    window = history[(history["date"] >= window_start) & (history["date"] <= window_end)].copy()
    if window.empty:
        raise ValueError(f"scenario {scenario.id}: no daily bars inside replay window")
    if len(window) < 2:
        raise ValueError(f"scenario {scenario.id}: replay window needs at least 2 daily bars")
    if len(history) < len(window):
        raise ValueError(f"scenario {scenario.id}: clipped history is inconsistent")
    return history.reset_index(drop=True), window.reset_index(drop=True)


def _compute_actual_trade_summary(
    scenario: BacktestScenario,
) -> dict[str, Any] | None:
    actual = scenario.actual_trade
    if actual is None:
        return None

    entry_date = actual.entry_date or scenario.initial_position.entry_date
    entry_price = actual.entry_price or scenario.initial_position.entry_price
    exit_date = actual.exit_date
    exit_price = actual.exit_price
    if entry_date is None or entry_price is None or exit_date is None or exit_price is None:
        return {
            "status": "partial_reference",
            "entry_date": entry_date,
            "entry_price": entry_price,
            "exit_date": exit_date,
            "exit_price": exit_price,
            "notes": actual.notes,
        }
    pnl = (float(exit_price) - float(entry_price)) * float(scenario.initial_position.size)
    invested = float(entry_price) * float(scenario.initial_position.size)
    return {
        "status": "complete_reference",
        "entry_date": entry_date,
        "entry_price": float(entry_price),
        "exit_date": exit_date,
        "exit_price": float(exit_price),
        "size": float(scenario.initial_position.size),
        "pnl": float(pnl),
        "return_pct": float((pnl / invested) if invested > 0 else 0.0),
        "notes": actual.notes,
    }


def _summarize_scenario(
    *,
    scenario: BacktestScenario,
    trades: list[ClosedTrade],
    open_position: OpenPosition | None,
    last_close: float,
    actual_summary: dict[str, Any] | None,
) -> dict[str, Any]:
    realized_pnl = float(sum(trade.pnl for trade in trades))
    invested = float(sum(trade.entry_price * trade.size for trade in trades))
    realized_return_pct = float((realized_pnl / invested) if invested > 0 else 0.0)
    win_count = sum(1 for trade in trades if trade.pnl > 0)
    loss_count = sum(1 for trade in trades if trade.pnl < 0)
    mark_to_market_pnl = 0.0
    if open_position is not None:
        mark_to_market_pnl = (float(last_close) - open_position.entry_price) * open_position.size

    comparison: dict[str, Any] | None = None
    if actual_summary and actual_summary.get("status") == "complete_reference":
        comparison = {
            "actual_pnl": actual_summary["pnl"],
            "actual_return_pct": actual_summary["return_pct"],
            "simulated_realized_pnl": realized_pnl,
            "simulated_realized_return_pct": realized_return_pct,
            "pnl_delta": float(realized_pnl - float(actual_summary["pnl"])),
            "return_pct_delta": float(
                realized_return_pct - float(actual_summary["return_pct"])
            ),
        }

    return {
        "scenario_id": scenario.id,
        "symbol": scenario.symbol,
        "window_start_date": scenario.window_start_date,
        "window_end_date": scenario.window_end_date,
        "trade_count": len(trades),
        "win_count": int(win_count),
        "loss_count": int(loss_count),
        "realized_pnl": realized_pnl,
        "realized_return_pct": realized_return_pct,
        "mark_to_market_pnl": float(mark_to_market_pnl),
        "total_pnl_including_open": float(realized_pnl + mark_to_market_pnl),
        "ending_position_state": "long" if open_position is not None else "flat",
        "actual_trade_reference": actual_summary,
        "comparison_to_actual": comparison,
    }


def _batch_summary(results: list[dict[str, Any]]) -> dict[str, Any]:
    scenario_count = len(results)
    trade_count = sum(int(item["scenario_summary"]["trade_count"]) for item in results)
    win_count = sum(int(item["scenario_summary"]["win_count"]) for item in results)
    loss_count = sum(int(item["scenario_summary"]["loss_count"]) for item in results)
    realized_pnl = sum(float(item["scenario_summary"]["realized_pnl"]) for item in results)
    average_realized_return_pct = (
        sum(float(item["scenario_summary"]["realized_return_pct"]) for item in results)
        / scenario_count
        if scenario_count > 0
        else 0.0
    )
    comparison_items = [
        item["scenario_summary"]["comparison_to_actual"]
        for item in results
        if item["scenario_summary"].get("comparison_to_actual") is not None
    ]
    comparison_summary = None
    if comparison_items:
        comparison_summary = {
            "count": len(comparison_items),
            "average_pnl_delta": float(
                sum(float(item["pnl_delta"]) for item in comparison_items) / len(comparison_items)
            ),
            "average_return_pct_delta": float(
                sum(float(item["return_pct_delta"]) for item in comparison_items)
                / len(comparison_items)
            ),
        }
    return {
        "scenario_count": scenario_count,
        "trade_count": trade_count,
        "win_count": win_count,
        "loss_count": loss_count,
        "realized_pnl": float(realized_pnl),
        "average_realized_return_pct": float(average_realized_return_pct),
        "comparison_to_actual": comparison_summary,
    }


def run_scenario(
    *,
    scenario: BacktestScenario,
    outdir: Path,
    modules: str,
    min_rr_required: float,
) -> dict[str, Any]:
    history, window = _prepare_daily_frames(scenario)
    actual_summary = _compute_actual_trade_summary(scenario)

    scenario_dir = outdir / scenario.id
    contexts_dir = scenario_dir / "contexts"
    scenario_dir.mkdir(parents=True, exist_ok=True)
    contexts_dir.mkdir(parents=True, exist_ok=True)

    builder_path = Path(__file__).resolve().parent / "build_daily_ta_context.py"
    python_executable = sys.executable

    daily_logs: list[dict[str, Any]] = []
    trades: list[ClosedTrade] = []
    open_position: OpenPosition | None = None
    pending_setup: PendingSetup | None = None
    pending_order: PendingOrder | None = None
    last_exit_index: int | None = None

    if scenario.initial_position.state == "long":
        first_history = history[history["date"] <= pd.to_datetime(scenario.window_start_date).date()].copy()
        if first_history.empty:
            raise ValueError(
                f"scenario {scenario.id}: cannot initialize long position without visible history"
            )
        with tempfile.TemporaryDirectory(prefix=f"{scenario.id}-init-") as tempdir:
            snapshot_path = Path(tempdir) / "snapshot.json"
            context_path = Path(tempdir) / "context.json"
            with snapshot_path.open("w", encoding="utf-8") as f:
                json.dump(_daily_slice_to_payload(first_history), f, indent=2)
            init_context = _build_daily_context(
                python_executable=python_executable,
                builder_path=builder_path,
                snapshot_path=snapshot_path,
                context_path=context_path,
                symbol=scenario.symbol,
                modules=modules,
                position_state="long",
                min_rr_required=min_rr_required,
            )
        open_position = open_position_from_context(
            entry_date=scenario.initial_position.entry_date or scenario.window_start_date,
            entry_price=float(scenario.initial_position.entry_price or 0.0),
            size=float(scenario.initial_position.size),
            setup_id=str(init_context.get("setup", {}).get("primary_setup", "initial_long")),
            context=init_context,
            source="initial_position",
        )

    for index, (_, bar) in enumerate(window.iterrows()):
        trade_date = pd.Timestamp(bar["datetime"]).date().isoformat()
        day_history = history[history["date"] <= pd.Timestamp(bar["datetime"]).date()].copy()
        if day_history.empty:
            raise ValueError(f"scenario {scenario.id}: empty visible history on {trade_date}")

        if pending_order is not None and pending_order.intended_entry_date == trade_date:
            open_position = open_position_from_context(
                entry_date=trade_date,
                entry_price=float(bar["open"]),
                size=float(scenario.initial_position.size),
                setup_id=pending_order.setup_id,
                context=json.loads((contexts_dir / f"{pending_order.signal_date}.json").read_text(encoding="utf-8")),
                source="simulated_entry",
            )
            pending_order = None

        if open_position is not None:
            closed_trade, intrabar_reason = process_intrabar_exit(
                open_position,
                trade_date=trade_date,
                open_price=float(bar["open"]),
                high_price=float(bar["high"]),
                low_price=float(bar["low"]),
            )
            if closed_trade is not None:
                trades.append(closed_trade)
                open_position = None
                last_exit_index = index

        with tempfile.TemporaryDirectory(prefix=f"{scenario.id}-{trade_date}-") as tempdir:
            snapshot_path = Path(tempdir) / "snapshot.json"
            context_path = contexts_dir / f"{trade_date}.json"
            with snapshot_path.open("w", encoding="utf-8") as f:
                json.dump(_daily_slice_to_payload(day_history), f, indent=2)
            context = _build_daily_context(
                python_executable=python_executable,
                builder_path=builder_path,
                snapshot_path=snapshot_path,
                context_path=context_path,
                symbol=scenario.symbol,
                modules=modules,
                position_state="long" if open_position is not None else "flat",
                min_rr_required=min_rr_required,
            )

        expired_setup = None
        if pending_setup is not None:
            if pending_setup_expired(pending_setup, index):
                expired_setup = serialize_pending_setup(pending_setup)
                pending_setup = None
            elif context.get("setup", {}).get("primary_setup") != pending_setup.setup_id:
                pending_setup = None

        if open_position is None:
            decision = evaluate_flat_policy(
                context,
                cooldown_active=(last_exit_index == index),
            )
            if decision.pending_setup_active:
                if pending_setup is None or pending_setup.setup_id != decision.pending_setup_id:
                    pending_setup = PendingSetup(
                        setup_id=str(decision.pending_setup_id),
                        start_index=index,
                        first_seen_date=trade_date,
                        expiry_bars=int(decision.pending_setup_expiry_bars or 5),
                        reason=decision.reason,
                    )
            else:
                pending_setup = None

            if decision.action == "BUY" and index + 1 < len(window):
                next_bar = window.iloc[index + 1]
                pending_order = PendingOrder(
                    side="BUY",
                    signal_index=index,
                    signal_date=trade_date,
                    intended_entry_date=pd.Timestamp(next_bar["datetime"]).date().isoformat(),
                    reason=decision.reason,
                    setup_id=decision.setup_id,
                )
        else:
            decision = evaluate_long_policy(context)
            if decision.action == "EXIT" and index + 1 < len(window):
                next_bar = window.iloc[index + 1]
                closed_trade = close_position(
                    open_position,
                    exit_date=pd.Timestamp(next_bar["datetime"]).date().isoformat(),
                    exit_price=float(next_bar["open"]),
                    exit_reason=f"policy_exit:{decision.reason}",
                )
                trades.append(closed_trade)
                open_position = None
                last_exit_index = index + 1

        daily_logs.append(
            {
                "date": trade_date,
                "bar": {
                    "open": float(bar["open"]),
                    "high": float(bar["high"]),
                    "low": float(bar["low"]),
                    "close": float(bar["close"]),
                    "volume": float(bar["volume"]),
                },
                "action": decision.action,
                "action_reason": decision.reason,
                "setup_id": decision.setup_id,
                "context_path": str(contexts_dir / f"{trade_date}.json"),
                "pending_setup": serialize_pending_setup(pending_setup),
                "expired_setup": expired_setup,
                "pending_order": asdict(pending_order) if pending_order is not None else None,
                "position_state_end_of_day": "long" if open_position is not None else "flat",
                "thesis": {
                    "trend_bias": context.get("daily_thesis", {}).get("trend_bias"),
                    "structure_status": context.get("daily_thesis", {}).get("structure_status"),
                    "primary_setup": context.get("setup", {}).get("primary_setup"),
                    "trigger_state": context.get("trigger_confirmation", {}).get("trigger_state"),
                },
            }
        )

    scenario_summary = _summarize_scenario(
        scenario=scenario,
        trades=trades,
        open_position=open_position,
        last_close=float(window.iloc[-1]["close"]),
        actual_summary=actual_summary,
    )
    result = {
        "scenario": {
            "id": scenario.id,
            "symbol": scenario.symbol,
            "ohlcv_path": scenario.ohlcv_path,
            "window_start_date": scenario.window_start_date,
            "window_end_date": scenario.window_end_date,
            "initial_position": asdict(scenario.initial_position),
            "actual_trade": asdict(scenario.actual_trade) if scenario.actual_trade else None,
            "notes": scenario.notes,
        },
        "daily_action_log": daily_logs,
        "trade_ledger": [serialize_closed_trade(trade) for trade in trades],
        "open_position": serialize_open_position(open_position) if open_position else None,
        "scenario_summary": scenario_summary,
    }
    with (scenario_dir / "result.json").open("w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    return result


def main() -> None:
    args = parse_args()
    manifest_path = Path(args.manifest).expanduser().resolve()
    outdir = Path(args.outdir).expanduser().resolve()
    outdir.mkdir(parents=True, exist_ok=True)

    manifest = load_backtest_manifest(
        manifest_path=manifest_path,
        check_files=bool(args.check_files),
    )

    results: list[dict[str, Any]] = []
    for scenario in manifest.scenarios:
        results.append(
            run_scenario(
                scenario=scenario,
                outdir=outdir,
                modules=args.modules,
                min_rr_required=float(args.min_rr_required),
            )
        )

    batch_output = {
        "manifest_path": str(manifest_path),
        "scenario_count": len(results),
        "batch_summary": _batch_summary(results),
        "results": results,
    }
    with (outdir / "batch_result.json").open("w", encoding="utf-8") as f:
        json.dump(batch_output, f, indent=2)
    print(json.dumps({"ok": True, "output": str(outdir / "batch_result.json")}, indent=2))


if __name__ == "__main__":
    main()
