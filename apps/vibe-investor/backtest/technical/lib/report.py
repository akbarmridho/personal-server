"""Markdown reporting for technical backtests."""

from __future__ import annotations

from typing import Any


def _fmt_num(value: Any, digits: int = 2) -> str:
    if value is None:
        return "-"
    try:
        return f"{float(value):.{digits}f}"
    except (TypeError, ValueError):
        return str(value)


def _fmt_pct(value: Any, digits: int = 2) -> str:
    if value is None:
        return "-"
    try:
        return f"{float(value) * 100:.{digits}f}%"
    except (TypeError, ValueError):
        return str(value)


def _actual_summary_text(actual: dict[str, Any] | None) -> str:
    if not actual:
        return "No actual trade reference."
    if actual.get("status") == "complete_reference":
        return (
            f"Actual trade: entry {actual['entry_date']} @ {_fmt_num(actual['entry_price'])}, "
            f"exit {actual['exit_date']} @ {_fmt_num(actual['exit_price'])}, "
            f"PnL {_fmt_num(actual['pnl'])}, return {_fmt_pct(actual['return_pct'])}."
        )
    return (
        f"Partial actual reference: entry {actual.get('entry_date') or '-'} @ {_fmt_num(actual.get('entry_price'))}, "
        f"exit {actual.get('exit_date') or '-'} @ {_fmt_num(actual.get('exit_price'))}."
    )


def build_report(data: dict[str, Any]) -> str:
    lines: list[str] = []
    lines.append("# Technical Backtest Report")
    lines.append("")
    lines.append("## Batch Summary")
    lines.append("")
    lines.append(f"- Scenario count: {data.get('scenario_count', 0)}")
    lines.append(f"- Input file: `{data.get('manifest_path', '-')}`")
    lines.append("")
    lines.append("### Strategy Comparison")
    lines.append("")
    lines.append("| Strategy | Trades | Wins | Losses | Realized PnL | Avg Return | Avg PnL Delta vs Actual | Avg Return Delta vs Actual |")
    lines.append("| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |")
    strategy_batch_summaries = data.get("strategy_batch_summaries", {})
    sorted_strategies = sorted(
        strategy_batch_summaries.values(),
        key=lambda item: float(item.get("realized_pnl", 0.0)),
        reverse=True,
    )
    for item in sorted_strategies:
        cmp = item.get("comparison_to_actual") or {}
        lines.append("| " + " | ".join([
            str(item.get("strategy_name", "-")),
            str(item.get("trade_count", "-")),
            str(item.get("win_count", "-")),
            str(item.get("loss_count", "-")),
            _fmt_num(item.get("realized_pnl")),
            _fmt_pct(item.get("average_realized_return_pct")),
            _fmt_num(cmp.get("average_pnl_delta")),
            _fmt_pct(cmp.get("average_return_pct_delta")),
        ]) + " |")
    lines.append("")

    if sorted_strategies:
        best, worst = sorted_strategies[0], sorted_strategies[-1]
        lines.append("### Headline")
        lines.append("")
        lines.append(f"- Best strategy by realized PnL: `{best['strategy_name']}` with {_fmt_num(best['realized_pnl'])}.")
        lines.append(f"- Worst strategy by realized PnL: `{worst['strategy_name']}` with {_fmt_num(worst['realized_pnl'])}.")
        lines.append("")

    lines.append("## Scenario Breakdown")
    lines.append("")
    for item in data.get("results", []):
        scenario = item.get("scenario", {})
        actual = item.get("actual_trade_reference")
        strategy_results = item.get("strategy_results", {})
        lines.append(f"### {scenario.get('id', '-')}: {scenario.get('symbol', '-')}")
        lines.append("")
        lines.append(f"- Window: {scenario.get('window_start_date', '-')} to {scenario.get('window_end_date', '-')}")
        lines.append(f"- Initial position: `{scenario.get('initial_position', {}).get('state', '-')}`")
        if scenario.get("notes"):
            lines.append(f"- Notes: {scenario['notes']}")
        lines.append(f"- {_actual_summary_text(actual)}")
        lines.append("")
        lines.append("| Strategy | Trades | Realized PnL | Return | PnL Delta vs Actual | Return Delta vs Actual |")
        lines.append("| --- | ---: | ---: | ---: | ---: | ---: |")
        ranked = sorted(
            strategy_results.items(),
            key=lambda pair: float(pair[1].get("scenario_summary", {}).get("realized_pnl", 0.0)),
            reverse=True,
        )
        for strategy_name, result in ranked:
            summary = result.get("scenario_summary", {})
            cmp = summary.get("comparison_to_actual") or {}
            lines.append("| " + " | ".join([
                strategy_name,
                str(summary.get("trade_count", "-")),
                _fmt_num(summary.get("realized_pnl")),
                _fmt_pct(summary.get("realized_return_pct")),
                _fmt_num(cmp.get("pnl_delta")),
                _fmt_pct(cmp.get("return_pct_delta")),
            ]) + " |")
        lines.append("")
        if ranked:
            best_name, best_result = ranked[0]
            best_summary = best_result.get("scenario_summary", {})
            lines.append(f"- Best strategy on this window: `{best_name}` with {_fmt_num(best_summary.get('realized_pnl'))}.")
            ablation_summary = strategy_results.get("ablation", {}).get("scenario_summary", {})
            if best_name != "ablation":
                lines.append(f"- `ablation` result: {_fmt_num(ablation_summary.get('realized_pnl'))}, return {_fmt_pct(ablation_summary.get('realized_return_pct'))}.")
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"
