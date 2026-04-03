---
name: portfolio-management
description: Internal trading-desk and portfolio operations subsystem for IDX equities, including desk-check reviews, position sizing, trading plans, watchlist process, and portfolio discipline routines.
---

## How To Use This Skill

Use this file as the entrypoint. Do not load every reference by default.

1. Classify the request by internal workflow type (see Common Workflows below).
2. Resolve an explicit reference-file list for the selected workflow.
3. Read the selected reference files before running the workflow.
4. Execute with tools and memory updates.
5. If the request spans multiple areas, resolve and read multiple reference sets deliberately.

Tool source of truth:

- Use `portfolio_state` as the source of truth for current holdings, cash, equity, and compact portfolio summary fields such as position count, cash ratio, top positions, and recent actions.
- Use `portfolio_trade_history` for raw trade rows and realized analytics depending on `view`.
- Use `portfolio_symbol_trade_journey` for symbol-level lifecycle review, current-position context, and postmortem setup.
- Use symbol memory as the durable operating plan, not as the live execution ledger.
- If a one-off calculation is still needed after using the portfolio tools, create and run a temporary script under `work/` and treat it as disposable scratch, not as a permanent skill script.

## Concepts And School Of Thought

- Treat portfolio management as a risk operating system: capital preservation first, return second.
- Use explicit risk budgets, not only raw target weights: `risk_per_trade`, `portfolio_heat`, and hard caps are first-class controls.
- Size exposure with deterministic controls (1% risk rule, portfolio heat, concentration caps, 50:30:10, theme clustering, and correlation clustering).
- Enforce liquidity-aware execution using ADTV constraints so exits remain feasible under stress.
- Apply a regime-sensitive aggression ladder before new longs; if breadth/market structure weakens, reduce aggression, slow adds, and protect cash.
- Review process quality separately from outcome. Do not let a profitable result excuse weak underwriting, and do not let a loss erase a process that remained disciplined and evidence-based.
- Use a two-tier IHSG cash-floor ladder (EMA21/SMA50/SMA200) as a regime overlay: base floors set minimum cash, escalated floors apply when broader red flags confirm trouble.
- Use `holding_mode` to change sizing posture and portfolio expectations: `TACTICAL` names should be smaller and easier to exit, `THESIS` names may deserve wider holding tolerance, and `HYBRID` names sit between them.
- Use durable `Active Scenarios` in symbol and thesis state when they exist. Scenario transitions can justify adds, trims, de-risking, or thesis retirement before hard invalidation is hit.
- Portfolio management does not own raw symbol exits. It owns portfolio-level overrides when heat, concentration, liquidity, or regime require action beyond the symbol-level baseline.
- Run workflow discipline end-to-end (entry, add, exit, rebalance, review) with explicit invalidation and process checks.
- Use durable state files as the system of record; decisions are only complete when portfolio/watchlist/symbol/thesis states are updated and the derived registry is refreshed.
- Consume technical exit doctrine from `technical-analysis`; this skill does not redefine raw chart-level TP rules.
- Keep the durable symbol plan separate from live portfolio truth. Store the intended operating plan in memory; store actual holdings, fills, remaining size, and P/L in portfolio tools.

## Default Doctrine

This skill's default doctrine incorporates postmortem-derived portfolio rules and repeated trading lessons.

- Act as a risk operating companion for the human investor in IDX, not just as an idea generator.
- Protect capital first, then optimize upside.
- When this doctrine conflicts with a more aggressive interpretation from another lens, this doctrine wins unless the user explicitly accepts the quantified risk.
- For buy, add, hold-escalation, and re-entry decisions, enforce trade classification, minimum underwriting fields, evidence discipline, invalidation discipline, and winner-management rules from `references/trading-plan-template.md`.
- For reviews, re-entry checks, and postmortems, enforce benchmark/style discipline and the postmortem-upgrade loop from `references/review-watchlist-and-review-logging.md`.
- Trade classification is not identical to `holding_mode`, but they should usually agree at the operating level.
- During reviews and postmortems, explicitly separate:
  - process quality
  - P&L outcome
  - evidence change since the prior review
