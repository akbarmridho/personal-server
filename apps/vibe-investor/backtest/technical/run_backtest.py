#!/usr/bin/env python3
"""Daily-only replay runner for technical backtests."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor, as_completed
from dataclasses import asdict
from pathlib import Path
from typing import Any

import pandas as pd

from lib.manifest import BacktestScenario, load_backtest_manifest
from lib.strategies import (
    STRATEGY_ORDER,
    evaluate_strategy_flat,
    evaluate_strategy_long,
    strategy_setup_id,
)
from lib.execution import (
    ClosedTrade,
    OpenPosition,
    PendingOrder,
    PendingSetup,
    close_position,
    open_position_from_context,
    open_position_plain,
    pending_setup_expired,
    process_intrabar_exit,
)
from lib.context import build_daily_context, ensure_skill_path
from lib.report import build_report


# ---------------------------------------------------------------------------
# OHLCV loader (delegates to skill scripts)
# ---------------------------------------------------------------------------

ensure_skill_path()
from ta_common import load_ohlcv  # type: ignore[import-not-found]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _bar_trade_date(bar: pd.Series) -> str:
    return pd.Timestamp(bar["datetime"]).date().isoformat()


def _history_visible(history: pd.DataFrame, bar: pd.Series) -> pd.DataFrame:
    return history[history["date"] <= pd.Timestamp(bar["datetime"]).date()].copy()


def _asdict_or_none(value: Any | None) -> dict[str, Any] | None:
    return asdict(value) if value is not None else None


def _daily_slice_to_payload(df: pd.DataFrame) -> dict[str, Any]:
    fields = ["timestamp", "datetime", "date", "open", "high", "low", "close", "volume", "value"]
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
        rows.append(item)
    return {"daily": rows, "corp_actions": []}


def _prepare_daily_frames(scenario: BacktestScenario) -> tuple[pd.DataFrame, pd.DataFrame]:
    daily, _intraday_1m, _intraday, _corp = load_ohlcv(Path(scenario.ohlcv_path), include_intraday=False)
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
    return history.reset_index(drop=True), window.reset_index(drop=True)


def _compute_actual_trade_summary(scenario: BacktestScenario) -> dict[str, Any] | None:
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
            "entry_date": entry_date, "entry_price": entry_price,
            "exit_date": exit_date, "exit_price": exit_price,
            "notes": actual.notes,
        }
    pnl = (float(exit_price) - float(entry_price)) * float(scenario.initial_position.size)
    invested = float(entry_price) * float(scenario.initial_position.size)
    return {
        "status": "complete_reference",
        "entry_date": entry_date, "entry_price": float(entry_price),
        "exit_date": exit_date, "exit_price": float(exit_price),
        "size": float(scenario.initial_position.size),
        "pnl": float(pnl),
        "return_pct": float((pnl / invested) if invested > 0 else 0.0),
        "notes": actual.notes,
    }


# ---------------------------------------------------------------------------
# Strategy summary
# ---------------------------------------------------------------------------

def _summarize_strategy(
    *, scenario: BacktestScenario, strategy_name: str,
    trades: list[ClosedTrade], actual_summary: dict[str, Any] | None,
) -> dict[str, Any]:
    realized_pnl = float(sum(t.pnl for t in trades))
    invested = float(sum(t.entry_price * t.size for t in trades))
    realized_return_pct = float((realized_pnl / invested) if invested > 0 else 0.0)
    win_count = sum(1 for t in trades if t.pnl > 0)
    loss_count = sum(1 for t in trades if t.pnl < 0)
    comparison: dict[str, Any] | None = None
    if actual_summary and actual_summary.get("status") == "complete_reference":
        comparison = {
            "actual_pnl": actual_summary["pnl"],
            "actual_return_pct": actual_summary["return_pct"],
            "simulated_realized_pnl": realized_pnl,
            "simulated_realized_return_pct": realized_return_pct,
            "pnl_delta": float(realized_pnl - float(actual_summary["pnl"])),
            "return_pct_delta": float(realized_return_pct - float(actual_summary["return_pct"])),
        }
    return {
        "scenario_id": scenario.id, "strategy_name": strategy_name,
        "symbol": scenario.symbol,
        "window_start_date": scenario.window_start_date,
        "window_end_date": scenario.window_end_date,
        "trade_count": len(trades), "win_count": int(win_count), "loss_count": int(loss_count),
        "realized_pnl": realized_pnl, "realized_return_pct": realized_return_pct,
        "ending_position_state": "flat",
        "actual_trade_reference": actual_summary,
        "comparison_to_actual": comparison,
    }


# ---------------------------------------------------------------------------
# Context building
# ---------------------------------------------------------------------------

def _build_single_context(
    *, scenario_id: str, trade_date: str, day_history_payload: dict[str, Any],
    contexts_dir: Path, symbol: str, modules: str, position_state: str, min_rr_required: float,
) -> tuple[str, dict[str, Any]]:
    """Build context for a single bar. Designed to run in a thread."""
    with tempfile.TemporaryDirectory(prefix=f"{scenario_id}-{trade_date}-") as tempdir:
        snapshot_path = Path(tempdir) / "snapshot.json"
        context_path = contexts_dir / f"{trade_date}.json"
        with snapshot_path.open("w", encoding="utf-8") as f:
            json.dump(day_history_payload, f, indent=2)
        result = build_daily_context(
            snapshot_path=snapshot_path, context_path=context_path,
            symbol=symbol, modules=modules, position_state=position_state,
            min_rr_required=min_rr_required,
        )
    return trade_date, result


def _build_contexts(
    *, scenario: BacktestScenario, history: pd.DataFrame, window: pd.DataFrame,
    contexts_dir: Path, modules: str, min_rr_required: float,
) -> dict[str, dict[str, Any]]:
    # Pre-compute payloads (cheap) then build contexts in parallel (expensive subprocess per bar)
    bar_jobs: list[tuple[str, dict[str, Any]]] = []
    for _, bar in window.iterrows():
        trade_date = _bar_trade_date(bar)
        day_history = _history_visible(history, bar)
        if day_history.empty:
            raise ValueError(f"scenario {scenario.id}: empty visible history on {trade_date}")
        bar_jobs.append((trade_date, _daily_slice_to_payload(day_history)))

    contexts: dict[str, dict[str, Any]] = {}
    max_workers = min(len(bar_jobs), os.cpu_count() or 4)
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {
            pool.submit(
                _build_single_context,
                scenario_id=scenario.id, trade_date=td, day_history_payload=payload,
                contexts_dir=contexts_dir, symbol=scenario.symbol,
                modules=modules, position_state=scenario.initial_position.state,
                min_rr_required=min_rr_required,
            ): td
            for td, payload in bar_jobs
        }
        for future in as_completed(futures):
            td, result = future.result()
            contexts[td] = result
    return contexts


# ---------------------------------------------------------------------------
# Entry position helper
# ---------------------------------------------------------------------------

def _open_entry_position(
    *, strategy_name: str, entry_date: str, entry_price: float,
    size: float, setup_id: str, context: dict[str, Any], source: str,
) -> OpenPosition:
    if strategy_name in {"buy_and_hold", "ma_trend"}:
        return open_position_plain(
            entry_date=entry_date, entry_price=entry_price,
            size=size, setup_id=setup_id, source=source,
        )
    return open_position_from_context(
        entry_date=entry_date, entry_price=entry_price,
        size=size, setup_id=setup_id, context=context, source=source,
    )


# ---------------------------------------------------------------------------
# Simulation
# ---------------------------------------------------------------------------

def _simulate_strategy(
    *, strategy_name: str, scenario: BacktestScenario,
    history: pd.DataFrame, window: pd.DataFrame,
    contexts: dict[str, dict[str, Any]], actual_summary: dict[str, Any] | None,
) -> dict[str, Any]:
    daily_logs: list[dict[str, Any]] = []
    trades: list[ClosedTrade] = []
    open_position: OpenPosition | None = None
    pending_setup: PendingSetup | None = None
    pending_order: PendingOrder | None = None
    last_exit_index: int | None = None
    has_ever_entered = scenario.initial_position.state == "long"

    if scenario.initial_position.state == "long":
        first_day = _bar_trade_date(window.iloc[0])
        init_context = contexts[first_day]
        open_position = _open_entry_position(
            strategy_name=strategy_name,
            entry_date=scenario.initial_position.entry_date or scenario.window_start_date,
            entry_price=float(scenario.initial_position.entry_price or 0.0),
            size=float(scenario.initial_position.size),
            setup_id=str(init_context.get("setup", {}).get("primary_setup", strategy_setup_id(strategy_name))),
            context=init_context, source="initial_position",
        )

    for index, (_, bar) in enumerate(window.iterrows()):
        trade_date = _bar_trade_date(bar)
        context = contexts[trade_date]
        history_visible = _history_visible(history, bar)

        if pending_order is not None and pending_order.intended_entry_date == trade_date:
            signal_context = contexts[pending_order.signal_date]
            open_position = _open_entry_position(
                strategy_name=strategy_name, entry_date=trade_date,
                entry_price=float(bar["open"]), size=float(scenario.initial_position.size),
                setup_id=pending_order.setup_id, context=signal_context, source="simulated_entry",
            )
            has_ever_entered = True
            pending_order = None

        if open_position is not None:
            closed_trade, _ = process_intrabar_exit(
                open_position, trade_date=trade_date,
                open_price=float(bar["open"]), high_price=float(bar["high"]), low_price=float(bar["low"]),
            )
            if closed_trade is not None:
                trades.append(closed_trade)
                open_position = None
                last_exit_index = index

        expired_setup = None
        if pending_setup is not None:
            if pending_setup_expired(pending_setup, index):
                expired_setup = asdict(pending_setup)
                pending_setup = None
            elif pending_setup.setup_id != str(context.get("setup", {}).get("primary_setup")) and strategy_name == "ablation":
                pending_setup = None

        if open_position is None:
            decision = evaluate_strategy_flat(
                strategy_name=strategy_name, context=context,
                history_visible=history_visible,
                cooldown_active=(last_exit_index == index),
                is_first_window_bar=(index == 0),
                has_ever_entered=has_ever_entered,
            )
            if strategy_name == "buy_and_hold" and index == 0 and decision.action == "BUY":
                open_position = _open_entry_position(
                    strategy_name=strategy_name, entry_date=trade_date,
                    entry_price=float(bar["open"]), size=float(scenario.initial_position.size),
                    setup_id=decision.setup_id, context=context, source="simulated_entry",
                )
                has_ever_entered = True
            else:
                if decision.pending_setup_active:
                    if pending_setup is None or pending_setup.setup_id != str(decision.pending_setup_id):
                        pending_setup = PendingSetup(
                            setup_id=str(decision.pending_setup_id), start_index=index,
                            first_seen_date=trade_date,
                            expiry_bars=int(decision.pending_setup_expiry_bars or 5),
                            reason=decision.reason,
                        )
                else:
                    pending_setup = None
                if decision.action == "BUY" and index + 1 < len(window):
                    next_bar = window.iloc[index + 1]
                    pending_order = PendingOrder(
                        side="BUY", signal_index=index, signal_date=trade_date,
                        intended_entry_date=_bar_trade_date(next_bar),
                        reason=decision.reason, setup_id=decision.setup_id,
                    )
        else:
            decision = evaluate_strategy_long(
                strategy_name=strategy_name, context=context, history_visible=history_visible,
            )
            if decision.action == "EXIT" and index + 1 < len(window):
                next_bar = window.iloc[index + 1]
                closed_trade = close_position(
                    open_position, exit_date=_bar_trade_date(next_bar),
                    exit_price=float(next_bar["open"]),
                    exit_reason=f"policy_exit:{decision.reason}",
                )
                trades.append(closed_trade)
                open_position = None
                last_exit_index = index + 1

        daily_logs.append({
            "date": trade_date,
            "bar": {
                "open": float(bar["open"]), "high": float(bar["high"]),
                "low": float(bar["low"]), "close": float(bar["close"]),
                "volume": float(bar["volume"]),
            },
            "action": decision.action, "action_reason": decision.reason,
            "setup_id": decision.setup_id,
            "context_path": str(Path("contexts") / f"{trade_date}.json"),
            "pending_setup": _asdict_or_none(pending_setup),
            "expired_setup": expired_setup,
            "pending_order": asdict(pending_order) if pending_order is not None else None,
            "position_state_end_of_day": "long" if open_position is not None else "flat",
            "thesis": {
                "trend_bias": context.get("daily_thesis", {}).get("trend_bias"),
                "structure_status": context.get("daily_thesis", {}).get("structure_status"),
                "primary_setup": context.get("setup", {}).get("primary_setup"),
                "trigger_state": context.get("trigger_confirmation", {}).get("trigger_state"),
            },
        })

    if open_position is not None:
        last_bar = window.iloc[-1]
        trades.append(close_position(
            open_position, exit_date=_bar_trade_date(last_bar),
            exit_price=float(last_bar["close"]), exit_reason="end_of_window_close",
        ))
        open_position = None

    return {
        "daily_action_log": daily_logs,
        "trade_ledger": [asdict(t) for t in trades],
        "open_position": _asdict_or_none(open_position),
        "scenario_summary": _summarize_strategy(
            scenario=scenario, strategy_name=strategy_name,
            trades=trades, actual_summary=actual_summary,
        ),
    }


# ---------------------------------------------------------------------------
# Batch summary
# ---------------------------------------------------------------------------

def _strategy_batch_summary(results: list[dict[str, Any]], strategy_name: str) -> dict[str, Any]:
    strategy_results = [item["strategy_results"][strategy_name] for item in results]
    count = len(strategy_results)
    trade_count = sum(int(r["scenario_summary"]["trade_count"]) for r in strategy_results)
    win_count = sum(int(r["scenario_summary"]["win_count"]) for r in strategy_results)
    loss_count = sum(int(r["scenario_summary"]["loss_count"]) for r in strategy_results)
    realized_pnl = sum(float(r["scenario_summary"]["realized_pnl"]) for r in strategy_results)
    avg_return = (
        sum(float(r["scenario_summary"]["realized_return_pct"]) for r in strategy_results) / count
        if count > 0 else 0.0
    )
    cmp_items = [
        r["scenario_summary"]["comparison_to_actual"] for r in strategy_results
        if r["scenario_summary"].get("comparison_to_actual") is not None
    ]
    comparison = None
    if cmp_items:
        comparison = {
            "count": len(cmp_items),
            "average_pnl_delta": float(sum(float(c["pnl_delta"]) for c in cmp_items) / len(cmp_items)),
            "average_return_pct_delta": float(sum(float(c["return_pct_delta"]) for c in cmp_items) / len(cmp_items)),
        }
    return {
        "strategy_name": strategy_name, "scenario_count": count,
        "trade_count": trade_count, "win_count": win_count, "loss_count": loss_count,
        "realized_pnl": float(realized_pnl), "average_realized_return_pct": float(avg_return),
        "comparison_to_actual": comparison,
    }


# ---------------------------------------------------------------------------
# Scenario runner
# ---------------------------------------------------------------------------

def run_scenario(
    *, scenario: BacktestScenario, outdir: Path, modules: str, min_rr_required: float,
) -> dict[str, Any]:
    history, window = _prepare_daily_frames(scenario)
    actual_summary = _compute_actual_trade_summary(scenario)
    scenario_dir = outdir / scenario.id
    contexts_dir = scenario_dir / "contexts"
    scenario_dir.mkdir(parents=True, exist_ok=True)
    contexts_dir.mkdir(parents=True, exist_ok=True)
    contexts = _build_contexts(
        scenario=scenario, history=history, window=window,
        contexts_dir=contexts_dir, modules=modules, min_rr_required=min_rr_required,
    )
    strategy_results = {
        name: _simulate_strategy(
            strategy_name=name, scenario=scenario, history=history,
            window=window, contexts=contexts, actual_summary=actual_summary,
        )
        for name in STRATEGY_ORDER
    }
    result = {
        "scenario": {
            "id": scenario.id, "symbol": scenario.symbol,
            "ohlcv_path": scenario.ohlcv_path,
            "window_start_date": scenario.window_start_date,
            "window_end_date": scenario.window_end_date,
            "initial_position": asdict(scenario.initial_position),
            "actual_trade": asdict(scenario.actual_trade) if scenario.actual_trade else None,
            "notes": scenario.notes,
        },
        "actual_trade_reference": actual_summary,
        "strategy_results": strategy_results,
        "daily_action_log": strategy_results["ablation"]["daily_action_log"],
        "trade_ledger": strategy_results["ablation"]["trade_ledger"],
        "open_position": strategy_results["ablation"]["open_position"],
        "scenario_summary": strategy_results["ablation"]["scenario_summary"],
    }
    with (scenario_dir / "result.json").open("w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    return result


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Daily-only technical backtest runner.")
    parser.add_argument("--manifest", required=True, help="Scenario manifest JSON path.")
    parser.add_argument("--outdir", required=True, help="Output directory.")
    parser.add_argument("--modules", default="core,vpvr,breakout", help="Comma-separated TA modules.")
    parser.add_argument("--min-rr-required", type=float, default=1.2, help="Minimum RR for actionable entry.")
    parser.add_argument("--check-files", action="store_true", help="Require OHLCV files to exist.")
    args = parser.parse_args()

    manifest_path = Path(args.manifest).expanduser().resolve()
    outdir = Path(args.outdir).expanduser().resolve()
    outdir.mkdir(parents=True, exist_ok=True)
    manifest = load_backtest_manifest(manifest_path, check_files=bool(args.check_files))
    max_scenarios = min(len(manifest.scenarios), os.cpu_count() or 4)
    with ProcessPoolExecutor(max_workers=max_scenarios) as pool:
        future_to_idx = {
            pool.submit(
                run_scenario,
                scenario=scenario, outdir=outdir,
                modules=args.modules, min_rr_required=float(args.min_rr_required),
            ): i
            for i, scenario in enumerate(manifest.scenarios)
        }
        indexed: list[tuple[int, dict[str, Any]]] = []
        for future in as_completed(future_to_idx):
            indexed.append((future_to_idx[future], future.result()))
        indexed.sort(key=lambda x: x[0])
        results: list[dict[str, Any]] = [r for _, r in indexed]
    strategy_batch_summaries = {
        name: _strategy_batch_summary(results, name) for name in STRATEGY_ORDER
    }
    batch_output = {
        "manifest_path": str(manifest_path),
        "scenario_count": len(results),
        "batch_summary": strategy_batch_summaries["ablation"],
        "strategy_batch_summaries": strategy_batch_summaries,
        "results": results,
    }
    batch_result_path = outdir / "batch_result.json"
    batch_report_path = outdir / "batch_report.md"
    with batch_result_path.open("w", encoding="utf-8") as f:
        json.dump(batch_output, f, indent=2)
    batch_report_path.write_text(build_report(batch_output), encoding="utf-8")
    print(json.dumps({"ok": True, "batch_result": str(batch_result_path), "batch_report": str(batch_report_path)}, indent=2))


if __name__ == "__main__":
    main()
