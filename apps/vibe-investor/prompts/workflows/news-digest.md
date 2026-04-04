# News Digest Workflow

Resolve the effective `TRADING_DAY` and review mode in WIB using the parent prompt's trading-day clock, then run `news-digest`.

Command input may narrow sources/themes/symbols or tighten the date window if that remains compatible with this contract.

## Contract

- Purpose: gather high-signal news/documents since the last successful digest run and write a retained digest artifact.
- Continuity window: 7 calendar days.
- Mandatory memory context: `memory/MEMORY.md`, `memory/market/plan.md`, `memory/notes/portfolio-monitor.md`, `memory/notes/thesis.md`, `memory/notes/watchlist.md`, `memory/theses/**/thesis.md`, `memory/symbols/**/plan.md`, and the latest prior digest if found.
- Data collection is complete only after all paginated `list-documents` results in the window are exhausted for `types: ["news", "analysis", "rumours"]`, relevant documents are read with `get-document`, and any extra web search is used only for material continuity.
- Write the digest artifact to `memory/digests/{TRADING_DAY}_news_digest.md`.
- Leave thesis and watchlist memory unchanged during digest generation.
