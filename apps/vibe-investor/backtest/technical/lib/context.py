"""Backtest-only daily TA context builder.

Can be run standalone via `python -m lib.context` or invoked as subprocess.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any


def _skill_script_dir() -> Path:
    return (
        Path(__file__).resolve().parents[3]
        / ".opencode-config"
        / "skills"
        / "technical-analysis"
        / "scripts"
    )


def ensure_skill_path() -> None:
    d = str(_skill_script_dir())
    if d not in sys.path:
        sys.path.insert(0, d)


def build_daily_context(
    *,
    snapshot_path: Path,
    context_path: Path,
    symbol: str,
    modules: str,
    min_rr_required: float,
) -> dict[str, Any]:
    """Build daily TA context by invoking this module as a subprocess."""
    args = [
        sys.executable, "-m", "lib.context",
        "--input", str(snapshot_path),
        "--symbol", symbol,
        "--outdir", str(context_path.parent),
        "--output", str(context_path),
        "--modules", modules,
        "--position-state", "flat",
        "--min-rr-required", str(min_rr_required),
    ]
    subprocess.run(
        args, check=True, capture_output=True, text=True,
        cwd=str(Path(__file__).resolve().parents[1]),
    )
    with context_path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build daily-only TA context for backtests.")
    parser.add_argument("--input", required=True, help="Input OHLCV JSON path.")
    parser.add_argument("--symbol", required=True, help="Ticker symbol.")
    parser.add_argument("--outdir", default="work", help="Output directory.")
    parser.add_argument("--output", default=None, help="Explicit output JSON path.")
    parser.add_argument("--modules", default="core", help="Comma-separated modules.")
    parser.add_argument("--purpose-mode", choices=["INITIAL", "UPDATE", "POSTMORTEM"], default="INITIAL")
    parser.add_argument("--position-state", choices=["flat", "long"], default="flat")
    parser.add_argument("--min-rr-required", type=float, default=1.2)
    parser.add_argument("--prior-thesis-json", default=None)
    parser.add_argument("--thesis-status", choices=["intact", "improving", "degrading", "invalidated"], default=None)
    parser.add_argument("--review-reason", choices=["routine", "contradiction", "level_break", "regime_change", "trigger_failure"], default=None)
    parser.add_argument("--swing-n", type=int, default=2)
    return parser.parse_args()


def main() -> None:
    ensure_skill_path()
    from build_ta_context import (  # type: ignore[import-not-found]
        build_ta_context_result, load_prior_thesis, parse_modules, validate_runtime_requirements,
    )
    from ta_common import load_ohlcv  # type: ignore[import-not-found]

    args = _parse_args()
    modules = parse_modules(args.modules)
    symbol = args.symbol.strip().upper()
    validate_runtime_requirements(
        purpose_mode=args.purpose_mode, prior_thesis_json=args.prior_thesis_json,
        thesis_status=args.thesis_status, review_reason=args.review_reason,
    )
    input_path = Path(args.input).expanduser().resolve()
    outdir = Path(args.outdir).expanduser().resolve()
    outdir.mkdir(parents=True, exist_ok=True)
    daily, intraday_1m, intraday, _corp = load_ohlcv(input_path, include_intraday=False)
    prior_thesis = load_prior_thesis(args.prior_thesis_json)
    result = build_ta_context_result(
        symbol=symbol, daily=daily, intraday_1m=intraday_1m, intraday=intraday,
        modules=modules, purpose_mode=args.purpose_mode, position_state=args.position_state,
        min_rr_required=args.min_rr_required, prior_thesis=prior_thesis,
        thesis_status=args.thesis_status, review_reason=args.review_reason,
        swing_n=args.swing_n, timeframe_mode="daily_only",
    )
    output_path = (
        Path(args.output).expanduser().resolve() if args.output
        else outdir / f"{symbol}_ta_context.json"
    )
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    print(json.dumps({"ok": True, "output": str(output_path)}, indent=2))


if __name__ == "__main__":
    main()
