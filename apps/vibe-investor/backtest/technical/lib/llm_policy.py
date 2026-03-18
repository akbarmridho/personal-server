"""LLM replay helpers for Codex-backed technical backtests."""

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import pandas as pd

from .policy import PolicyDecision


TECHNICAL_DOCTRINE_FILES = [
    "SKILL.md",
]

LLM_DECISION_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "action",
        "confidence",
        "reason_code",
        "thesis",
        "risk_note",
        "setup_id",
        "holding_bias",
        "memory_update",
    ],
    "properties": {
        "action": {"type": "string", "enum": ["BUY", "WAIT", "HOLD", "EXIT"]},
        "confidence": {"type": "number", "minimum": 0.0, "maximum": 1.0},
        "reason_code": {"type": "string", "minLength": 1},
        "thesis": {"type": "string", "minLength": 1},
        "risk_note": {"type": "string", "minLength": 1},
        "setup_id": {"type": "string", "minLength": 1},
        "holding_bias": {"type": "string", "minLength": 1},
        "memory_update": {"type": "string", "minLength": 1},
    },
}


@dataclass(frozen=True)
class GateDecision:
    infer: bool
    reason: str
    decision_key: str
    changed_fields: list[str]
    state_packet: dict[str, Any]


@dataclass(frozen=True)
class LlmDecision:
    action: str
    confidence: float
    reason_code: str
    thesis: str
    risk_note: str
    setup_id: str
    holding_bias: str
    memory_update: str


@dataclass(frozen=True)
class InferenceRecord:
    date: str
    decision: LlmDecision
    cache_hit: bool
    cache_key: str
    response_path: str | None
    event_log_path: str | None
    prompt_path: str | None
    packet_path: str | None
    image_paths: list[str]


@dataclass(frozen=True)
class DecisionMemory:
    last_infer_date: str | None
    action: str | None
    reason_code: str | None
    thesis: str | None
    risk_note: str | None
    setup_id: str | None
    memory_update: str | None


def ensure_codex_available() -> str:
    codex_bin = shutil.which("codex")
    if not codex_bin:
        raise RuntimeError("codex CLI not found in PATH")
    return codex_bin


def ensure_scenario_workdirs(scenario_dir: Path) -> dict[str, Path]:
    codex_dir = scenario_dir / "codex"
    dirs = {
        "codex": codex_dir,
        "prompts": codex_dir / "prompts",
        "packets": codex_dir / "packets",
        "charts": codex_dir / "charts",
        "responses": codex_dir / "responses",
        "cache": codex_dir / "cache",
        "work": codex_dir / "work",
    }
    for path in dirs.values():
        path.mkdir(parents=True, exist_ok=True)
    return dirs


def compile_technical_doctrine(*, skill_dir: Path, output_path: Path) -> str:
    blocks: list[str] = []
    for rel_path in TECHNICAL_DOCTRINE_FILES:
        path = skill_dir / rel_path
        text = path.read_text(encoding="utf-8").strip()
        blocks.append(f"# SOURCE: {rel_path}\n\n{text}")
    doctrine = "\n\n".join(blocks).strip() + "\n"
    output_path.write_text(doctrine, encoding="utf-8")
    return doctrine


def _high_severity_flags(context: dict[str, Any]) -> list[str]:
    flags = context.get("red_flags", [])
    out: list[str] = []
    if not isinstance(flags, list):
        return out
    for item in flags:
        if not isinstance(item, dict):
            continue
        if str(item.get("severity", "")).lower() != "high":
            continue
        code = item.get("code")
        if isinstance(code, str) and code:
            out.append(code)
    return sorted(set(out))


def _zone_signature(zones: Any) -> list[float]:
    if not isinstance(zones, list):
        return []
    mids: list[float] = []
    for item in zones[:2]:
        if not isinstance(item, dict):
            continue
        raw = item.get("mid")
        if isinstance(raw, (int, float)):
            mids.append(round(float(raw), 4))
    return mids


