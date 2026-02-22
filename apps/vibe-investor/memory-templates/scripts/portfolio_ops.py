#!/usr/bin/env python3

"""Deterministic portfolio operations for Vibe Investor memory workflows.

This script focuses on high-ROI deterministic checks used by portfolio commands:
- daily-check
- weekly-review
- validate-sizing
- rebalance-check

It operates on canonical portfolio snapshots under:
memory/notes/portfolio_inputs/{DATE}.json
"""

from __future__ import annotations

import argparse
import json
import math
from datetime import date
from pathlib import Path
from typing import Any


SEVERITY_HIGH = "HIGH"
SEVERITY_MEDIUM = "MEDIUM"


def _to_float(value: object) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _to_bool(value: object) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "y"}
    if isinstance(value, (int, float)):
        return value != 0
    return False


def _normalize_mos(value: object) -> float:
    raw = _to_float(value)
    if raw > 1.0:
        return raw / 100.0
    return raw


def _relative(path: Path, base: Path) -> str:
    try:
        return str(path.resolve().relative_to(base.resolve()))
    except ValueError:
        return str(path.resolve())


def _read_json(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"Snapshot is not a JSON object: {path}")
    return payload


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def _latest_snapshot_path(memory_root: Path) -> Path:
    inputs_dir = memory_root / "notes" / "portfolio_inputs"
    if not inputs_dir.exists():
        raise FileNotFoundError(f"Missing directory: {inputs_dir}")
    candidates = sorted([p for p in inputs_dir.glob("*.json") if p.is_file()])
    if not candidates:
        raise FileNotFoundError(f"No portfolio snapshots found in: {inputs_dir}")
    return candidates[-1]


def _resolve_snapshot_path(memory_root: Path, explicit_snapshot: str | None) -> Path:
    if explicit_snapshot:
        path = Path(explicit_snapshot).expanduser()
        if not path.is_absolute():
            path = Path.cwd() / path
        if not path.exists():
            raise FileNotFoundError(f"Snapshot not found: {path}")
        return path.resolve()
    return _latest_snapshot_path(memory_root)


def _conviction_risk_pct(conviction: str) -> float:
    key = conviction.strip().lower()
    if key == "high":
        return 0.015
    if key == "low":
        return 0.005
    return 0.01