- Do not let recent gains justify oversized risk, late adds, or loosened discipline. Do not let recent losses justify revenge trading or abandoning a sound process without evidence.

## Shared Labels And Health Flags

Shared labels used by this skill:

- Stock categories: `CORE`, `VALUE`, `GROWTH`, `SPECULATIVE`
- Watchlist statuses: `WATCHING`, `READY`, `ACTIVE`, `REMOVED`
- Conviction: `HIGH`, `MEDIUM`, `LOW`
- Fundamental valuation: `UNDERVALUED`, `FAIR`, `OVERVALUED`
- Correlation role: `DIVERSIFIER`, `NEUTRAL`, `CONCENTRATOR`
- Timeframe: `SWING`, `POSITION`, `LONG_TERM`
- Regime aggression state: `AGGRESSIVE`, `NORMAL`, `DEFENSIVE`, `CAPITAL_PRESERVATION`

Portfolio health flags:

- `PM-W01` Single position exceeds 30% weight
- `PM-W02` Speculative allocation exceeds 10%
- `PM-W03` Less than 50% in MoS >30% positions
- `PM-W04` Sector limit breached (>2 per sector)
- `PM-W05` Portfolio heat exceeds 6%
- `PM-W06` Correlation clustering (`corr > 0.75`) between large holdings
- `PM-W07` Position size exceeds 5% of ADTV
- `PM-W08` Portfolio flat/red while IHSG at new highs
- `PM-W09` Multiple leaders invalidated in the same review window
- `PM-W10` Thesis stale (no review within cadence)
- `PM-W11` Cash ratio below IHSG regime cash floor

Health flag metadata:

| Flag | Meaning | Severity | Source type |
|------|---------|----------|-------------|
| `PM-W01` | Single position exceeds 30% weight | `HIGH` | deterministic |
| `PM-W02` | Speculative allocation exceeds 10% | `HIGH` | deterministic |
| `PM-W03` | Less than 50% in MoS >30% positions | `MEDIUM` | deterministic |
| `PM-W04` | Sector limit breached (>2 per sector) | `MEDIUM` | deterministic |
| `PM-W05` | Portfolio heat exceeds 6% | `HIGH` | deterministic |
| `PM-W06` | Correlation clustering (`corr > 0.75`) between large holdings | `MEDIUM` | deterministic |
| `PM-W07` | Position size exceeds 5% of ADTV | `HIGH` | deterministic |
| `PM-W08` | Portfolio flat/red while IHSG at new highs | `HIGH` | agent judgment |
| `PM-W09` | Multiple leaders invalidated in the same review window | `HIGH` | agent judgment |
| `PM-W10` | Thesis stale (no review within cadence) | `MEDIUM` | deterministic |
| `PM-W11` | Cash ratio below IHSG regime cash floor | `HIGH` | deterministic |

## Risk Budgets And Sizing Doctrine

Use explicit risk budgets before target weights.

Core controls:

- `risk_per_trade`: default 1% of portfolio equity, scaled down when conviction, liquidity, or stop quality is weak
- `portfolio_heat`: max 5-6% total open risk across live positions
- hard caps: no sizing rule may override concentration, liquidity, or heat caps

Within those guardrails, conviction can change the size. Outside them, the trade must be reduced or skipped.

Diversification by capital size:

| Capital Range | Max Stocks | Allocation |
|---------------|------------|------------|
| < Rp 100M | 5 | 2 core + 3 value |
| Rp 100M - 1B | 10 | 4 core + 6 value |
| > Rp 1B | 15 | 6 core + 9 value |

The 50:30:10 rule:

| Rule | Constraint | Rationale |
|------|------------|-----------|
| 50% Minimum | >=50% of portfolio in stocks with MoS >30% | Keeps most capital in undervalued positions |
| 30% Maximum | No single stock >30% of portfolio | Prevents attachment and concentration |
| 10% Maximum | Speculative/high-risk stocks <=10% total | Contains downside from risky bets |
| Sector Limit | <=2 stocks per sector | Enforces true diversification |

