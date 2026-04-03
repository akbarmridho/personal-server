# Iteration 3 — Task Triage (Agent POV)

Last updated: 2026-04-03

Evaluation criteria: does this task change the agent's decision quality during desk-check/deep-review synthesis, or is it signal enrichment that the LLM can't meaningfully exploit?

Reviewed by two independent LLMs. Final verdict reflects consensus with disagreements resolved inline.

## Drop

| # | Task | Effort | Why drop |
|---|------|--------|----------|
| 3.1 | Strong verdict tiers | Small | Superseded by 2.2 (continuous conviction score). Roadmap already notes this. |
| 3.7 | Rolling trust regime | Medium | Pipeline already computes trust regime over 60D with high/medium/low classification. Agent decisions don't hinge on trust transitions within a 10-session sliding window. When trust degrades, it already shows up in the 30D primary window metrics (coverage, wash risk, correlation). |
| 3.11 | Per-broker persistence table | Medium | Pipeline already has `persistence_score` and `persistence_state` which capture the aggregate signal. Per-broker streak tables, role flip detection, and leader change frequency are granular data the LLM can't meaningfully synthesize during a desk-check. More tokens in flow_context that get summarized back down to "buy persistence is strong." |
| 3.12 | Wyckoff event chains | Small | Not a standalone task. The pipeline already stores events within each Wyckoff segment — 3.12 just pre-formats them as a chain string (`"PSY → PSY → AR → ST"`). The LLM already sees the events list. If 3.10 ships, add the chain string as a freebie in that PR. If 3.10 doesn't ship, this is moot. |
| 3.15 | Ridge R² | Large | The trust regime already does this job heuristically — `trust_level` and `ticker_flow_usefulness` gate how much weight flow gets in synthesis, derived from liquidity, market cap, coverage, wash risk, and Spearman correlation. R² would give a more precise version of the same signal ("how much should you trust flow for this ticker?"), but the agent can't act on it differently than it acts on the current categorical trust levels. LLMs calibrate better on categorical guidance ("discount flow here") than continuous statistical metrics. Additionally, credible R² needs hundreds of sessions with train/test split and walk-forward validation — far beyond the current 60-session fetch window. The task spec itself flags this data-length problem. If R² eventually reveals that flow is systematically useless for certain stock profiles, the right fix is a one-time trust regime threshold update, not feeding R² to the agent every run. This is a "validate the system" tool, not a "run the system" tool. |
| 3.16 | Rank IC | Large | Same infrastructure and data-length problems as 3.15. IC is also a cross-sectional metric — it answers "does the flow signal rank stocks correctly relative to each other?" The agent reviews stocks one at a time during desk-check; it never compares flow signal quality across its watchlist in a way IC would answer. IC is useful for a quant building a portfolio optimizer, not for an LLM doing sequential symbol reviews. Drop together with 3.15. |

## Keep (implementable)

Implementation order reflects priority: bug fix first, then new signals, then items gated on Iteration 2.

| Order | # | Task | Effort | Depends on | Why keep |
|-------|---|------|--------|------------|----------|
| 1 | 3.5 | Regime thresholds | Small | — | Bug fix. Current thresholds are way off IDX reality (Large >10T vs AlphaFlow ≥40T, High liquidity >50B vs ≥500B). Agent is classifying mid-caps as large-caps, distorting trust regime and weight profile selection. Highest priority because it's actively wrong. |
| 2 | 3.3 | Gini concentration | Small | — | Pipeline uses HHI and GVPR for concentration, but Gini captures the shape of the distribution, not just top-k share. `buy_gini - sell_gini` asymmetry >0.12 is a cleaner institutional accumulation signal than HHI alone. Genuinely new information. |
| 3 | 3.4 | Multi-type divergence (narrowed) | Small | 3.3 | Narrowed scope: add freq+Gini divergence only (skip MFI divergence as a separate channel — MFI state is already in the pipeline). Freq+Gini divergence captures hidden accumulation that the single CADI-vs-price divergence misses. Only meaningful after 3.3 provides the Gini computation. |
| 4 | 3.9 | Net accumulation price | Small | — | VWAP of net positive flow days gives the agent a concrete anchor: "smart money's average cost basis is X." When current price is below net accumulation price, that's a meaningful signal. High signal-to-token ratio, cheap to compute. |
| 5 | 3.8 | High volatility regime | Small | — | Current weight profiles don't adapt to volatility conditions. ATR-based detection that shifts to elevated MFI weight addresses a real gap: in high-vol regimes, MFI is more informative than persistence. |
| 6 | 3.6 | Stock beta | Small | 2.7 | Pipeline has no concept of stock volatility relative to IHSG. Once 2.7 (aggression curve) ships, beta is the natural refinement: high-beta stock in weak regime gets steeper sizing discount. Best shipped after 2.7 lands. |

All six are small effort. 3.5 through 3.9 can be batched before Iteration 2 ships. 3.6 waits for 2.7.

## Skip

| # | Task | Effort | Why skip |
|---|------|--------|----------|
| 3.2 | SMT score | Medium | After 2.2 ships, `flow_assessment.conviction_score` already covers the same ground. A standalone SMT score alongside a flow conviction score creates two overlapping scoring surfaces. The current pipeline's CADI + persistence + concentration already captures most of what SMT measures through different metrics. Skip unless AlphaFlow parity is explicitly wanted. |
| 3.13 | SMT confidence | Small | Blocked on 3.2. If 3.2 is skipped, this is moot. |

## Notes

### Ad-hoc deep-dive escalation (replaces 3.11 and similar "more detail" requests)

Several dropped tasks (3.11 per-broker persistence, 3.7 rolling trust, 3.4 multi-divergence in its full form) share a pattern: the aggregate signal is enough for desk-check synthesis, but a single-symbol deep dive sometimes wants the granular breakdown.

Instead of building these into the deterministic pipeline (where they add tokens to every flow_context.json that get compressed back to one sentence during multi-symbol review), handle this through skill-level escalation guidance:

- The flow-analysis SKILL.md should document that the agent can access raw `fetch-broker-flow` output directly and generate ad-hoc Python scripts under `work/` when a single-symbol analysis needs granular detail beyond what `flow_context.json` provides.
- The skill should specify when to escalate: single-symbol deep dive, conflicting signals that need broker-level inspection, sponsor quality assessment where the aggregate persistence score is borderline, or when the user explicitly asks for broker-level detail.
- This keeps the standard pipeline lean (no extra tokens in desk-check) while preserving full analytical depth on demand.

This is a skill prompt edit, not a pipeline code change. Add it when implementing the Iteration 3 keeps.

## Research (conditional keep)

These earn an implementation slot only if the research resolves cleanly. Do not commit to implementation until research questions are answered.

| # | Task | Effort | Research gate |
|---|------|--------|---------------|
| 3.10 | Wyckoff PS/PSY | Medium | Detection heuristics for PS and PSY events — what volume/price/close-position thresholds distinguish PS from noise? Risk is false precision: noisy heuristics the agent trusts too much. Only implement if heuristics validate against known phase history examples. |
| 3.14 | Participant flow | Medium | Two gates: (1) a reliable broker-to-participant-type mapping can be sourced for IDX, and (2) a maintenance plan exists for keeping it current (broker codes shift via new brokers, mergers, desk reassignments). If the mapping requires manual quarterly updates, price that cost in before committing. Stale mapping = agent trusts wrong labels silently. |
