# Desk Check Workflow

Resolve the effective `TRADING_DAY` and review mode in WIB using the parent prompt's trading-day clock, then run `desk-check`.

Command input may narrow symbol focus, tighten the date window, or add output emphasis if that remains compatible with this contract.

## Contract

- Purpose: main operator routine for holdings review, watchlist trigger review, portfolio discipline, and top-down market context.
- Coverage universe: holdings from `portfolio_state`, plus watchlist symbols in `READY`, plus watchlist symbols marked as leaders.
- Continuity window: 1 calendar day.
- Mandatory memory context: `memory/market/plan.md`, `memory/notes/portfolio-monitor.md`, `memory/notes/agent-performance.md`, `memory/notes/opportunity-cost.md`.
- Run order: `portfolio-management` for holdings, discipline, and IHSG cash-overlay checks first using `portfolio_state` summary plus targeted `portfolio_trade_history` / `portfolio_symbol_trade_journey` calls and current IHSG context, then delegated symbol-batch subagents and top-down market subagent in parallel, then parent synthesis.
- Symbol review delegation: after the `portfolio-management` pass, group the coverage universe into batches of 3-5 symbols by theme, sector, or thesis affinity when possible and delegate each batch to a subagent. Each subagent runs `technical-analysis`, `flow-analysis`, and `narrative-analysis` for its assigned symbols and writes retained artifacts to memory before returning. The parent agent must not run symbol-level TA/flow/narrative inline. Top-down market review is a separate subagent delegation, run in parallel with symbol batches when possible.
- Flow analysis should fetch broker-flow plus OHLCV, build deterministic `flow_context`, and reason from that packet rather than from raw broker tables.
- Flow analysis is most relevant when the symbol is actively held or near actionable review, sponsor behavior could change conviction materially, or parent synthesis needs lead / confirm / warning context versus TA.
- Narrative analysis prioritizes new evidence, catalyst changes, and thesis-invalidating developments over full report formatting.
- Parent synthesis must reconcile the technical exit baseline with broker-flow context, thesis quality, timeframe intent, narrative changes, optional scenario branches from analysis artifacts, any portfolio hard rail or size-cap constraint, and the stale-`WAIT` ladder from `main.md` before updating symbol memory.
- During parent synthesis, report cumulative missed opportunity from `memory/notes/opportunity-cost.md` alongside `portfolio_heat`, compare decisions against `memory/notes/agent-performance.md`, flag `systematic under-deployment` when 0 entries persist for 3+ desk-checks while `READY` names exist, and require an explicit justification for continued inaction.
- On every successful run, refresh `memory/notes/opportunity-cost.md` for `TRADING_DAY` with current `READY` symbols, last recommended entry zones, current prices, missed moves, WAIT age, and current status.
- Symbol artifacts must include at least `technical.md`, `narrative.md`, and, when flow is used materially, `flow.md` plus important chart/evidence artifacts (`*.png`, context JSON if needed).
- Market artifacts must include `desk_check.md`.
- `memory/market/desk_check.md` must include a `composite_decision` section for each materially reviewed symbol with all lens scores, `composite_score`, `action_tier`, `base_size_pct`, `final_size_pct`, `conflict_note`, and `hard_rails_applied`.
- If a possible fundamental break is detected, record `Needs Manual Fundamental Review` instead of launching a full fundamental workflow inline.