Correlation-aware diversification:

- Corr > 0.75 with an existing large holding: reduce target size or skip
- Corr 0.40-0.75: allow with reduced size and explicit portfolio role
- Corr < 0.40: strongest diversification benefit
- In broad risk-off periods, assume correlations rise toward 1.0 and increase cash buffer

Theme and cluster concentration:

- Sector limits alone are not enough
- Also check whether the name adds to an already crowded theme, macro driver, or factor cluster
- If the same driver is already crowded, reduce size, trim elsewhere first, or skip

Liquidity-based sizing:

| Position size vs ADTV | Liquidity risk |
|------------------------|----------------|
| <= 1% of ADTV | Low |
| 1-5% of ADTV | Medium (needs staged exits) |
| > 5% of ADTV | High (assume slippage + long exit time) |

If size is too large relative to liquidity, prefer smaller size, staged exits, or skip.

1% risk rule:

```text
Position Size = (Portfolio x 1%) / (Entry Price - Stop Loss)
```

- max portfolio heat: 5-6% total open risk
- conviction scaling: high conviction 1.5%, low conviction 0.5%
- conviction scaling only applies after liquidity, concentration, and heat constraints pass

Holding-mode sizing posture:

- `TACTICAL`: smallest default size, fastest trim discipline, strongest demand for easy exits and clean invalidation
- `HYBRID`: middle posture; respect both opportunity and staying power
- `THESIS`: can tolerate more patience, but still must fit liquidity, concentration, and heat budgets

Holding mode changes posture, not hard limits.

Hard-loss fallback:

- Primary stop should come from thesis/structure invalidation
- If no clean invalidation level exists, use a fallback cap
- Default fallback cap: 7-8% from entry
- If volatility/liquidity is unusually high, reduce size instead of widening risk
- Never let fallback cap override a tighter, higher-quality technical invalidation

## Reference Index And Topic Ownership

| File | Topics |
|------|--------|
| [trading-plan-template.md](references/trading-plan-template.md) | Per-symbol plan structure for `memory/state/symbols/{SYMBOL}.md`, trade classification, minimum underwriting fields, evidence discipline, invalidation discipline, winner management |
| [review-watchlist-and-review-logging.md](references/review-watchlist-and-review-logging.md) | Daily/weekly/monthly review cadence, watchlist management, retained review-summary templates, benchmark/style discipline, re-entry discipline, postmortem upgrade loop |
| This file (SKILL.md) | Shared labels, health flags, risk budgets, sizing doctrine, market regime gate, mixed-signal arbitration, entry/exit/rebalance doctrine, capital preservation principles, and operating rules |

Reference boundary:

- References provide doctrine, checklists, and templates only.
- Workflow execution, write targets, and mutation rules are owned by this skill and the active workflow contract.

## Data Sources And Fail-Fast

| Source | Used for | If unavailable |
|--------|----------|----------------|
| `portfolio_state` | Current holdings, cash, equity, unrealized state, position count, cash ratio, top positions, recent actions | Stop |
| `portfolio_trade_history` | Raw trade rows, realized history slices, and aggregate realized analytics | Stop |
| `portfolio_symbol_trade_journey` | Symbol-level lifecycle review, current-position context, and postmortem setup | Stop |
| `get-stock-financials` | Dividend checks, fundamental monitoring | Stop |
| `fetch-ohlcv` | Rolling return/correlation, rebalance diagnostics | Stop |
| `search-documents`, `list-documents` | Filings/news monitoring for open positions | Stop |
| Filesystem memory files | Primary operating surface | Stop |

Stop: if fetch fails, stop the task and report dependency failure.

## Memory Files

