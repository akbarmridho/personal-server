# Desk Check Workflow

Resolve the effective `TRADING_DAY` and review mode in WIB using the parent prompt's trading-day clock, then run `desk-check`.

Command input may narrow symbol focus, tighten the date window, or add output emphasis if that remains compatible with this contract.

## Contract

- Purpose: daily operator routine. Surface what changed, flag what needs human attention, monitor thesis health, enforce portfolio discipline.
- Coverage universe: holdings from `portfolio_state`, plus watchlist symbols in `READY`, plus watchlist symbols marked as leaders.
- Continuity window: 1 calendar day.
- Mandatory memory context: `memory/market/plan.md`, `memory/notes/agent-performance.md`, `memory/notes/opportunity-cost.md`, and `get_state({ types: ["portfolio-monitor", "watchlist"] })`.
- Run order: `portfolio-management` for holdings, discipline, and IHSG cash-overlay checks first using `portfolio_state` summary plus targeted `portfolio_trade_history` / `portfolio_symbol_trade_journey` calls and current IHSG context, then delegated symbol-batch subagents and top-down market subagent in parallel, then parent synthesis.
- Symbol review delegation: after the `portfolio-management` pass, group the coverage universe into batches of 3-5 symbols by theme, sector, or thesis affinity when possible and delegate each batch to a subagent. Each subagent runs `technical-analysis`, `flow-analysis`, and `narrative-analysis` for its assigned symbols and writes retained artifacts to memory before returning. The parent agent must not run symbol-level TA/flow/narrative inline. Top-down market review is a separate subagent delegation, run in parallel with symbol batches when possible.
- Flow analysis should fetch broker-flow plus OHLCV, build deterministic `flow_context`, and reason from that packet rather than from raw broker tables.
- Flow analysis is most relevant when the symbol is actively held or near actionable review, sponsor behavior could change conviction materially, or parent synthesis needs lead / confirm / warning context versus TA.
- Narrative analysis prioritizes new evidence, catalyst changes, and thesis-invalidating developments over full report formatting.

## Synthesis Output

Parent synthesis produces a `symbol_review` (per main.md contract) for each materially reviewed symbol. The synthesis must:

- State the active thesis and whether it is intact, strengthening, weakening, or invalidated.
- Reconcile the technical risk map with broker-flow context, thesis quality, narrative changes, optional scenario branches, and any portfolio hard rail or size-cap constraint.
- Surface tensions between lenses honestly — do not collapse them into a single verdict.
- End each symbol review with `human_attention`: what the human needs to decide or be aware of.
- For holdings: flag any deterioration, thesis drift, or exit signals. When all lenses converge negative, state the exit case directly.
- For watchlist symbols: flag material changes, new catalysts, or thesis invalidation. Track missed moves in opportunity-cost ledger.
- Report cumulative missed opportunity from `memory/notes/opportunity-cost.md` alongside `portfolio_heat`.
- Compare decisions against `memory/notes/agent-performance.md`.

On every successful run, read `memory/notes/opportunity-cost.md` and update it in place for `TRADING_DAY`: add new rows for newly READY symbols, update existing rows with current prices, missed moves, and current status. Do not rewrite the file from scratch.

- Symbol artifacts must include at least `technical.md`, `narrative.md`, and, when flow is used materially, `flow.md` plus important chart/evidence artifacts (`*.png`, context JSON if needed).
- Market artifacts must include `desk_check.md`.
- `memory/market/desk_check.md` must include a `symbol_review` section for each materially reviewed symbol per the synthesis contract in main.md.
- If a possible fundamental break is detected, record `Needs Manual Fundamental Review` instead of launching a full fundamental workflow inline.
