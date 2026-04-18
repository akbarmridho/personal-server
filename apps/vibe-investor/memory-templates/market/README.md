# Market Memory Contract

Market-level artifacts live in `memory/market/`. Two core files plus chart artifacts.

## Required Artifacts

### `plan.md` — Operating Stance + IHSG Technical

The durable market operating document. Owned by the parent agent, updated after every desk-check and deep-review.

Sections:

- **IHSG Technical ({score}) — {bias}**: TA lens summary for IHSG. Current state interpretation (3-5 sentences), Bull/Bear factors, scenarios (A/B/C), dominant scenario. References `IHSG_ta_context.json` for structured data — does not restate levels, MA posture details, Wyckoff phase history, or red flag codes. Same format as symbol plan.md lens summaries.
- **Key Levels**: IHSG resistance, support, invalidation, reclaim gates. Updated on material changes.
- **Operating Stance**: current `regime_aggression` value and rationale, cash overlay target, live cash ratio, positioning deadlines or gates.
- **Macro Cross-Check**: key prices and macro data points affecting IDX — oil, CPO, coal, nickel, aluminium, gold, USDIDR, CDS, reserves, inflation, GDP. Only what's active and material.
- **Dominant Driver**: what is moving the market right now. One paragraph, honest about what's real vs noise.
- **Breadth / Leadership**: which sectors/themes are leading, which are lagging, breadth health, key names driving the tape.
- **Sleeve Priority**: ranked list of active theses/sleeves with current status and positioning context.
- **Near-Term Catalysts**: dated list of upcoming events that matter for positioning.

Update rule: update on every successful desk-check or deep-review if the market context changed materially. "Materially" means: regime changed, key level broken/reclaimed, macro driver shifted, operating stance needs adjustment, or sleeve priority changed. Use `edit` for surgical updates on desk-check, not full rewrites.

### `narrative.md` — Market Narrative

Narrative skill output applied to the market level.

Sections:

- **One-Liner**: single sentence market posture summary.
- **Active Macro Narratives**: ranked by market impact. Each with current state, evidence, and direction.
- **Sleeve Narratives**: per-thesis/sleeve narrative status (improving, stable, deteriorating).
- **What Changed**: since last narrative update. Honest delta, not a rewrite.
- **What To Monitor Next**: upcoming events and signals that could shift the narrative.

### Chart Artifacts

The top-down market subagent produces chart PNGs and context JSONs for IHSG:

- `IHSG_daily_structure.png`
- `IHSG_intraday_structure.png`
- `IHSG_structure_events.png`
- `IHSG_wyckoff_history.png`
- `IHSG_vpvr_profile.png`
- `IHSG_ta_context.json`
- `IHSG_chart_evidence.json`

## Top-Down Market Subagent

Desk-check and deep-review delegate a top-down market review to a subagent, run in parallel with symbol batches. The subagent must:

1. Run `technical-analysis` on IHSG — fetch IHSG OHLCV, produce `IHSG_ta_context.json`, `IHSG_chart_evidence.json`, and chart PNGs. Write the IHSG Technical lens summary directly into `plan.md` (using `edit` on UPDATE, `write` on INITIAL).
2. Run `narrative-analysis` at the market level — use the current digest, macro data, and sector context to produce `narrative.md` with ranked narratives, sleeve status, and catalyst outlook.
3. Write all artifacts to `memory/market/`.
4. Return a structured summary for the parent synthesis: IHSG regime, key level status, breadth health, macro tone, dominant driver, and any regime change signals.

The parent agent then uses this summary plus the PM skill's regime aggression table to update `plan.md` Operating Stance and set the operating stance for the session.