def build_state_packet(
    *,
    context: dict[str, Any],
    position_state: str,
    deterministic_decision: PolicyDecision,
    open_position: dict[str, Any] | None,
    pending_setup: dict[str, Any] | None,
    pending_order: dict[str, Any] | None,
    cooldown_active: bool,
    exited_this_bar: bool,
    same_day_stopout: bool,
    last_exit_reason: str | None,
    last_exit_date: str | None,
    bars_since_exit: int | None,
) -> dict[str, Any]:
    location = context.get("location", {})
    liquidity = location.get("liquidity_map", {}) if isinstance(location, dict) else {}
    daily = context.get("daily_thesis", {})
    setup = context.get("setup", {})
    trigger = context.get("trigger_confirmation", {})
    risk_map = context.get("risk_map", {})
    return {
        "position_state": position_state,
        "deterministic_action": deterministic_decision.action,
        "daily_state": str(daily.get("state", "")),
        "daily_regime": str(daily.get("regime", "")),
        "trend_bias": str(daily.get("trend_bias", "")),
        "structure_status": str(daily.get("structure_status", "")),
        "location_state": str(location.get("location_state", "")),
        "primary_setup": str(setup.get("primary_setup", "")),
        "trigger_state": str(trigger.get("trigger_state", "")),
        "confirmation_state": str(trigger.get("confirmation_state", "")),
        "risk_status": str(risk_map.get("risk_status", "")),
        "risk_actionable": bool(risk_map.get("actionable", False)),
        "liquidity_type": str(liquidity.get("last_sweep_type", "none")),
        "liquidity_side": str(liquidity.get("last_sweep_side", "none")),
        "liquidity_outcome": str(liquidity.get("last_sweep_outcome", "unresolved")),
        "liquidity_path_state": str(liquidity.get("path_state", "unclear")),
        "high_flags": _high_severity_flags(context),
        "has_open_position": bool(open_position),
        "pending_order_active": bool(pending_order),
        "cooldown_active": cooldown_active,
        "exited_this_bar": exited_this_bar,
        "same_day_stopout": same_day_stopout,
        "last_exit_reason": last_exit_reason or "",
        "last_exit_date": last_exit_date or "",
        "bars_since_exit": bars_since_exit if bars_since_exit is not None else -1,
    }


def worth_to_infer(
    *,
    current_packet: dict[str, Any],
    previous_packet: dict[str, Any] | None,
    is_first_bar: bool,
    infer_count_so_far: int,
    soft_limit: int,
) -> GateDecision:
    critical_fields = {
        "position_state",
        "deterministic_action",
        "primary_setup",
        "trigger_state",
        "confirmation_state",
        "risk_actionable",
        "high_flags",
        "has_open_position",
        "cooldown_active",
        "exited_this_bar",
        "same_day_stopout",
    }
    secondary_fields = {
        "daily_state",
        "daily_regime",
        "trend_bias",
        "structure_status",
        "location_state",
        "risk_status",
        "liquidity_type",
        "liquidity_side",
        "liquidity_outcome",
        "liquidity_path_state",
        "pending_order_active",
        "last_exit_reason",
        "last_exit_date",
        "bars_since_exit",
    }
    packet_json = json.dumps(current_packet, sort_keys=True, separators=(",", ":"))
    decision_key = hashlib.sha256(packet_json.encode("utf-8")).hexdigest()
    if is_first_bar or previous_packet is None:
        return GateDecision(True, "first_bar", decision_key, sorted(current_packet.keys()), current_packet)
    changed_fields = sorted(
        key
        for key in current_packet
        if current_packet.get(key) != previous_packet.get(key)
    )
    critical_changed = [field for field in changed_fields if field in critical_fields]
    secondary_changed = [field for field in changed_fields if field in secondary_fields]
    if critical_changed:
        return GateDecision(True, "critical_state_change", decision_key, critical_changed, current_packet)
    if infer_count_so_far < soft_limit and secondary_changed:
        return GateDecision(True, "secondary_state_change_within_budget", decision_key, secondary_changed, current_packet)
    if changed_fields:
        return GateDecision(False, "change_below_current_sensitivity", decision_key, changed_fields, current_packet)
    return GateDecision(False, "state_unchanged", decision_key, [], current_packet)


def build_memory_summary(memory: DecisionMemory | None, recent_actions: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "last_inference": asdict(memory) if memory is not None else None,
        "recent_actions": recent_actions[-5:],
    }


