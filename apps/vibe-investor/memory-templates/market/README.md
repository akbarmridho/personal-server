# Market Memory Contract

Market-level artifacts live in `memory/market/`. Three core files plus chart artifacts.

## Required Artifacts

### `plan.md` — Operating Stance

The durable market operating document. Owned by the parent agent, updated after every desk-check and deep-review.

Sections:

- **IHSG Regime**: current state (markup / distribution / markdown / accumulation), which MAs are held/lost, Wyckoff phase, whether the rally/decline is tested or untested.
- **Key Levels**: IHSG resistance, support, invalidation, reclaim gates. Updated on material changes.
- **Operating Stance**: current `regime_aggression` value and rationale, cash overlay target, live cash ratio, positioning deadlines or gates.
- **Macro Cross-Check**: key prices and macro data points affecting IDX — oil, CPO, coal, nickel, aluminium, gold, USDIDR, CDS, reserves, inflation, GDP. Only what's active and material.
- **Dominant Driver**: what is moving the market right now. One paragraph, honest about what's real vs noise.
- **Breadth / Leadership**: which sectors/themes are leading, which are lagging, breadth health, key names driving the tape.
- **Sleeve Priority**: ranked list of active theses/sleeves with current status and positioning context.
- **Near-Term Catalysts**: dated list of upcoming events that matter for positioning.
- **Notes**: anything else material.

Update rule: update on every successful desk-check or deep-review if the market context changed materially. "Materially" means: regime changed, key level broken/reclaimed, macro driver shifted, operating stance needs adjustment, or sleeve priority changed.

### `technical.md` — IHSG Technical Analysis

TA skill output applied to IHSG. Different from symbol-level TA — includes market-specific sections.

Sections:

- **IHSG Latest Read**: close, MA posture, state/regime/bias, Wyckoff phase, value context.
- **Support / Resistance / Reclaim Map**: key levels with context.
- **Technical Bias**: overall bias assessment, active red flags, setup status.
- **Breadth / Leader Health**: leader basket MA status (how many above/below key MAs), which clusters are strong/weak.
- **Macro Proxies**: USDIDR, Brent, CPO, and other relevant macro prices with their MA posture.
- **Evidence Artifacts**: links to chart PNGs and context JSONs.

### `narrative.md` — Market Narrative

Narrative skill output applied to the market level.

Sections:

- **One-Liner**: single sentence market posture summary.
- **Active Macro Narratives**: ranked by market impact. Each with current state, evidence, and direction.
- **Sleeve Narratives**: per-thesis/sleeve narrative status (improving, stable, deteriorating).
- **What Changed**: since last narrative update. Honest delta, not a rewrite.
- **What To Monitor Next**: upcoming events and signals that could shift the narrative.

### Chart Artifacts

The top-down market subagent also produces chart PNGs and context JSONs for IHSG:

- `IHSG_daily_structure.png`
- `IHSG_intraday_structure.png`
- `IHSG_structure_events.png`
- `IHSG_wyckoff_history.png`
- `IHSG_vpvr_profile.png`
- `IHSG_ta_context.json`

## Top-Down Market Subagent

Desk-check and deep-review delegate a top-down market review to a subagent, run in parallel with symbol batches. The subagent must:

1. Run `technical-analysis` on IHSG — fetch IHSG OHLCV, produce `technical.md` with regime assessment, key levels, breadth/leader health, macro proxies, and chart artifacts.
2. Run `narrative-analysis` at the market level — use the current digest, macro data, and sector context to produce `narrative.md` with ranked narratives, sleeve status, and catalyst outlook.
3. Write all artifacts to `memory/market/`.
4. Return a structured summary for the parent synthesis: IHSG regime, key level status, breadth health, macro tone, dominant driver, and any regime change signals.

The parent agent then uses this summary plus the PM skill's regime aggression table to update `plan.md` and set the operating stance for the session.
