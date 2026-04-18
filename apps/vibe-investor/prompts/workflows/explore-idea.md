# Explore Idea Workflow

Resolve the effective `TRADING_DAY` and review mode in WIB using the parent prompt's trading-day clock, then run `explore-idea`.

Command input may narrow sectors/themes, tighten the date window, or add output emphasis if that remains compatible with this contract.

## Contract

- Purpose: discover new interesting names, sectors, mechanisms, and catalysts outside the active operating set, plus resurface dormant internal candidates. Present findings as thesis candidates for human review.
- Discovery lanes are mandatory:
  - External discovery lane: search for names and themes not already central to active holdings, watchlist, or theses.
  - Internal resurfacing lane: rescan dormant watchlist names, inactive theses, or older symbol plans that were reviewed rarely.
- Current holdings, active theses, and active watchlist names are novelty filters, not the primary discovery universe, except for the internal resurfacing lane.
- Discovery is not news-only: candidate generation may come from filings, analysis, rumours, sector/theme linkages, ownership/governance changes, mechanism-led situations, neglected internal names, and social signals.
- Social discovery (delegated to subagent): runs Twitter list CLI + `get-stockbit-stream` to surface rotation themes, sector chatter, and ticker mentions from curated accounts. Subagent triages and returns only high-signal findings (themes, tickers, engagement spikes). Raw social data stays in subagent context.
- Continuity window: 30 calendar days for external discovery; internal resurfacing is not limited by that window.
- Mandatory memory context: `memory/market/plan.md`, all other `.md` files in `memory/market/` (list and read), `get_state`, and the latest prior explore-idea artifact if found. Surface any `get_state` warnings (staleness, status mismatches) in the output.
- Run `market-pulse` early. Use trending stocks, screener hits (52w highs, volume breakouts, foreign flow uptrend), and mover data as discovery inputs alongside knowledge base and social signals. Screener hits that are not in the current watchlist are prime exploration candidates.
- Run order: broad discovery and clustering first using internal knowledge sources and selected external corroboration; then lightweight symbol triage on shortlisted candidates; then parent synthesis across fresh candidates, resurfaced candidates, and discarded candidates.
- `narrative-analysis` is the lead discovery lens. `technical-analysis` is the lightweight structural filter. `flow-analysis` is used when sponsor behavior could materially upgrade or disqualify a candidate. `fundamental-analysis` is selective.

## Output

For each candidate, produce a thesis candidate summary:

- What the thesis is (one sentence)
- Why now (what changed or what was missed)
- Key evidence for and against
- What the human would need to believe to act on this
- Risk map if available (invalidation, key levels)
- What further work is needed before this is actionable

Do not produce action recommendations. Present candidates for human evaluation.

- Default mutation rule: write the retained exploration artifact only. Promotion into durable watchlist/thesis/symbol state requires an explicit follow-up workflow or explicit user instruction.
- Market artifacts must include `explore_idea.md`.