| File | Purpose |
|------|---------|
| `memory/notes/portfolio-monitor.md` | Current open-book classification, active monitor rules, health flags, and next portfolio-level focus |
| `memory/notes/opportunity-cost.md` | Missed-move ledger for READY symbols, WAIT age, and re-underwrite pressure from inaction |
| `memory/notes/watchlist.md` | Human-readable watchlist summary view |
| `memory/registry/symbols.json` | Derived current-state symbol registry for fast watchlist and leader lookup |
| `memory/state/symbols/{SYMBOL}.md` | Per-symbol plan, thesis, invalidation, sizing, and resolved execution policy |
| `memory/runs/{DATE}/{TIME}_desk-check.json` | Successful desk-check continuity log written by the parent workflow |
| `memory/analysis/symbols/{SYMBOL}/{DATE}/` | Supporting analysis artifacts |
| `memory/analysis/market/{DATE}/desk_check.md` | Top-level desk-check summary |

## Operating Rules

- Capital preservation is first priority; upside is secondary. A 50% loss requires 100% gain to recover.
- No thesis, no hold. If invalidation is hit, exit.
- Do not average down after thesis break.
- Every new position must fit an explicit `risk_per_trade` budget and the current `portfolio_heat` budget.
- Position size must be liquidity-aware before entry.
- Keep portfolio heat controlled (max 5-6%); avoid hidden concentration via high correlation, common theme exposure, and clustered factor bets.
- Use `holding_mode` to scale allowable patience and size, but never to bypass hard risk caps.
- Rebalance bands are review guides for trim/add discipline, not a license to build optimizer-style research-implied weights.
- Use only machine-verifiable rules for decisions (tool data + memory state), not discretionary outside context.
- If risk process is violated, fix process first before taking new exposure.
- Use `portfolio_state` and symbol-trade tools as live position truth; use symbol memory for the latest intended plan and exit policy.
- Use durable symbol memory for the operating plan only. Do not write live lots, execution timestamps, running P/L, or temporary execution state into the symbol plan.

## Market Regime Gate

Before any new long exposure, check market regime.

Evidence: `fetch-ohlcv` on market proxy + leader basket from `memory/registry/symbols.json` (fallback: `memory/notes/watchlist.md` when registry is missing or stale).

Resolve one aggression state:

- `AGGRESSIVE`: broad structure constructive, leader breadth healthy, and no fresh breakdown clustering. Normal-to-high conviction sizing allowed inside all hard caps.
- `NORMAL`: mixed but acceptable structure. Base sizing allowed, but adds should remain selective.
- `DEFENSIVE`: weakening structure or growing breakdown cluster. Reduce aggression, tighten sizing, prefer trims over fresh expansion.
- `CAPITAL_PRESERVATION`: broad weakness, leader breakdowns clustering, or regime quality clearly poor. No new longs, including pilots; cash only.

The regime gate controls how much of the available risk budget may be used. It does not replace symbol-level invalidation, chart doctrine, or parent-workflow synthesis.

Rate-of-change read:

- Do not assess regime from static levels alone. Also assess whether market conditions are improving, stable, or deteriorating versus the prior review window.
- Include rate-of-change judgment for breadth, leader health, breakdown clustering, and risk appetite. Inflections matter before full breakdowns become obvious.
- If direction of change is deteriorating, reduce aggression before the damage is fully expressed in price.

IHSG cash overlay:

- Use IHSG moving averages (EMA21, SMA50, SMA200) as a regime-based cash overlay, not as a standalone trading signal.
- Resolve the current IHSG moving-average state from the active market-context evidence before portfolio conclusions.
- Base cash floor ladder:
  - IHSG below EMA21: keep at least 30% cash and reduce new-risk aggression.
  - IHSG below SMA50: keep at least 50% cash and treat the tape as damaged.
  - IHSG below SMA200: keep at least 70% cash and operate in capital-preservation mode.