def build_prompt(
    *,
    doctrine_text: str,
    packet: dict[str, Any],
    gate: GateDecision,
    memory_summary: dict[str, Any],
    position_state: str,
) -> str:
    packet_json = json.dumps(packet, indent=2, sort_keys=True)
    gate_json = json.dumps(
        {
            "infer": gate.infer,
            "reason": gate.reason,
            "decision_key": gate.decision_key,
            "changed_fields": gate.changed_fields,
        },
        indent=2,
        sort_keys=True,
    )
    memory_json = json.dumps(memory_summary, indent=2, sort_keys=True)
    instructions = "\n".join(
        [
            "You are evaluating one daily replay bar for an IDX technical backtest.",
            "Use the doctrine below as the decision contract.",
            "Treat the packet as the full state authority for this bar.",
            "Respect position state.",
            "If position_state is flat, return only BUY or WAIT.",
            "If position_state is long, return only HOLD or EXIT.",
            "If deterministic_reference.reason is high_severity_entry_blocker, default to WAIT unless there is a very explicit exceptional override supported by the packet.",
            "If cooldown_active is true, do not issue BUY.",
            "If exited_this_bar or same_day_stopout is true, treat the flat state as fresh. Do not carry forward a stale BUY thesis.",
            "High-severity blockers outweigh marginal reversal quality.",
            "If deterministic_reference.reason is watchlist_setup_strong_location, a BUY is allowed even when trigger_state is watchlist_only, but only when trend_bias is bullish, structure_status is trend_intact, location_state is supportive, and risk_actionable is true.",
            "Do not reject a strong-location watchlist continuation solely because confirmation is mixed when the packet still shows supportive trend, supportive location, and valid risk.",
            "Return compact JSON matching the provided output schema.",
            "Keep thesis and risk_note short and specific to this bar.",
        ]
    )
    return (
        f"{instructions}\n\n"
        f"## Doctrine\n\n{doctrine_text}\n\n"
        f"## Gate\n\n```json\n{gate_json}\n```\n\n"
        f"## Memory\n\n```json\n{memory_json}\n```\n\n"
        f"## Position State\n\n{position_state}\n\n"
        f"## State Packet\n\n```json\n{packet_json}\n```\n"
    )


def render_daily_chart(
    *,
    history_visible: pd.DataFrame,
    context: dict[str, Any],
    symbol: str,
    trade_date: str,
    output_path: Path,
) -> list[str]:
    df = history_visible.copy()
    if df.empty:
        return []
    df["datetime"] = pd.to_datetime(df["datetime"])
    close = pd.to_numeric(df["close"], errors="coerce")
    volume = pd.to_numeric(df["volume"], errors="coerce")
    ema21 = close.ewm(span=21, adjust=False).mean()
    sma50 = close.rolling(50).mean()
    sma200 = close.rolling(200).mean()

    fig, (ax_price, ax_vol) = plt.subplots(
        2, 1, figsize=(12, 8), sharex=True, gridspec_kw={"height_ratios": [3, 1]}
    )
    ax_price.plot(df["datetime"], close, label="Close", color="#1f77b4", linewidth=1.5)
    ax_price.plot(df["datetime"], ema21, label="EMA21", color="#ff7f0e", linewidth=1.0)
    ax_price.plot(df["datetime"], sma50, label="SMA50", color="#2ca02c", linewidth=1.0)
    ax_price.plot(df["datetime"], sma200, label="SMA200", color="#d62728", linewidth=1.0)

    location = context.get("location", {})
    for zone_key, color in (("support_zones", "#2ca02c"), ("resistance_zones", "#d62728")):
        zones = location.get(zone_key, [])
        if not isinstance(zones, list):
            continue
        for zone in zones[:2]:
            if not isinstance(zone, dict):
                continue
            mid = zone.get("mid")
            if isinstance(mid, (int, float)):
                ax_price.axhline(float(mid), color=color, linestyle="--", alpha=0.35)

    risk_map = context.get("risk_map", {})
    for level_key, color in (("stop_level", "#8c564b"), ("next_zone_target", "#9467bd")):
        raw_level = risk_map.get(level_key)
        if isinstance(raw_level, (int, float)):
            ax_price.axhline(float(raw_level), color=color, linestyle=":", alpha=0.6)

    ax_price.set_title(f"{symbol} Daily Technical Context - {trade_date}")
    ax_price.legend(loc="upper left", ncol=4, fontsize=8)
    ax_price.grid(alpha=0.2)

    ax_vol.bar(df["datetime"], volume, color="#7f7f7f", alpha=0.7)
    ax_vol.set_ylabel("Volume")
    ax_vol.grid(alpha=0.15)
    ax_vol.xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m-%d"))
    fig.autofmt_xdate()
    fig.tight_layout()
    fig.savefig(output_path, dpi=140)
    plt.close(fig)
    return [str(output_path)]


def write_schema_file(schema_path: Path) -> None:
    schema_path.write_text(json.dumps(LLM_DECISION_SCHEMA, indent=2), encoding="utf-8")


