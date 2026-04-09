# Desk Check Workflow

Resolve the effective `TRADING_DAY` and review mode in WIB using the parent prompt's trading-day clock, then run `desk-check`.

Command input may narrow symbol focus, tighten the date window, or add output emphasis if that remains compatible with this contract. Include `skip-digest` in command input to skip Phase 1 (useful for mid-day re-checks or when digest was already run).

## Phases

### Phase 1: News Digest + Sync (skip with `skip-digest`)

Gather and integrate new information before reviewing.

1. **Digest collection.** Gather high-signal news/documents since the last successful digest run.
   - Data collection is complete only after all paginated `list-documents` results in the window are exhausted for `types: ["news", "analysis", "rumours"]`, relevant documents are read with `get-document`, and any extra web search is used only for material continuity.
   - Continuity window: 7 calendar days from last successful digest run.
   - Write the digest artifact to `memory/digests/{TRADING_DAY}_news_digest.md`.

2. **Digest sync.** Update thesis/watchlist memory from the digest.
   - Update `memory/theses/{THESIS_ID}/thesis.md` only for evidence-backed timeline changes and scenario-branch updates.
   - Update `memory/symbols/{SYMBOL}/plan.md` only for explicit evidence-backed status or trigger changes.
   - If evidence is ambiguous, mark `Needs Verification` — do not change thesis/watchlist state.
   - Link memory changes to the digest path and supporting document URLs.

### Phase 2: Portfolio + Market Context

- Run `portfolio-management` for holdings, discipline, and IHSG cash-overlay checks using `portfolio_state` summary plus targeted `portfolio_trade_history` / `portfolio_symbol_trade_journey` calls and current IHSG context.
- Mandatory memory context: `memory/market/plan.md`, `memory/notes/agent-performance.md`, `memory/notes/opportunity-cost.md`, and `get_state({ types: ["portfolio-monitor", "watchlist"] })`.

### Phase 3: Symbol Reviews (delegated)

- Coverage universe: holdings from `portfolio_state`, plus watchlist symbols in `READY`, plus watchlist symbols marked as leaders.
- Group the coverage universe into batches of 3-5 symbols by theme, sector, or thesis affinity when possible and delegate each batch to a subagent. Each subagent runs `technical-analysis`, `flow-analysis`, and `narrative-analysis` for its assigned symbols and writes retained artifacts to memory before returning. The parent agent must not run symbol-level TA/flow/narrative inline.
- Top-down market review is a separate subagent delegation, run in parallel with symbol batches when possible.
- Flow analysis should fetch broker-flow plus OHLCV, build deterministic `flow_context`, and reason from that packet rather than from raw broker tables.
- Flow analysis is most relevant when the symbol is actively held or near actionable review, sponsor behavior could change conviction materially, or parent synthesis needs lead / confirm / warning context versus TA.
- Narrative analysis prioritizes new evidence, catalyst changes, and thesis-invalidating developments over full report formatting.

### Phase 4: Synthesis

Parent synthesis produces output for each reviewed symbol, triaged by urgency per main.md:

- `NO_CHANGE` symbols: one-line status in a summary table.
- `MONITOR` symbols: brief note on what shifted and what to watch.
- `ATTENTION` and `EXIT_SIGNAL` symbols: full `symbol_review` per main.md contract.

The synthesis must:

- State the active thesis and whether it is intact, strengthening, weakening, or invalidated.
- Reconcile the technical risk map with broker-flow context, thesis quality, narrative changes, optional scenario branches, and any portfolio hard rail or size-cap constraint.
- Surface tensions between lenses honestly — do not collapse them into a single verdict.
- End each symbol review with `human_attention`: what the human needs to decide or be aware of.
- For holdings: flag any deterioration, thesis drift, or exit signals. When all lenses converge negative, state the exit case directly.
- For watchlist symbols: flag material changes, new catalysts, or thesis invalidation. Track missed moves in opportunity-cost ledger.
- Report cumulative missed opportunity from `memory/notes/opportunity-cost.md` alongside `portfolio_heat`.
- Compare decisions against `memory/notes/agent-performance.md`.

On every successful run, read `memory/notes/opportunity-cost.md` and update it in place for `TRADING_DAY`: add new rows for newly READY symbols, update existing rows with current prices, missed moves, and current status. Do not rewrite the file from scratch.

## Artifacts

- Symbol artifacts must include at least `technical.md`, `narrative.md`, and, when flow is used materially, `flow.md` plus important chart/evidence artifacts (`*.png`, context JSON if needed).
- Market artifacts must include `desk_check.md`.
- Digest artifact at `memory/digests/{TRADING_DAY}_news_digest.md` (Phase 1).
- `memory/market/desk_check.md` must include the triaged symbol reviews per the synthesis contract in main.md.
- If a possible fundamental break is detected, record `Needs Manual Fundamental Review` instead of launching a full fundamental workflow inline.