- Escalated cash floor: when the base floor is active and additional red flags are present (multiple portfolio health warnings, clustering leader breakdowns, negative narrative/news flow, or deteriorating stock-level setups across the book), escalate the floor by +10pp to 40% / 60% / 80% respectively.
- Apply the highest active floor only. If IHSG is below SMA200 with red flags, the operative minimum cash floor is 80%.
- Treat this as a floor, not an exact target. Holding more cash is allowed.
- Exception trades are allowed only when stock-level structure, flow, and invalidation are strong enough to justify them, and they still must fit hard portfolio caps.
- During `desk-check` and before any new long/add recommendation, compare `portfolio_state.cash_ratio` against the active cash floor (base or escalated), carry any shortfall into the portfolio findings and monitor update, and state whether the escalated floor applies.

## Mixed-Signal Arbitration

When lenses disagree, apply this hierarchy:

1. hard invalidation from the active symbol-level baseline
2. portfolio override when heat, liquidity, concentration, or regime requires de-risking
3. parent-workflow synthesis across thesis quality, timeframe intent, flow, narrative, and fundamentals
4. discretionary adds or trims inside the remaining risk budget

Practical implications:

- PM may block or reduce adds even when symbol-level lenses remain constructive.
- PM may force trims when portfolio constraints are breached.
- PM does not replace the raw symbol-level exit engine owned by other lenses.
- If conflict remains ambiguous after hard rules and portfolio overrides, prefer the safer sizing path.

## Entry, Exit, And Rebalance Doctrine

Entry discipline:

- Prefer entries during drawdowns when weakness is temporary and the long-term thesis remains valid
- Avoid discount entries when decline is driven by permanent impairment

Pilot entry pathway:

- Use `entry_type = PILOT` when a READY symbol has an explicit thesis, explicit invalidation, evidence grade `1`-`3`, and a live `WAIT` that has persisted for at least 2 desk-checks while the thesis remains intact, but the full BUY gate stack is still incomplete because the trigger is absent, confirmation is mixed, or regime is only `DEFENSIVE`.
- Pilot size defaults to 0.25% of portfolio equity and is capped at 0.5%.
- Pilot entries must still pass these reduced gates: thesis quality at least `MEDIUM` with evidence grade `1`-`3`, explicit invalidation and stop, regime is `DEFENSIVE` or better, liquidity is acceptable, and no portfolio override blocks the name.
- Pilot entries may proceed on daily location with partial or developing confirmation, neutral-or-better flow, and acceptable but imperfect RR.
- A pilot is a probe, not a commitment. `trade_classification` remains `THESIS`, `TACTICAL`, or `SPECULATION` based on thesis quality and operating intent.
- If the full BUY trigger fires after pilot entry, scale using the normal full-gate process.
- If invalidation is hit, exit the pilot.
- If the pilot makes no progress for 3+ desk-checks with no trigger and no invalidation, exit the pilot and downgrade the symbol to `WATCHING`.
- Track pilot plans with `Entry type`, `Reduced pilot gates used`, `Scale-up trigger`, and `Pilot expiry` in the symbol plan.
- Maximum 2 active pilots at any time.
- Pilot positions count toward `portfolio_heat` and liquidity limits.
- Pilot positions are excluded from the 50:30:10 allocation test because they are sub-sized probes.
- A pilot cannot be scaled above pilot size without passing the full BUY gates.

Entry posture options:

- `DCA`: best for core/stable stocks
- `Lump Sum`: best for value stocks with confirmed momentum
- `Scale Down`: only on fundamentally sound businesses and only when thesis remains valid
- `Scale Up`: only if the prior tranche is green and thesis/structure remain valid

Pyramid discipline:

- Add only if the prior tranche is green and thesis/structure remains valid
- Do not add to losing positions
- After adding, tighten risk so aggregate trade does not violate portfolio heat limits

Exit doctrine:

- Profit taking can be staged as price approaches intrinsic value
- Early exits are acceptable when better opportunity needs cash, portfolio cash is too low, market outlook worsens, or sizing limits are breached
- Cut-loss framework distinguishes permanent fundamental change/governance violation from temporary noise
- Portfolio-management consumes symbol-level exits and may add portfolio overrides; it does not replace the raw exit engine owned by other lenses