def _normalize_decision(raw: dict[str, Any]) -> LlmDecision:
    return LlmDecision(
        action=str(raw.get("action", "")).upper(),
        confidence=float(raw.get("confidence", 0.0)),
        reason_code=str(raw.get("reason_code", "")).strip(),
        thesis=str(raw.get("thesis", "")).strip(),
        risk_note=str(raw.get("risk_note", "")).strip(),
        setup_id=str(raw.get("setup_id", "")).strip(),
        holding_bias=str(raw.get("holding_bias", "")).strip(),
        memory_update=str(raw.get("memory_update", "")).strip(),
    )


class CodexCliAdapter:
    def __init__(self, *, model: str = "gpt-5.4-mini", timeout_seconds: int = 180) -> None:
        self.codex_bin = ensure_codex_available()
        self.model = model
        self.timeout_seconds = timeout_seconds

    def infer(
        self,
        *,
        prompt_text: str,
        images: list[str],
        workdir: Path,
        schema_path: Path,
        prompt_path: Path,
        packet_path: Path,
        response_path: Path,
        event_log_path: Path,
        cache_dir: Path,
        cache_material: dict[str, Any],
        trade_date: str,
    ) -> InferenceRecord:
        payload = {
            "model": self.model,
            "prompt_text": prompt_text,
            "schema": LLM_DECISION_SCHEMA,
            "images": images,
            "cache_material": cache_material,
        }
        cache_key = hashlib.sha256(
            json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
        ).hexdigest()
        cache_file = cache_dir / f"{cache_key}.json"
        prompt_path.write_text(prompt_text, encoding="utf-8")
        if cache_file.is_file():
            cached = json.loads(cache_file.read_text(encoding="utf-8"))
            decision = _normalize_decision(cached["decision"])
            return InferenceRecord(
                date=trade_date,
                decision=decision,
                cache_hit=True,
                cache_key=cache_key,
                response_path=cached.get("response_path"),
                event_log_path=cached.get("event_log_path"),
                prompt_path=str(prompt_path),
                packet_path=str(packet_path),
                image_paths=list(images),
            )

        output_message_path = response_path.with_suffix(".message.json")
        cmd = [
            self.codex_bin,
            "exec",
            "--json",
            "--ephemeral",
            "--skip-git-repo-check",
            "--sandbox",
            "read-only",
            "--model",
            self.model,
            "--output-schema",
            str(schema_path),
            "--output-last-message",
            str(output_message_path),
            "-C",
            str(workdir),
            "-",
        ]
        for image_path in images:
            cmd.extend(["--image", image_path])

        completed = subprocess.run(
            cmd,
            input=prompt_text,
            text=True,
            capture_output=True,
            timeout=self.timeout_seconds,
            check=False,
        )
        event_log_path.write_text(completed.stdout, encoding="utf-8")
        if completed.returncode != 0:
            error_text = (
                f"codex exec failed with exit code {completed.returncode}\n"
                f"STDERR:\n{completed.stderr}\n"
            )
            response_path.write_text(error_text, encoding="utf-8")
            raise RuntimeError(error_text)
        raw_message = output_message_path.read_text(encoding="utf-8").strip()
        response_path.write_text(raw_message, encoding="utf-8")
        parsed = json.loads(raw_message)
        decision = _normalize_decision(parsed)
        cache_payload = {
            "decision": asdict(decision),
            "response_path": str(response_path),
            "event_log_path": str(event_log_path),
        }
        cache_file.write_text(json.dumps(cache_payload, indent=2), encoding="utf-8")
        return InferenceRecord(
            date=trade_date,
            decision=decision,
            cache_hit=False,
            cache_key=cache_key,
            response_path=str(response_path),
            event_log_path=str(event_log_path),
            prompt_path=str(prompt_path),
            packet_path=str(packet_path),
            image_paths=list(images),
        )


def decision_to_policy(
    *,
    llm_decision: LlmDecision,
    position_state: str,
    fallback_setup_id: str,
) -> PolicyDecision:
    setup_id = llm_decision.setup_id or fallback_setup_id
    if position_state == "flat":
        if llm_decision.action not in {"BUY", "WAIT"}:
            return PolicyDecision("WAIT", "llm_invalid_action_for_flat", fallback_setup_id, False)
        return PolicyDecision(llm_decision.action, f"llm:{llm_decision.reason_code}", setup_id, False)
    if llm_decision.action not in {"HOLD", "EXIT"}:
        return PolicyDecision("HOLD", "llm_invalid_action_for_long", fallback_setup_id, False)
    return PolicyDecision(llm_decision.action, f"llm:{llm_decision.reason_code}", setup_id, False)
