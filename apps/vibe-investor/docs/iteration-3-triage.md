# Iteration 3 — Task Triage (Agent POV)

Last updated: 2026-04-03

Evaluation criteria: does this task change the agent's decision quality during desk-check/deep-review synthesis, or is it signal enrichment that the LLM can't meaningfully exploit?

## Drop

| # | Task | Effort | Why drop |
|---|------|--------|----------|
| 3.1 | Strong verdict tiers | Small | Superseded by 2.2 (continuous conviction score). Roadmap already notes this. |
| 3.4 | Multi-type divergence | Small | Pipeline already has `divergence_state` (bullish/bearish/none) from CADI vs price slope. Splitting into three divergence types (CADI, MFI, frequency+Gini) adds complexity without changing the action — the agent's synthesis just needs "is flow diverging from price?" The three-way split produces more categorical labels that get collapsed back into one judgment during synthesis. |
| 3.7 | Rolling trust regime | Medium | Pipeline already computes trust regime over 60D with high/medium/low classification. Agent decisions don't hinge on trust transitions within a 10-session sliding window. When trust degrades, it already shows up in the 30D primary window metrics (coverage, wash risk, correlation). |
| 3.11 | Per-broker persistence table | Medium | Pipeline already has `persistence_score` and `persistence_state` which capture the aggregate signal. Per-broker streak tables, role flip detection, and leader change frequency are granular data the LLM can't meaningfully synthesize during a desk-check. It would be more tokens in flow_context that get summarized back down to "buy persistence is strong." The aggregate already does that. |
| 3.12 | Wyckoff event chains | Small | Presentation formatting on top of 3.10. Even if 3.10 ships, `event_chain` strings and `event_count` are for human readability. The LLM already gets Wyckoff phase from the pipeline; a formatted chain doesn't change its reasoning. |
| 3.15 | Ridge R² | Large | Validation metric, not agent input. R² tells a human researcher "this flow signal has predictive power." The agent doesn't use R² in its decision loop. Meta-analysis tooling, not decision tooling. |
| 3.16 | Rank IC | Large | Same as 3.15. Research infrastructure for human calibration. The agent never sees IC values during a desk-check. Drop together with 3.15. |

## Keep (implementable)

| # | Task | Effort | Why keep |
|---|------|--------|----------|
| 3.3 | Gini concentration | Small | Pipeline uses HHI and GVPR for concentration, but Gini captures the shape of the distribution, not just top-k share. `buy_gini - sell_gini` asymmetry >0.12 is a cleaner institutional accumulation signal than HHI alone. Genuinely new information the agent can't currently derive. |
| 3.5 | Regime thresholds | Small | Correctness fix. Current thresholds are way off IDX reality (Large >10T vs AlphaFlow ≥40T, High liquidity >50B vs ≥500B). Agent is classifying mid-caps as large-caps, which distorts trust regime and weight profile selection. Fixes a real calibration error. |
| 3.6 | Stock beta | Small | Pipeline has no concept of stock volatility relative to IHSG. Once 2.7 (aggression curve) ships, beta is the natural refinement: high-beta stock in weak regime gets steeper sizing discount. Real gap, uses existing OHLCV data, no new data source needed. |
| 3.8 | High volatility regime | Small | Current weight profiles don't adapt to volatility conditions. ATR-based detection that shifts to elevated MFI weight addresses a real gap: in high-vol regimes, MFI is more informative than persistence. Small effort, meaningful weight profile improvement. |
| 3.9 | Net accumulation price | Small | VWAP of net positive flow days gives the agent a concrete anchor: "smart money's average cost basis is X." When current price is below net accumulation price, that's a meaningful signal the agent currently can't derive. High interpretability, cheap to compute. |

## Research (conditional keep)

These earn an implementation slot only if the research resolves cleanly. Do not commit to implementation until research questions are answered.

| # | Task | Effort | Research gate |
|---|------|--------|---------------|
| 3.2 | SMT score | Medium | Component weights (AlphaFlow guide vs live UI discrepancy), absorption detection algorithm, normalization to 0-100. If research stalls, the current pipeline's CADI + persistence + concentration already covers most of what SMT measures. |
| 3.10 | Wyckoff PS/PSY | Medium | Detection heuristics for PS and PSY events — what volume/price/close-position thresholds distinguish PS from noise? Risk is false precision: noisy heuristics the agent trusts too much. Only implement if heuristics validate against known phase history examples. |
| 3.13 | SMT confidence | Small | Blocked on 3.2. If 3.2 ships, this is a small add. If 3.2 doesn't ship, this is moot. |
| 3.14 | Participant flow | Medium | Broker-to-participant-type mapping for IDX is the hard part. Foreign vs retail flow is genuinely different signal from current pipeline output, but mapping sourcing and maintenance burden is real. Only implement if a reliable, maintainable mapping can be sourced. |