Rebalancing protocol:

- Baseline cadence: quarterly, monthly only for highly active books
- Drift trigger: rebalance when weight deviates >20% from target
- Event trigger: rebalance/replace when thesis breaks, governance risk appears, or liquidity deteriorates
- Use rebalance bands as trim/add guidance, not as an optimizer-style target engine
- Trim outperformers and add underweights only if thesis remains valid
- If thesis breaks, replace the name; do not mechanically top up losers
- Prefer replacements with lower correlation to current core holdings and acceptable liquidity
- Skip tiny rebalance trades with no material risk impact

## Deterministic vs Agent-Judgment Boundary

| Check | Type | How |
|-------|------|-----|
| Position weight vs 30% cap | Deterministic | Tool data: position value / total portfolio |
| Risk per trade vs budget | Deterministic | Entry, stop, and intended size versus portfolio equity |
| Portfolio heat calculation | Deterministic | Sum of (risk per trade) across open positions |
| Correlation between holdings | Deterministic | `fetch-ohlcv` rolling correlation |
| ADTV liquidity check | Deterministic | Position size vs ADTV from tool data |
| Holding-mode sizing posture | Mixed | Deterministic ceiling by `holding_mode`, adjusted by judgment for conviction and quality |
| 50:30:10 compliance | Deterministic | Category weights from memory + tool data |
| Sector concentration | Deterministic | Count per sector from memory |
| Theme or cluster concentration | Mixed | Deterministic grouping when obvious; agent judgment when theme linkage is qualitative |
| Thesis stale check | Deterministic | Last review date vs cadence |
| Checkpoint failure | Deterministic | `Progress checkpoint date` passed without required condition being met |
| WAIT staleness count | Deterministic | `active_recommendation.wait_desk_check_count` on READY symbols carrying `WAIT` |
| IHSG cash floor vs current cash ratio | Deterministic | Apply the highest active IHSG cash floor (base 30/50/70 keyed to EMA21/SMA50/SMA200, or escalated 40/60/80) and compare it with `portfolio_state.cash_ratio` |
| Regime aggression state | Agent judgment | Interpret market proxy structure, leader breadth, and breakdown clustering |
| Thesis quality assessment | Agent judgment | Synthesize fundamentals, narrative, flow |
| Portfolio override decision | Agent judgment | Decide whether heat, liquidity, concentration, or regime requires trimming despite symbol thesis remaining intact |
| Cut-loss vs hold decision | Agent judgment | Evaluate whether decline is permanent impairment or noise |

## Common Workflows

### New Position Entry

1. Check regime gate (this file).
2. Check the active IHSG cash floor and confirm current `portfolio_state.cash_ratio` is compatible with any planned new exposure.
3. Map the symbol to `holding_mode` from the trading plan (`TACTICAL`, `THESIS`, or `HYBRID`) and apply the corresponding sizing posture.
4. Choose `entry_type = FULL` or `entry_type = PILOT`. For `PILOT`, enforce the reduced pilot gates, max 0.5% size, max 2 active pilots, and `CAPITAL_PRESERVATION` block.
5. Validate sizing against portfolio constraints (`risk_per_trade`, `portfolio_heat`, `50:30:10` for `FULL` entries, theme/correlation clustering, and ADTV liquidity).
6. Load `trading-plan-template.md`, fill all required fields including `Entry type`, `Holding mode`, and final exit precedence. For `PILOT`, also fill `Reduced pilot gates used`, `Scale-up trigger`, and `Pilot expiry`.
7. Write plan to `memory/state/symbols/{SYMBOL}.md`.
8. Update `memory/notes/watchlist.md` when the plan changes watchlist status or trigger conditions.
9. Refresh `memory/registry/state.json` and `memory/registry/symbols.json` after the state change.

Checklist: regime aggression state resolved, IHSG cash floor checked against current cash ratio, `entry_type` selected, pilot constraints enforced when relevant, `holding_mode` posture applied, sizing validated, liquidity cleared, hidden concentration checked, resolved execution policy written, memory files updated, registry refreshed.

