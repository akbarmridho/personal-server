#!/usr/bin/env python3

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any


def connector_data_root() -> Path:
    raw = os.environ.get("AI_CONNECTOR_DATA_ROOT")
    if raw:
        return Path(raw).expanduser().resolve()

    opencode_cwd = os.environ.get("OPENCODE_CWD")
    if opencode_cwd:
        return (Path(opencode_cwd).expanduser().resolve().parent / "client-connector-data").resolve()

    raise RuntimeError("AI_CONNECTOR_DATA_ROOT is required")


def latest_portfolio_path() -> Path:
    return connector_data_root() / "stockbit" / "normalized" / "latest_portfolio.json"


def read_latest_portfolio() -> dict[str, Any]:
    path = latest_portfolio_path()
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"Invalid portfolio snapshot: {path}")
    return payload


def to_float(value: object) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def parse_stop_from_symbol_note(path: Path) -> float | None:
    if not path.exists():
        return None

    for line in path.read_text(encoding="utf-8").splitlines():
        lower = line.lower()
        if "stop" not in lower and "invalidation" not in lower:
            continue
        if ":" not in line:
            continue
        raw = line.split(":", 1)[1].strip().replace(",", "")
        try:
            value = float(raw)
        except ValueError:
            continue
        if value > 0:
            return value
    return None
