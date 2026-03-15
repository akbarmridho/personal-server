#!/usr/bin/env python3
"""Backtest-only daily TA context builder."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def _skill_script_dir() -> Path:
    return (
        Path(__file__).resolve().parents[2]
        / ".opencode-config"
        / "skills"
        / "technical-analysis"
        / "scripts"
    )


SKILL_SCRIPT_DIR = _skill_script_dir()
if str(SKILL_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SKILL_SCRIPT_DIR))

from build_ta_context import (  # type: ignore[import-not-found]
    build_ta_context_result,
    load_prior_thesis,
    parse_modules,
    validate_runtime_requirements,
)
from ta_common import load_ohlcv  # type: ignore[import-not-found]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build daily-only deterministic TA context for technical backtests."
    )
    parser.add_argument("--input", required=True, help="Input OHLCV JSON path.")
    parser.add_argument("--symbol", required=True, help="Ticker symbol, e.g. BBCA.")
    parser.add_argument("--outdir", default="work", help="Output directory.")
    parser.add_argument(
        "--output", default=None, help="Optional explicit output JSON path."
    )
    parser.add_argument(
        "--modules",
        default="core",
        help="Comma-separated modules: core,vpvr,breakout or all.",
    )
    parser.add_argument(
        "--purpose-mode",
        choices=["INITIAL", "UPDATE", "POSTMORTEM"],
        default="INITIAL",
        help="Runtime purpose mode.",
    )
    parser.add_argument(
        "--position-state",
        choices=["flat", "long"],
        default="flat",
        help="Current position state.",
    )
    parser.add_argument(
        "--min-rr-required",
        type=float,
        default=1.2,
        help="Minimum reward-to-risk required for an actionable plan.",
    )
    parser.add_argument(
        "--prior-thesis-json",
        default=None,
        help="Optional JSON file for prior thesis context. Required for UPDATE and POSTMORTEM.",
    )
    parser.add_argument(
        "--thesis-status",
        choices=["intact", "improving", "degrading", "invalidated"],
        default=None,
        help="Required when purpose-mode is UPDATE.",
    )
    parser.add_argument(
        "--review-reason",
        choices=[
            "routine",
            "contradiction",
            "level_break",
            "regime_change",
            "trigger_failure",
        ],
        default=None,
        help="Required when purpose-mode is UPDATE.",
    )
    parser.add_argument(
        "--swing-n", type=int, default=2, help="Swing pivot lookback (default 2)."
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    modules = parse_modules(args.modules)
    symbol = args.symbol.strip().upper()
    purpose_mode = args.purpose_mode
    position_state = args.position_state

    validate_runtime_requirements(
        purpose_mode=purpose_mode,
        prior_thesis_json=args.prior_thesis_json,
        thesis_status=args.thesis_status,
        review_reason=args.review_reason,
    )

    input_path = Path(args.input).expanduser().resolve()
    outdir = Path(args.outdir).expanduser().resolve()
    outdir.mkdir(parents=True, exist_ok=True)

    daily, intraday_1m, intraday, corp = load_ohlcv(
        input_path,
        include_intraday=False,
    )
    prior_thesis = load_prior_thesis(args.prior_thesis_json)
    result = build_ta_context_result(
        symbol=symbol,
        daily=daily,
        intraday_1m=intraday_1m,
        intraday=intraday,
        modules=modules,
        purpose_mode=purpose_mode,
        position_state=position_state,
        min_rr_required=args.min_rr_required,
        prior_thesis=prior_thesis,
        thesis_status=args.thesis_status,
        review_reason=args.review_reason,
        swing_n=args.swing_n,
        timeframe_mode="daily_only",
    )

    output_path = (
        Path(args.output).expanduser().resolve()
        if args.output
        else outdir / f"{symbol}_ta_context.json"
    )
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    print(json.dumps({"ok": True, "output": str(output_path)}, indent=2))


if __name__ == "__main__":
    main()