### Desk Check Review

1. Load `review-watchlist-and-review-logging.md` for cadence checklist.
2. Call `portfolio_state` for holdings input and compact summary. If missing or malformed, stop.
3. Use `portfolio_trade_history` with `view: "events"` plus a tight `limit` when recent operator behavior matters for the review window.
4. Use `portfolio_symbol_trade_journey` for names that need symbol-level lifecycle context, realized review, or postmortem setup.
5. For each position: check thesis status, active scenario, scenario switch conditions, stop levels, invalidation quality, resolved execution policy, sizing compliance, `Last Reviewed`, review cadence, and checkpoint status from `portfolio_state`, symbol memory, and trade-history context.
6. Check whether any `Progress checkpoint date` has passed and evaluate the stored checkpoint failure action.
7. For each READY symbol carrying `active_recommendation.action = WAIT`, increment `active_recommendation.wait_desk_check_count`, inspect `retest_status`, and force one of these outcomes when `wait_desk_check_count >= 3` and `retest_status = not_tested`: upgrade to actionable with an adjusted entry, downgrade to `WATCHING` with an explicit reason, or renew the `WAIT` with fresh evidence and a new trigger level. Repeating the same `WAIT` with no new evidence is not a valid renewal.
8. For each READY symbol where current price is more than 5% above the last recommended entry zone, compute the missed move from that entry zone to current price and record it in `memory/notes/opportunity-cost.md`. A missed move above 10% forces re-evaluation of whether the setup family, entry zone, or underwriting threshold needs to be refreshed. `wait_desk_check_count > 5` also forces re-underwrite or expiry.
9. Check portfolio-level: current `portfolio_heat`, concentration, hidden clustering, sizing flags, regime aggression state, active IHSG cash floor, current cash ratio, cumulative missed opportunity from the opportunity-cost ledger, and recent action context from the tool outputs.
10. Extend coverage to watchlist symbols required by the active workflow contract.
11. Where the live operating plan changed materially, prepare symbol-memory updates for `holding_mode`, exit precedence, non-TA exit drivers, `Entry type`, pilot lifecycle fields, rebalance-band notes, `Last Reviewed`, `active_recommendation`, and other resolved execution-policy fields.
12. Prepare the updated portfolio-monitor state and opportunity-cost ledger for the parent workflow.
13. If watchlist or symbol state changes, refresh the derived registry before the parent workflow writes the success log.
14. Return portfolio findings, portfolio-monitor update content, opportunity-cost update content, watchlist changes, and any required follow-up actions to the parent workflow.

Checklist: all holdings reviewed, risk budgets checked, current `portfolio_heat` reported, active IHSG cash floor checked against current cash ratio, checkpoint failures checked, stale plans checked, WAIT staleness checked, opportunity cost checked, active pilot count and pilot expiry checked, hidden concentration checked, portfolio overrides assessed, resolved execution-policy drift checked, portfolio-monitor and opportunity-cost update content prepared, registry refresh requirement identified when state changed, portfolio findings returned to the parent workflow.

### Deep Review

