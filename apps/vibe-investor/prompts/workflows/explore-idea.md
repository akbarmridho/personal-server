# Explore Idea Workflow

Resolve the effective `TRADING_DAY` and review mode in WIB using the parent prompt's trading-day clock, then run `explore-idea`.

Command input may narrow sectors/themes, tighten the date window, or add output emphasis if that remains compatible with this contract.

## Contract

- Purpose: discover new interesting names, sectors, mechanisms, and catalysts outside the active operating set, plus resurface dormant internal candidates.
- Discovery lanes are mandatory:
  - External discovery lane: search for names and themes not already central to active holdings, watchlist, or theses.
  - Internal resurfacing lane: rescan dormant watchlist names, inactive theses, or older symbol plans that were reviewed rarely.
- Current holdings, active theses, and active watchlist names are novelty filters, not the primary discovery universe, except for the internal resurfacing lane.
- Discovery is not news-only: candidate generation may come from filings, analysis, rumours, sector/theme linkages, ownership/governance changes, mechanism-led situations, and neglected internal names.
- Continuity window: 30 calendar days for external discovery; internal resurfacing is not limited by that window.
- Mandatory memory context: `memory/MEMORY.md`, `memory/notes/ihsg.md`, `memory/notes/macro.md`, `memory/notes/thesis.md`, `memory/notes/watchlist.md`, `memory/state/theses/**/thesis.md`, `memory/state/symbols/**`, and the latest prior explore-idea artifact if found.
- Run order: broad discovery and clustering first using internal knowledge sources and selected external corroboration; then lightweight symbol triage on shortlisted candidates; then parent synthesis across fresh candidates, resurfaced candidates, and discarded candidates.
- `narrative-analysis` is the lead discovery lens. `technical-analysis` is the lightweight structural filter. `flow-analysis` is used when sponsor behavior could materially upgrade or disqualify a candidate. `fundamental-analysis` is selective.
- Default mutation rule: write the retained exploration artifact only. Promotion into durable watchlist/thesis/symbol state requires an explicit follow-up workflow or explicit user instruction.
- Market artifacts must include `explore_idea.md`.