def _extract_correlations(snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    raw = snapshot.get("correlations", [])
    if not isinstance(raw, list):
        return []
    out: list[dict[str, Any]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        a = str(item.get("a", "")).upper().strip()
        b = str(item.get("b", "")).upper().strip()
        val = _to_float(item.get("value"))
        if not a or not b:
            continue
        out.append({"a": a, "b": b, "value": val})
    return out


def compute_portfolio(snapshot: dict[str, Any]) -> dict[str, Any]:
    cash = _to_float(snapshot.get("cash"))
    raw_positions = snapshot.get("positions", [])
    if not isinstance(raw_positions, list):
        raise ValueError("positions must be an array")

    positions: list[dict[str, Any]] = []
    total_market_value = 0.0
    total_cost = 0.0

    for raw in raw_positions:
        if not isinstance(raw, dict):
            continue
        symbol = str(raw.get("symbol", "")).upper().strip()
        lots = _to_float(raw.get("lots"))
        avg = _to_float(raw.get("avg"))
        last = _to_float(raw.get("last"))
        shares = lots * 100.0
        cost = shares * avg
        market_value = shares * last
        pnl = market_value - cost
        stop = _to_float(raw.get("stop")) if "stop" in raw else None
        if stop is not None and stop <= 0:
            stop = None

        target_weight = _to_float(raw.get("target_weight")) if "target_weight" in raw else None
        if target_weight is not None and target_weight > 1.0:
            target_weight = target_weight / 100.0
        if target_weight is not None and target_weight <= 0:
            target_weight = None

        adtv_value = _to_float(raw.get("adtv_value")) if "adtv_value" in raw else None
        if adtv_value is not None and adtv_value <= 0:
            adtv_value = None

        pos = {
            "symbol": symbol,
            "lots": lots,
            "shares": shares,
            "avg": avg,
            "last": last,
            "cost": cost,
            "market_value": market_value,
            "pnl": pnl,
            "category": str(raw.get("category", "")).upper().strip() or None,
            "sector": str(raw.get("sector", "")).strip() or None,
            "mos": _normalize_mos(raw.get("mos")) if "mos" in raw else None,
            "stop": stop,
            "target_weight": target_weight,
            "adtv_value": adtv_value,
            "thesis_broken": _to_bool(raw.get("thesis_broken")),
            "governance_risk": _to_bool(raw.get("governance_risk")),
            "liquidity_deterioration": _to_bool(raw.get("liquidity_deterioration")),
        }
        positions.append(pos)
        total_market_value += market_value
        total_cost += cost

    total_equity = cash + total_market_value
    for pos in positions:
        pos["weight"] = (pos["market_value"] / total_equity) if total_equity > 0 else 0.0
        stop = pos.get("stop")
        if stop is not None and pos["shares"] > 0 and total_equity > 0:
            risk_value = abs(pos["last"] - stop) * pos["shares"]
            pos["risk_value"] = risk_value
            pos["risk_pct_portfolio"] = risk_value / total_equity
        else:
            pos["risk_value"] = None
            pos["risk_pct_portfolio"] = None

        adtv_value = pos.get("adtv_value")
        if adtv_value is not None and adtv_value > 0:
            pos["adtv_usage"] = pos["market_value"] / adtv_value
        else:
            pos["adtv_usage"] = None

    top3_concentration = sum(
        p["weight"] for p in sorted(positions, key=lambda x: x["weight"], reverse=True)[:3]
    )

    category_weights: dict[str, float] = {}
    sector_counts: dict[str, int] = {}
    mos_over_30_weight = 0.0
    portfolio_heat = 0.0
    large_symbols: set[str] = set()
    for pos in positions:
        category = pos.get("category")
        if category:
            category_weights[category] = category_weights.get(category, 0.0) + pos["weight"]
        sector = pos.get("sector")
        if sector:
            sector_counts[sector] = sector_counts.get(sector, 0) + 1
        mos = pos.get("mos")
        if mos is not None and mos >= 0.30:
            mos_over_30_weight += pos["weight"]
        risk_pct = pos.get("risk_pct_portfolio")
        if isinstance(risk_pct, float):
            portfolio_heat += risk_pct
        if pos["weight"] >= 0.10:
            large_symbols.add(pos["symbol"])

    high_corr_pairs: list[dict[str, Any]] = []
    for item in _extract_correlations(snapshot):
        if item["value"] > 0.75 and item["a"] in large_symbols and item["b"] in large_symbols:
            high_corr_pairs.append(item)

    return {
        "as_of": snapshot.get("as_of"),
        "cash": cash,
        "total_cost": total_cost,
        "total_market_value": total_market_value,
        "total_equity": total_equity,
        "top3_concentration": top3_concentration,
        "portfolio_heat": portfolio_heat,
        "mos_over_30_weight": mos_over_30_weight,
        "speculative_weight": category_weights.get("SPECULATIVE", 0.0),
        "category_weights": category_weights,
        "sector_counts": sector_counts,
        "high_corr_pairs": high_corr_pairs,
        "positions": positions,
    }


def compute_pm_flags(report: dict[str, Any]) -> list[dict[str, Any]]:
    flags: list[dict[str, Any]] = []

    oversized = [p for p in report["positions"] if p["weight"] > 0.30]
    if oversized:
        flags.append(
            {
                "code": "PM-W01",
                "severity": SEVERITY_HIGH,
                "message": "Single position exceeds 30% weight",
                "symbols": [p["symbol"] for p in oversized],
            }
        )

    if report["speculative_weight"] > 0.10:
        flags.append(
            {
                "code": "PM-W02",
                "severity": SEVERITY_HIGH,
                "message": "Speculative allocation exceeds 10%",
                "value": report["speculative_weight"],
            }
        )

    if report["mos_over_30_weight"] < 0.50:
        flags.append(
            {
                "code": "PM-W03",
                "severity": SEVERITY_MEDIUM,
                "message": "Less than 50% of portfolio in MoS > 30% positions",
                "value": report["mos_over_30_weight"],
            }
        )

    sector_breaches = [k for k, v in report["sector_counts"].items() if v > 2]
    if sector_breaches:
        flags.append(
            {
                "code": "PM-W04",
                "severity": SEVERITY_MEDIUM,
                "message": "Sector limit breached (>2 stocks per sector)",
                "sectors": sector_breaches,
            }
        )

    if report["portfolio_heat"] > 0.06:
        flags.append(
            {
                "code": "PM-W05",
                "severity": SEVERITY_HIGH,
                "message": "Portfolio heat exceeds 6%",
                "value": report["portfolio_heat"],
            }
        )

    if report["high_corr_pairs"]:
        flags.append(
            {
                "code": "PM-W06",
                "severity": SEVERITY_MEDIUM,
                "message": "Correlation clustering detected (corr > 0.75 among large holdings)",
                "pairs": report["high_corr_pairs"],
            }
        )

    adtv_breaches = [
        {"symbol": p["symbol"], "adtv_usage": p["adtv_usage"]}
        for p in report["positions"]
        if isinstance(p.get("adtv_usage"), float) and p["adtv_usage"] > 0.05
    ]
    if adtv_breaches:
        flags.append(
            {
                "code": "PM-W07",
                "severity": SEVERITY_HIGH,
                "message": "Position size exceeds 5% of ADTV",
                "positions": adtv_breaches,
            }
        )

    return flags


def detect_stop_triggers(report: dict[str, Any]) -> list[dict[str, Any]]:
    hits: list[dict[str, Any]] = []
    for pos in report["positions"]:
        stop = pos.get("stop")
        if stop is None:
            continue
        if pos["last"] <= stop:
            hits.append({"symbol": pos["symbol"], "last": pos["last"], "stop": stop})
    return hits


def render_portfolio_note(
    memory_root: Path,
    snapshot_path: Path,
    snapshot: dict[str, Any],
    report: dict[str, Any],
    flags: list[dict[str, Any]],
    stop_hits: list[dict[str, Any]],
) -> str:
    lines: list[str] = []
    lines.append("# Portfolio")
    lines.append("")
    lines.append(f"Last updated: {date.today().isoformat()}")
    lines.append("")
    lines.append("## Latest Input Snapshot")
    lines.append(f"- as_of: {snapshot.get('as_of', '')}")
    lines.append(f"- Source file: `{_relative(snapshot_path, memory_root)}`")
    lines.append("")
    lines.append("## Requested Input Table")
    lines.append("| Symbol | Lots | Avg | Last |")
    lines.append("| --- | ---: | ---: | ---: |")
    for pos in snapshot.get("positions", []):
        if not isinstance(pos, dict):
            continue
        symbol = str(pos.get("symbol", "")).upper()
        lots = _to_float(pos.get("lots"))
        avg = _to_float(pos.get("avg"))
        last = _to_float(pos.get("last"))
        lines.append(f"| {symbol} | {lots:.0f} | {avg:.2f} | {last:.2f} |")
    lines.append("")
    lines.append("## Computed Summary (Derived)")
    lines.append(f"- Total market value: {report['total_market_value']:.2f}")
    lines.append(f"- Cash: {report['cash']:.2f}")
    lines.append(f"- Total equity: {report['total_equity']:.2f}")
    lines.append(f"- Concentration (Top 3): {report['top3_concentration']:.2%}")
    lines.append(f"- Portfolio heat: {report['portfolio_heat']:.2%}")
    lines.append(f"- MoS > 30% weight: {report['mos_over_30_weight']:.2%}")
    lines.append("")
    lines.append("## Health Flags")
    if flags:
        for flag in flags:
            lines.append(f"- {flag['code']} ({flag['severity']}): {flag['message']}")
    else:
        lines.append("- None")
    lines.append("")
    lines.append("## Stop Triggers")
    if stop_hits:
        for item in stop_hits:
            lines.append(
                f"- {item['symbol']}: last={item['last']:.2f}, stop={item['stop']:.2f}"
            )
    else:
        lines.append("- None")
    lines.append("")
    lines.append("## Notes")
    return "\n".join(lines)


def render_weekly_session(
    snapshot: dict[str, Any],
    report: dict[str, Any],
    flags: list[dict[str, Any]],
    stop_hits: list[dict[str, Any]],
) -> str:
    session_date = str(snapshot.get("as_of") or date.today().isoformat())
    lines: list[str] = []
    lines.append(f"# Session: {session_date}")
    lines.append("")
    lines.append("## Market Context")
    lines.append("- IHSG: n/a (fill if market data available in this run)")
    lines.append("- Key news: n/a (fill if news scan is included in this run)")
    lines.append("")
    lines.append("## Portfolio Health")
    lines.append(f"- Total equity: {report['total_equity']:.2f}")
    lines.append(f"- Top-3 concentration: {report['top3_concentration']:.2%}")
    lines.append(f"- Portfolio heat: {report['portfolio_heat']:.2%}")
    lines.append(f"- MoS > 30% weight: {report['mos_over_30_weight']:.2%}")
    lines.append("")
    lines.append("## Flags")
    if flags:
        for flag in flags:
            lines.append(f"- {flag['code']} ({flag['severity']}): {flag['message']}")
    else:
        lines.append("- No PM-W01..PM-W07 breaches detected.")
    lines.append("")
    lines.append("## Stop Triggers")
    if stop_hits:
        for item in stop_hits:
            lines.append(
                f"- {item['symbol']}: last={item['last']:.2f} <= stop={item['stop']:.2f}"
            )
    else:
        lines.append("- None")
    lines.append("")
    lines.append("## Next Actions")
    lines.append("- Review flags and adjust sizing/heat where needed.")
    lines.append("- Update watchlist status transitions if trigger state changed.")
    return "\n".join(lines)


def run_daily_check(args: argparse.Namespace) -> dict[str, Any]:
    memory_root = Path(args.memory_root).expanduser().resolve()
    snapshot_path = _resolve_snapshot_path(memory_root, args.snapshot)
    snapshot = _read_json(snapshot_path)
    report = compute_portfolio(snapshot)
    flags = compute_pm_flags(report)
    stop_hits = detect_stop_triggers(report)
    result = {
        "mode": "daily-check",
        "snapshot_path": str(snapshot_path),
        "report": report,
        "flags": flags,
        "stop_triggers": stop_hits,
    }

    if not args.no_write_portfolio_note:
        note_path = Path(args.write_portfolio_note).expanduser()
        if not note_path.is_absolute():
            note_path = (memory_root / note_path).resolve()
        note = render_portfolio_note(memory_root, snapshot_path, snapshot, report, flags, stop_hits)
        note_path.parent.mkdir(parents=True, exist_ok=True)
        note_path.write_text(note + "\n", encoding="utf-8")
        result["portfolio_note_path"] = str(note_path)

    if args.output:
        _write_json(Path(args.output).expanduser().resolve(), result)
    return result


def run_weekly_review(args: argparse.Namespace) -> dict[str, Any]:
    memory_root = Path(args.memory_root).expanduser().resolve()
    snapshot_path = _resolve_snapshot_path(memory_root, args.snapshot)
    snapshot = _read_json(snapshot_path)
    report = compute_portfolio(snapshot)
    flags = compute_pm_flags(report)
    stop_hits = detect_stop_triggers(report)
    result = {
        "mode": "weekly-review",
        "snapshot_path": str(snapshot_path),
        "report": report,
        "flags": flags,
        "stop_triggers": stop_hits,
    }

    if not args.no_write_portfolio_note:
        note_path = Path(args.write_portfolio_note).expanduser()
        if not note_path.is_absolute():
            note_path = (memory_root / note_path).resolve()
        note = render_portfolio_note(memory_root, snapshot_path, snapshot, report, flags, stop_hits)
        note_path.parent.mkdir(parents=True, exist_ok=True)
        note_path.write_text(note + "\n", encoding="utf-8")
        result["portfolio_note_path"] = str(note_path)

    if not args.no_write_session:
        session_date = str(args.session_date or snapshot.get("as_of") or date.today().isoformat())
        session_path = (memory_root / "sessions" / f"{session_date}.md").resolve()
        session_text = render_weekly_session(snapshot, report, flags, stop_hits)
        session_path.parent.mkdir(parents=True, exist_ok=True)
        session_path.write_text(session_text + "\n", encoding="utf-8")
        result["session_path"] = str(session_path)

    if args.output:
        _write_json(Path(args.output).expanduser().resolve(), result)
    return result


def run_validate_sizing(args: argparse.Namespace) -> dict[str, Any]:
    if args.entry <= 0 or args.stop <= 0 or args.capital <= 0:
        raise ValueError("entry, stop, and capital must be > 0")
    if args.entry == args.stop:
        raise ValueError("entry and stop cannot be equal")

    risk_pct = args.risk_pct if args.risk_pct is not None else _conviction_risk_pct(args.conviction)
    per_share_risk = abs(args.entry - args.stop)
    raw_shares = (args.capital * risk_pct) / per_share_risk
    shares = math.floor(raw_shares / 100.0) * 100.0
    lots = int(shares / 100.0)
    position_value = shares * args.entry
    risk_value = shares * per_share_risk
    weight = position_value / args.capital
    risk_pct_portfolio = risk_value / args.capital

    result: dict[str, Any] = {
        "mode": "validate-sizing",
        "symbol": args.symbol.upper(),
        "input": {
            "entry": args.entry,
            "stop": args.stop,
            "capital": args.capital,
            "risk_pct": risk_pct,
            "conviction": args.conviction,
        },
        "sizing": {
            "raw_shares": raw_shares,
            "shares_rounded": shares,
            "lots": lots,
            "position_value": position_value,
            "risk_value": risk_value,
            "weight": weight,
            "risk_pct_portfolio": risk_pct_portfolio,
        },
        "checks": [],
        "flags": [],
    }

    checks = result["checks"]
    flags = result["flags"]

    checks.append({"name": "single_position_cap_30pct", "ok": weight <= 0.30, "value": weight})
    if weight > 0.30:
        flags.append({"code": "PM-W01", "severity": SEVERITY_HIGH, "message": "Single position exceeds 30%"})

    checks.append({"name": "portfolio_heat_per_trade", "ok": risk_pct_portfolio <= 0.06, "value": risk_pct_portfolio})
    if risk_pct_portfolio > 0.06:
        flags.append({"code": "PM-W05", "severity": SEVERITY_HIGH, "message": "Per-trade risk exceeds 6% heat envelope"})

    adtv_usage = None
    if args.adtv_value and args.adtv_value > 0:
        adtv_usage = position_value / args.adtv_value
        checks.append({"name": "adtv_usage_5pct", "ok": adtv_usage <= 0.05, "value": adtv_usage})
        if adtv_usage > 0.05:
            flags.append({"code": "PM-W07", "severity": SEVERITY_HIGH, "message": "Position size exceeds 5% of ADTV"})

    correlation = args.correlation if args.correlation is not None else 0.0
    checks.append({"name": "correlation_cluster", "ok": correlation <= 0.75, "value": correlation})
    if correlation > 0.75:
        flags.append({"code": "PM-W06", "severity": SEVERITY_MEDIUM, "message": "High correlation with major holding"})

    if args.category and args.category.upper() == "SPECULATIVE" and weight > 0.10:
        flags.append({"code": "PM-W02", "severity": SEVERITY_HIGH, "message": "Speculative position exceeds 10%"})

    mos = _normalize_mos(args.mos) if args.mos is not None else None
    if mos is not None:
        checks.append({"name": "mos_over_30pct", "ok": mos >= 0.30, "value": mos})

    result["adtv_usage"] = adtv_usage
    result["decision"] = "PASS" if not flags else "REDUCE_OR_SKIP"

    if args.snapshot:
        memory_root = Path(args.memory_root).expanduser().resolve()
        snapshot_path = _resolve_snapshot_path(memory_root, args.snapshot)
        snapshot = _read_json(snapshot_path)
        portfolio = compute_portfolio(snapshot)
        post_weight = weight
        post_heat = portfolio["portfolio_heat"] + risk_pct_portfolio
        result["portfolio_context"] = {
            "snapshot_path": str(snapshot_path),
            "current_heat": portfolio["portfolio_heat"],
            "post_trade_heat": post_heat,
            "post_trade_position_weight": post_weight,
        }
        if post_heat > 0.06:
            flags.append({"code": "PM-W05", "severity": SEVERITY_HIGH, "message": "Post-trade portfolio heat exceeds 6%"})

    if args.output:
        _write_json(Path(args.output).expanduser().resolve(), result)
    return result


def run_rebalance_check(args: argparse.Namespace) -> dict[str, Any]:
    memory_root = Path(args.memory_root).expanduser().resolve()
    snapshot_path = _resolve_snapshot_path(memory_root, args.snapshot)
    snapshot = _read_json(snapshot_path)
    report = compute_portfolio(snapshot)

    drift_issues: list[dict[str, Any]] = []
    for pos in report["positions"]:
        target = pos.get("target_weight")
        if target is None or target <= 0:
            continue
        current = pos["weight"]
        drift = abs(current - target) / target
        if drift > args.drift_threshold:
            drift_issues.append(
                {
                    "symbol": pos["symbol"],
                    "current_weight": current,
                    "target_weight": target,
                    "relative_drift": drift,
                }
            )

    event_issues: list[dict[str, Any]] = []
    for pos in report["positions"]:
        if pos.get("thesis_broken"):
            event_issues.append({"symbol": pos["symbol"], "event": "thesis_broken"})
        if pos.get("governance_risk"):
            event_issues.append({"symbol": pos["symbol"], "event": "governance_risk"})
        if pos.get("liquidity_deterioration"):
            event_issues.append({"symbol": pos["symbol"], "event": "liquidity_deterioration"})

    recommendations: list[str] = []
    if drift_issues:
        recommendations.append("Trim/add positions with >20% relative drift from target weight.")
    if event_issues:
        recommendations.append("Prioritize event-triggered rebalance or replacement candidates.")
    if not drift_issues and not event_issues:
        recommendations.append("No material rebalance trigger detected.")

    result = {
        "mode": "rebalance-check",
        "snapshot_path": str(snapshot_path),
        "drift_threshold": args.drift_threshold,
        "drift_issues": drift_issues,
        "event_issues": event_issues,
        "recommendations": recommendations,
    }

    if args.output:
        _write_json(Path(args.output).expanduser().resolve(), result)
    return result


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Deterministic portfolio operations")
    subparsers = parser.add_subparsers(dest="command", required=True)

    daily = subparsers.add_parser("daily-check", help="Run deterministic daily portfolio checks")
    daily.add_argument("--memory-root", default="memory", help="Memory root directory")
    daily.add_argument("--snapshot", help="Explicit snapshot path (defaults to latest)")
    daily.add_argument(
        "--write-portfolio-note",
        default="notes/portfolio.md",
        help="Portfolio note path relative to memory root",
    )
    daily.add_argument("--no-write-portfolio-note", action="store_true")
    daily.add_argument("--output", help="Optional JSON output path")
    daily.set_defaults(func=run_daily_check)

    weekly = subparsers.add_parser("weekly-review", help="Run deterministic weekly review")
    weekly.add_argument("--memory-root", default="memory", help="Memory root directory")
    weekly.add_argument("--snapshot", help="Explicit snapshot path (defaults to latest)")
    weekly.add_argument("--session-date", help="Session date YYYY-MM-DD (defaults to as_of/today)")
    weekly.add_argument(
        "--write-portfolio-note",
        default="notes/portfolio.md",
        help="Portfolio note path relative to memory root",
    )
    weekly.add_argument("--no-write-portfolio-note", action="store_true")
    weekly.add_argument("--no-write-session", action="store_true")
    weekly.add_argument("--output", help="Optional JSON output path")
    weekly.set_defaults(func=run_weekly_review)

    validate = subparsers.add_parser("validate-sizing", help="Validate sizing for a candidate trade")
    validate.add_argument("--memory-root", default="memory", help="Memory root directory")
    validate.add_argument("--snapshot", help="Optional snapshot path for portfolio-context checks")
    validate.add_argument("--symbol", required=True, help="Ticker symbol")
    validate.add_argument("--entry", type=float, required=True, help="Entry price")
    validate.add_argument("--stop", type=float, required=True, help="Stop/invalidation price")
    validate.add_argument("--capital", type=float, required=True, help="Total portfolio capital")
    validate.add_argument("--risk-pct", type=float, help="Risk percent override (example 0.01)")
    validate.add_argument(
        "--conviction",
        default="medium",
        choices=["low", "medium", "high"],
        help="Conviction level if risk-pct is not provided",
    )
    validate.add_argument("--category", help="Category (CORE/VALUE/GROWTH/SPECULATIVE)")
    validate.add_argument("--mos", type=float, help="Margin of safety (0.35 or 35)")
    validate.add_argument("--adtv-value", type=float, help="Average daily traded value in currency")
    validate.add_argument("--correlation", type=float, help="Correlation to major holding")
    validate.add_argument("--output", help="Optional JSON output path")
    validate.set_defaults(func=run_validate_sizing)

    rebalance = subparsers.add_parser("rebalance-check", help="Run deterministic rebalance checks")
    rebalance.add_argument("--memory-root", default="memory", help="Memory root directory")
    rebalance.add_argument("--snapshot", help="Explicit snapshot path (defaults to latest)")
    rebalance.add_argument(
        "--drift-threshold",
        type=float,
        default=0.20,
        help="Relative drift threshold (default 0.20 = 20%)",
    )
    rebalance.add_argument("--output", help="Optional JSON output path")
    rebalance.set_defaults(func=run_rebalance_check)

    return parser


def main() -> None:
    parser = _build_parser()
    args = parser.parse_args()
    result = args.func(args)
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