1. Load `review-watchlist-and-review-logging.md` for benchmark/style discipline, re-entry discipline, stale-plan thresholds, and retained review expectations.
2. Call `portfolio_state` for holdings input and compact summary. If missing or malformed, stop.
3. Use `portfolio_trade_history` with both `view: "events"` and `view: "realized_stats"` when the review needs operator-behavior context, realized contribution, and system-level performance diagnostics.
4. Use `portfolio_symbol_trade_journey` for names that need lifecycle context, realized postmortem setup, or high-friction decision review.
5. Build the review universe from current holdings, active watchlist names required by the parent workflow, and a required resurfacing set of stale or neglected watchlist names and symbol plans.
6. For each reviewed symbol: check thesis status, active scenario, scenario switch conditions, stop levels, invalidation quality, resolved execution policy, sizing compliance, `Last Reviewed`, review cadence, checkpoint status, and whether the name still deserves scarce portfolio attention.
7. Check portfolio-level: current `portfolio_heat`, concentration, hidden clustering, sizing flags, regime aggression state, active IHSG cash floor, current cash ratio, benchmark behavior versus `IHSG` and relevant leaders, and current best-ideas density.
8. Review system quality, not only holdings: equity-curve behavior, realized versus unrealized contribution mix, style drift, repeated re-entry mistakes, stale plans, redundant names, cluttered watchlist entries, and process debt.
9. Prepare cleanup proposals for watchlist status, symbol-plan refreshes, thesis hygiene, portfolio-monitor state, and any portfolio override actions backed by the review evidence.
10. If watchlist, symbol, or thesis state changes, refresh the derived registry before the parent workflow writes the success log.
11. Return portfolio findings, neglected-name resurfacing findings, process-quality findings, cleanup actions, and portfolio-monitor update content to the parent workflow.

Checklist: holdings reviewed, stale or neglected names resurfaced, realized and unrealized context checked, best-ideas density assessed, current `portfolio_heat` reported, active IHSG cash floor checked against current cash ratio, hidden concentration checked, benchmark and leader comparison completed, style drift checked, portfolio overrides assessed, cleanup actions prepared, registry refresh requirement identified when state changed, portfolio findings returned to the parent workflow.

### Position Exit

1. Determine exit type: cut-loss, profit-taking, or early exit.
2. Confirm whether the exit is coming from the symbol-level baseline (`technical_plan` / thesis invalidation) or from a portfolio override (heat, concentration, liquidity, regime).
3. Execute exit, update `memory/state/symbols/{SYMBOL}.md` with close details and any final execution-policy outcome that matters for future review.
4. Update `memory/notes/watchlist.md` when the exit changes watchlist status or follow-up monitoring state.
5. Refresh `memory/registry/state.json` and `memory/registry/symbols.json` after the state change.
6. Post-exit: evaluate process quality, not outcome.

Checklist: exit source documented (symbol baseline vs portfolio override), symbol/watchlist memory updated where needed, registry refreshed, process review noted.

### Rebalance Check

1. Check drift triggers (>20% deviation from target or beyond the intended holding-mode band).
2. Check event triggers (scenario transition, thesis break, governance, liquidity, or regime deterioration).
3. For replacements: check correlation with remaining holdings.
4. Check hidden clustering before replacing one name with another similar driver.
5. Skip tiny trades with no material risk impact.

Checklist: drift measured, holding-mode band reviewed, event triggers checked, hidden clustering reviewed, replacement correlation validated, transaction cost considered.

## Execution Defaults

- When invoked by a parent workflow, coordinate findings with other active skills and return structured results.
- Run required data fetches in parallel when the task is a full portfolio or position review.
- Prefer portfolio tools first. Use temporary scripts in `work/` only for one-off calculations that the current tool surface does not provide.
- Write concrete outputs to memory files for portfolio-management workflows, not only narrative answers.
- Keep symbol-memory trade-management fields aligned with the parent workflow's resolved execution plan; do not let raw TA output bypass that synthesis layer.
- When constraints conflict (`conviction` vs liquidity, thesis quality vs hidden clustering, valuation vs correlation), prefer the safer sizing path.
- Treat `risk_per_trade`, `portfolio_heat`, liquidity caps, and concentration caps as hard guardrails before discretionary conviction scaling.
- Treat portfolio overrides as a separate layer after symbol-level analysis: PM can force trims or reduced aggression, but it should not redefine the raw symbol-level exit engine owned by other lenses.
- Use rebalance bands to guide trim/add decisions during reviews, not to create optimizer-style target weights unsupported by the current tool surface.
- Check regime gate before any new long exposure.
- Enforce the active IHSG cash floor before endorsing fresh risk, and flag a shortfall when `portfolio_state.cash_ratio` is below that floor.
- Flag any portfolio health warnings (`PM-W01` through `PM-W11`) when detected during any workflow.
