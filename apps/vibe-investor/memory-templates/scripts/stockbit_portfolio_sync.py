#!/usr/bin/env python3

"""Import raw Stockbit captures into normalized vibe-investor portfolio memory."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any


IGNORED_COMMANDS = {"DATA FEE", "METERAI", "BEA METERAI"}
EXPLICIT_ACTION_COMMANDS = {"BUY", "SELL", "DIVIDEND", "RIGHTS", "SPLIT", "REVERSE SPLIT"}


@dataclass(frozen=True)
class RawPaths:
    root: Path
    portfolio_dir: Path
    history_dir: Path
    manifests_dir: Path


def _to_float(value: object) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _read_json(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"Expected JSON object in {path}")
    return payload


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def _relative(path: Path, base: Path) -> str:
    try:
        return str(path.resolve().relative_to(base.resolve()))
    except ValueError:
        return str(path.resolve())


def _default_raw_root() -> Path:
    opencode_data_home = os.environ.get("OPENCODE_DATA_HOME")
    if not opencode_data_home:
        raise ValueError("OPENCODE_DATA_HOME is required unless --raw-root is provided")
    return (
        Path(opencode_data_home).expanduser().resolve()
        / "data"
        / "ai-client-connector"
        / "stockbit"
    )


def _resolve_raw_paths(raw_root_arg: str | None) -> RawPaths:
    root = (
        Path(raw_root_arg).expanduser().resolve()
        if raw_root_arg
        else _default_raw_root()
    )
    return RawPaths(
        root=root,
        portfolio_dir=root / "portfolio",
        history_dir=root / "history",
        manifests_dir=root / "manifests",
    )


def _latest_json_file(directory: Path) -> Path:
    if not directory.exists():
        raise FileNotFoundError(f"Missing directory: {directory}")
    files = sorted(p for p in directory.rglob("*.json") if p.is_file())
    if not files:
        raise FileNotFoundError(f"No JSON files found under: {directory}")
    return files[-1]


def _all_json_files(directory: Path) -> list[Path]:
    if not directory.exists():
        return []
    return sorted(p for p in directory.rglob("*.json") if p.is_file())


def _copy_raw_imports(raw_paths: RawPaths, imports_root: Path) -> None:
    for source_dir in [raw_paths.portfolio_dir, raw_paths.history_dir, raw_paths.manifests_dir]:
        if not source_dir.exists():
            continue
        for source in source_dir.rglob("*.json"):
            destination = imports_root / source.relative_to(raw_paths.root)
            if destination.exists():
                continue
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)


def _parse_capture_timestamp(path: Path) -> str:
    try:
        day = path.parent.name
        stamp = path.stem.split("_")[0]
        dt = datetime.strptime(f"{day} {stamp}", "%Y-%m-%d %H%M%S")
        return dt.isoformat()
    except ValueError:
        return datetime.fromtimestamp(path.stat().st_mtime).isoformat()


def normalize_portfolio_snapshot(raw_payload: dict[str, Any], source_path: Path) -> dict[str, Any]:
    data = raw_payload.get("data")
    if not isinstance(data, dict):
        raise ValueError("Portfolio payload missing `data` object")

    summary = data.get("summary")
    results = data.get("results")
    if not isinstance(summary, dict) or not isinstance(results, list):
        raise ValueError("Portfolio payload missing `summary` or `results`")

    trading = summary.get("trading", {})
    amount = summary.get("amount", {})
    profit_loss = summary.get("profit_loss", {})
    as_of = _parse_capture_timestamp(source_path)[:10]

    positions: list[dict[str, Any]] = []
    for item in results:
        if not isinstance(item, dict):
            continue
        symbol = str(item.get("symbol", "")).upper().strip()
        if not symbol:
            continue
        qty = item.get("qty", {})
        price = item.get("price", {})
        asset = item.get("asset", {})
        unrealised = asset.get("unrealised", {})
        average = price.get("average", {})
        balance = qty.get("balance", {})
        available = qty.get("available", {})

        positions.append(
            {
                "symbol": symbol,
                "lots": _to_float(balance.get("lot")),
                "shares": _to_float(balance.get("share")),
                "available_lots": _to_float(available.get("lot")),
                "available_shares": _to_float(available.get("share")),
                "stock_on_hand": _to_float(qty.get("stock_on_hand")),
                "avg": _to_float(average.get("price")),
                "last": _to_float(price.get("latest")),
                "market_value": _to_float(unrealised.get("market_value")),
                "amount_invested": _to_float(asset.get("amount_invested")),
                "unrealized_pnl": _to_float(unrealised.get("profit_loss")),
                "unrealized_gain": _to_float(unrealised.get("gain")),
            }
        )

    return {
        "as_of": as_of,
        "captured_at": _parse_capture_timestamp(source_path),
        "source": {
            "provider": "stockbit",
            "path": str(source_path),
        },
        "cash": _to_float(trading.get("balance")),
        "equity": _to_float(summary.get("equity")),
        "invested": _to_float(amount.get("invested")),
        "net_pnl": _to_float(profit_loss.get("net")),
        "unrealized_pnl": _to_float(profit_loss.get("unrealised")),
        "gain": _to_float(summary.get("gain")),
        "positions": positions,
    }


def _normalize_history_event(item: dict[str, Any], captured_at: str) -> dict[str, Any] | None:
    command = str(item.get("command", "")).upper().strip()
    symbol = str(item.get("symbol", "")).upper().strip()
    if command in IGNORED_COMMANDS:
        return None
    if not symbol and command not in EXPLICIT_ACTION_COMMANDS:
        return None

    event_date = parse_stockbit_date(str(item.get("date", "")))
    event_time = str(item.get("time", "")).strip()
    event = {
        "captured_at": captured_at,
        "command": command,
        "symbol": symbol,
        "date": event_date,
        "time": event_time,
        "shares": int(_to_float(item.get("shares"))),
        "lots": int(_to_float(item.get("lot"))),
        "price": _to_float(item.get("price")),
        "amount": _to_float(item.get("amount")),
        "fee": _to_float(item.get("fee")),
        "netamount": _to_float(item.get("netamount")),
        "realized_amount": _to_float(item.get("realized_amount")),
        "realized_percentage": _to_float(item.get("realized_percentage")),
        "status": str(item.get("status", "")).upper().strip(),
        "display_as": str(item.get("display_as", "")).strip(),
    }
    event["event_id"] = build_event_id(event)
    return event


def parse_stockbit_date(value: str) -> str:
    value = value.strip()
    if not value:
        return ""
    return datetime.strptime(value, "%d %b %Y").date().isoformat()


def build_event_id(event: dict[str, Any]) -> str:
    key = "|".join(
        [
            str(event.get("command", "")),
            str(event.get("symbol", "")),
            str(event.get("date", "")),
            str(event.get("time", "")),
            str(event.get("shares", "")),
            str(event.get("price", "")),
            str(event.get("netamount", "")),
        ]
    )
    return hashlib.sha256(key.encode("utf-8")).hexdigest()[:20]


def normalize_history_events(history_paths: list[Path]) -> list[dict[str, Any]]:
    events: dict[str, dict[str, Any]] = {}

    for history_path in history_paths:
        payload = _read_json(history_path)
        data = payload.get("data")
        if not isinstance(data, dict):
            continue
        history_groups = data.get("history")
        if not isinstance(history_groups, list):
            continue
        captured_at = _parse_capture_timestamp(history_path)
        for group in history_groups:
            if not isinstance(group, dict):
                continue
            for item in group.get("history_list", []):
                if not isinstance(item, dict):
                    continue
                normalized = _normalize_history_event(item, captured_at)
                if not normalized:
                    continue
                event_id = str(normalized["event_id"])
                existing = events.get(event_id)
                if existing is None or str(normalized["captured_at"]) > str(existing["captured_at"]):
                    events[event_id] = normalized

    return sorted(
        events.values(),
        key=lambda item: (
            str(item.get("date", "")),
            str(item.get("time", "")),
            str(item.get("event_id", "")),
        ),
    )


def append_trade_ledgers(memory_root: Path, events: list[dict[str, Any]]) -> list[Path]:
    trade_dir = memory_root / "portfolio" / "trade_events"
    shard_to_events: dict[str, list[dict[str, Any]]] = {}
    for event in events:
        if not event.get("date"):
            continue
        shard = str(event["date"])[:7]
        shard_to_events.setdefault(shard, []).append(event)

    written_paths: list[Path] = []
    for shard, shard_events in shard_to_events.items():
        shard_path = trade_dir / f"{shard}.jsonl"
        existing_lines: list[dict[str, Any]] = []
        existing_ids: set[str] = set()
        if shard_path.exists():
            for line in shard_path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line:
                    continue
                parsed = json.loads(line)
                existing_lines.append(parsed)
                existing_ids.add(str(parsed.get("event_id", "")))

        new_items = [item for item in shard_events if str(item["event_id"]) not in existing_ids]
        combined = sorted(
            existing_lines + new_items,
            key=lambda item: (
                str(item.get("date", "")),
                str(item.get("time", "")),
                str(item.get("event_id", "")),
            ),
        )
        shard_path.parent.mkdir(parents=True, exist_ok=True)
        shard_path.write_text(
            "".join(json.dumps(item, ensure_ascii=False) + "\n" for item in combined),
            encoding="utf-8",
        )
        written_paths.append(shard_path)

    return written_paths


def build_derived_summary(snapshot: dict[str, Any], events: list[dict[str, Any]]) -> dict[str, Any]:
    positions = snapshot.get("positions", [])
    total_equity = _to_float(snapshot.get("equity"))
    derived_positions: list[dict[str, Any]] = []
    for item in positions:
        if not isinstance(item, dict):
            continue
        market_value = _to_float(item.get("market_value"))
        derived_positions.append(
            {
                "symbol": item.get("symbol"),
                "lots": item.get("lots"),
                "avg": item.get("avg"),
                "last": item.get("last"),
                "market_value": market_value,
                "weight": (market_value / total_equity) if total_equity > 0 else 0.0,
                "unrealized_pnl": item.get("unrealized_pnl"),
            }
        )

    positive_realized = sum(
        _to_float(event.get("realized_amount"))
        for event in events
        if _to_float(event.get("realized_amount")) > 0
    )
    negative_realized = sum(
        _to_float(event.get("realized_amount"))
        for event in events
        if _to_float(event.get("realized_amount")) < 0
    )
    trade_actions = [event for event in events if event.get("command") in {"BUY", "SELL"}]

    return {
        "as_of": snapshot.get("as_of"),
        "captured_at": snapshot.get("captured_at"),
        "equity": snapshot.get("equity"),
        "cash": snapshot.get("cash"),
        "invested": snapshot.get("invested"),
        "net_pnl": snapshot.get("net_pnl"),
        "unrealized_pnl": snapshot.get("unrealized_pnl"),
        "gain": snapshot.get("gain"),
        "position_count": len(derived_positions),
        "positions": sorted(
            derived_positions,
            key=lambda item: _to_float(item.get("market_value")),
            reverse=True,
        ),
        "realized_summary": {
            "realized_gain": positive_realized,
            "realized_loss": negative_realized,
            "net_realized": positive_realized + negative_realized,
            "trade_action_count": len(trade_actions),
        },
        "recent_actions": sorted(
            events,
            key=lambda item: (
                str(item.get("date", "")),
                str(item.get("time", "")),
                str(item.get("event_id", "")),
            ),
            reverse=True,
        )[:20],
    }


def render_portfolio_note(
    memory_root: Path,
    snapshot_path: Path,
    snapshot: dict[str, Any],
    derived: dict[str, Any],
    latest_trade_shard: Path | None,
    raw_root: Path,
) -> str:
    lines: list[str] = []
    lines.append("# Portfolio")
    lines.append("")
    lines.append(f"Last updated: {datetime.now().date().isoformat()}")
    lines.append(f"Latest sync: {snapshot.get('captured_at', '')}")
    lines.append("")
    lines.append("## Latest Input Snapshot")
    lines.append(f"- as_of: {snapshot.get('as_of', '')}")
    lines.append(f"- Source file: `{_relative(snapshot_path, memory_root)}`")
    lines.append("- Canonical source: latest JSON snapshot in `notes/portfolio_inputs/`")
    lines.append(f"- Raw import root: `{raw_root}`")
    lines.append("")
    lines.append("## Requested Input Table")
    lines.append("| Symbol | Lots | Avg | Last |")
    lines.append("| --- | ---: | ---: | ---: |")
    for position in snapshot.get("positions", []):
        if not isinstance(position, dict):
            continue
        lines.append(
            f"| {position.get('symbol', '')} | {int(_to_float(position.get('lots')))} | "
            f"{_to_float(position.get('avg')):.4f} | {_to_float(position.get('last')):.4f} |"
        )
    lines.append("")
    lines.append("## Computed Summary (Derived)")
    lines.append(f"- Total market value: {sum(_to_float(p.get('market_value')) for p in derived.get('positions', [])):.2f}")
    lines.append(f"- Cash: {_to_float(snapshot.get('cash')):.2f}")
    lines.append(f"- Total equity: {_to_float(snapshot.get('equity')):.2f}")
    top3_weight = sum(
        _to_float(position.get("weight"))
        for position in list(derived.get("positions", []))[:3]
    )
    lines.append(f"- Concentration (Top 3): {top3_weight:.2%}")
    lines.append("")
    lines.append("## Recent Actions")
    if latest_trade_shard:
        lines.append(f"- Latest normalized trade events: `{_relative(latest_trade_shard, memory_root)}`")
    else:
        lines.append("- Latest normalized trade events: none")
    for event in list(derived.get("recent_actions", []))[:8]:
        lines.append(
            f"- {event.get('date', '')} {event.get('time', '')} "
            f"{event.get('command', '')} {event.get('symbol', '')} "
            f"@ {event.get('price', 0)} ({event.get('shares', 0)} shares)"
        )
    lines.append("")
    lines.append("## Notes")
    return "\n".join(lines)


def run_sync(args: argparse.Namespace) -> dict[str, Any]:
    memory_root = Path(args.memory_root).expanduser().resolve()
    raw_paths = _resolve_raw_paths(args.raw_root)
    if not raw_paths.portfolio_dir.exists():
        raise FileNotFoundError(f"Missing Stockbit portfolio raw directory: {raw_paths.portfolio_dir}")

    imports_root = memory_root / "imports" / "stockbit"
    _copy_raw_imports(raw_paths, imports_root)

    latest_portfolio_raw = _latest_json_file(raw_paths.portfolio_dir)
    history_raw_files = _all_json_files(raw_paths.history_dir)
    snapshot = normalize_portfolio_snapshot(_read_json(latest_portfolio_raw), latest_portfolio_raw)
    events = normalize_history_events(history_raw_files)

    snapshot_path = memory_root / "notes" / "portfolio_inputs" / f"{snapshot['as_of']}.json"
    _write_json(snapshot_path, snapshot)

    written_trade_paths = append_trade_ledgers(memory_root, events)
    latest_trade_shard = written_trade_paths[-1] if written_trade_paths else None

    derived = build_derived_summary(snapshot, events)
    derived_path = memory_root / "portfolio" / "derived" / "latest.json"
    _write_json(derived_path, derived)

    note_path = memory_root / "notes" / "portfolio.md"
    note_path.write_text(
        render_portfolio_note(
            memory_root=memory_root,
            snapshot_path=snapshot_path,
            snapshot=snapshot,
            derived=derived,
            latest_trade_shard=latest_trade_shard,
            raw_root=raw_paths.root,
        )
        + "\n",
        encoding="utf-8",
    )

    sync_state = {
        "last_synced_at": datetime.now().isoformat(),
        "raw_root": str(raw_paths.root),
        "latest_portfolio_source": str(latest_portfolio_raw),
        "history_file_count": len(history_raw_files),
    }
    sync_state_path = memory_root / "portfolio" / "sync_state.json"
    _write_json(sync_state_path, sync_state)

    result = {
        "snapshot_path": str(snapshot_path),
        "derived_path": str(derived_path),
        "portfolio_note_path": str(note_path),
        "sync_state_path": str(sync_state_path),
        "latest_portfolio_raw": str(latest_portfolio_raw),
        "history_file_count": len(history_raw_files),
        "trade_shards": [str(path) for path in written_trade_paths],
    }
    if args.output:
        _write_json(Path(args.output).expanduser().resolve(), result)
    return result


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Sync raw Stockbit portfolio captures into vibe memory")
    subparsers = parser.add_subparsers(dest="command", required=True)

    sync = subparsers.add_parser("sync", help="Import raw Stockbit captures into normalized memory")
    sync.add_argument("--memory-root", default="memory", help="Memory root directory")
    sync.add_argument(
        "--raw-root",
        help="Raw Stockbit capture root (defaults to $OPENCODE_DATA_HOME/data/ai-client-connector/stockbit)",
    )
    sync.add_argument("--output", help="Optional JSON output path")
    sync.set_defaults(func=run_sync)

    return parser


def main() -> None:
    parser = _build_parser()
    args = parser.parse_args()
    result = args.func(args)
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
