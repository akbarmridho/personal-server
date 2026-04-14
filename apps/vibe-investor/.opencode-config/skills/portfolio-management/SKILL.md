---
name: portfolio-management
description: Internal trading-desk and portfolio operations subsystem for IDX equities, including desk-check reviews, position sizing, trading plans, watchlist process, and portfolio discipline routines.
---

## How To Use This Skill

1. Classify the request by workflow type (entry, desk-check, deep-review, exit, rebalance).
2. Read this skill before running the workflow.

Tool source of truth: `portfolio_state` for live holdings/cash/equity, `portfolio_trade_history` for trade rows and realized analytics, `portfolio_symbol_trade_journey` for symbol-level lifecycle, `get_state` for frontmatter lookup and derived portfolio-monitor state. Symbol memory is the durable operating plan, not the live ledger.

## Core Doctrine

- Protect capital and deploy capital with equal weight. Express through sizing, hard rails, and `regime_aggression`.
- Portfolio target: 4-6 positions, 8 absolute max. Concentrated book, not a diversified fund.
- Risk budgets before target weights: `risk_per_trade`, `portfolio_heat`, and hard caps are first-class controls.
- Liquidity-aware sizing: exits must remain feasible under stress.
- Regime-sensitive aggression: weaker market = lower aggression, slower adds, more cash.
- Review process quality separately from outcome.
- PM does not own entry decisions — the human decides whether to enter. PM owns portfolio-level sizing constraints, de-risking rails, and hard safety rails.
- PM does not own symbol-level exits. It owns portfolio-level sizing constraints, de-risking rails, and hard safety rails.
- Consume TA-owned invalidation; do not redefine chart-level TP rules.
- Durable symbol plan is the operating plan. Live holdings/P&L live in portfolio tools.

## Role in Synthesis

Portfolio management provides **constraint math and risk context** for the parent synthesis:

- Portfolio heat, concentration, and liquidity constraints
- Regime aggression from IHSG context
- Maximum position size available
- Hard rails that block action regardless of thesis quality
- Sizing math when the human decides to act (human picks conviction bucket, PM applies mechanical caps)

PM does not produce buy/sell recommendations. It tells the human "here's how much room you have and what the risk math looks like."

## Health Flags

`get_state` computes W01, W02, W10 deterministically. The rest are agent-checked during desk-check.

| Flag | Meaning | Severity |
|------|---------|----------|
| `PM-W01` | Single position exceeds 25% weight | `HIGH` |
| `PM-W02` | Speculative allocation exceeds 20% | `HIGH` |
| `PM-W04` | Sector limit breached (>2 per sector) | `MEDIUM` |
| `PM-W05` | Portfolio heat exceeds 10% (warning; hard block at 15% per main prompt) | `HIGH` |
| `PM-W06` | Correlation clustering (corr > 0.75) between large holdings | `MEDIUM` |
| `PM-W07` | Position size exceeds 5% of ADTV | `HIGH` |
| `PM-W08` | Portfolio flat/red while IHSG at new highs | `HIGH` |
| `PM-W09` | Multiple leaders invalidated in same window | `HIGH` |
| `PM-W10` | Thesis stale (no review within cadence) | `MEDIUM` |
| `PM-W11` | Cash ratio below IHSG cash target | `HIGH` |

## Portfolio Constraints Contract

```yaml
portfolio_constraints:
  heat_budget_remaining_pct: 5.0
  max_new_position_size_pct: 15.0
  regime_aggression: 0.8
  cash_target_status: above
  concentration_flags: []
  hard_rails_triggered: []
```

- `max_new_position_size_pct`: caps from concentration, correlation, liquidity, theme pressure.
- `regime_aggression` (0.4-1.5): caps from IHSG regime, breadth, beta, cash shortfall.
- `hard_rails_triggered`: binary stops only — `portfolio_heat_breach`, `single_position_cap_breach`, `thesis_invalidated`, `very_low_liquidity`, `pilot_slot_limit`.

## Sizing

- `risk_per_trade`: default 2% of equity. High conviction 3%, low conviction 1%.
- `portfolio_heat`: operating target 10-12% total open risk. Hard block at 15% (main prompt).
- `final_size_pct = min(base_size_pct, max_new_position_size_pct) * regime_aggression`.
- Hard-loss fallback: 7-8% from entry when no clean TA invalidation exists. Reduce size instead of widening risk.
- Holding mode changes posture, not hard limits: `TACTICAL` (smallest, fastest trim), `HYBRID` (middle), `THESIS` (most patience).

Position caps:

| Rule | Constraint |
|------|------------|
| Single position | Max 25% of portfolio |
| Speculative total | Max 20% of portfolio |
| Sector | Max 2 stocks per sector |

Concentration checks: correlation > 0.75 with large holding → compress sharply. Theme/cluster crowding → compress and flag. Liquidity: >5% of ADTV → hard rail; 1-5% → staged exits.

## Regime Aggression

Resolve before any new long. Evidence: IHSG OHLCV + leader basket from `get_state`.

| IHSG state | Base | Improving breadth | Deteriorating breadth |
|------------|------|-------------------|-----------------------|
| Above all key MAs, healthy | 1.2 | 1.5 | 1.0 |
| Above SMA50, below EMA21 | 0.8 | 1.0 | 0.7 |
| Below SMA50, above SMA200 | 0.5 | 0.7 | 0.4 |
| Below SMA200 | 0.4 | 0.5 | 0.4 |

Floor is 0.4. Adjust for leader health, breakdown clustering, rate of change, and portfolio-weighted beta. If deteriorating, reduce before damage is fully expressed.

IHSG cash overlay (soft budget, not hard wall):

- Below EMA21: target 30% cash (escalated 40%)
- Below SMA50: target 50% cash (escalated 60%)
- Below SMA200: target 70% cash (escalated 80%)

Escalate +10pp when multiple health warnings, clustering breakdowns, or negative news flow. Pilots (≤ 5%) always allowed regardless of cash target.

## Pilot Entry

Use when the human decides to take a pilot position.

- Base size: 3% of equity, capped at 5% before `regime_aggression`.
- Gates: thesis quality ≥ MEDIUM, evidence grade 1-3, TA invalidation exists, `regime_aggression >= 0.4`, liquidity acceptable, no hard rail triggered.
- No harvest on pilots. First action is "add to STARTER" or "exit."
- Escalation: when price holds above stop for 5 sessions + narrative intact, flag to human that add to STARTER is available. Human decides.
- Expiry: no progress for 3+ desk-checks → flag to human for decision (exit or hold with fresh rationale).
- Max 2 active pilots.

## Entry, Exit, Rebalance

Entry: prefer drawdowns when thesis intact. Do not average down after thesis break. Pyramid only when prior tranche is green and structure valid.

Exit: PM consumes symbol-level exits and applies portfolio hard rails. Exit source must be documented (symbol baseline vs portfolio rail). Post-exit: evaluate process, not outcome.

Rebalance: quarterly baseline. Drift trigger >20%. Event trigger on thesis break, governance risk, or liquidity deterioration. Skip tiny trades with no material risk impact.

## Trading Discipline

### Trade Classification Gate

Before endorsing any new buy, add, or hold escalation, explicitly classify the trade:

- `THESIS` for durable multi-driver views with higher-tier evidence and longer holding tolerance
- `TACTICAL` for setup-driven or catalyst-window trades with shorter holding intent
- `SPECULATION` for low-evidence, rumor-led, or optionality-heavy trades where uncertainty dominates

Do not let these categories blur. If a trade changes category, say so explicitly. `SPECULATION` should not silently drift into `THESIS` because price moved favorably first.

### Evidence Hierarchy

Grade thesis quality in this order:

1. official filings / company disclosures
2. company profile / financials / hard operating data
3. internal analysis documents
4. external news / web sources
5. social discussion
6. rumor

Do not treat rumor as the base thesis unless the trade is explicitly labeled `SPECULATION`. Treat rumor as optionality unless supported by higher-tier evidence. If size is high while evidence quality is low, warn clearly. Size must scale with evidence quality, not excitement.

### Invalidation And Winner Discipline

- If technical structure breaks, say it clearly. Do not let narrative hope override invalidation.
- No averaging down below broken structure unless evidence is better than before and chart repair is visible.
- Build and reduce size in tranches, not all-in / all-out by default.
- Add only when thesis and structure remain valid and either the prior tranche is working or the plan explicitly allows a staged pullback add near a predefined favorable zone with unchanged invalidation.
- Reduce progressively when evidence weakens, even before full invalidation, if the plan defines that downgrade path.
- Require staged trim logic for trades with clear upside targets.
- Warn against target drift after planned targets are reached. Do not let a winning trade silently mutate into a round-trip loser.
- If the trade requires active monitoring and the investor is unlikely to provide it, reduce aggression.

### Minimum Required Fields (New Entry)

Trade Classification, Entry type, Thesis, Catalyst, Invalidation, Expected holding period, Position size and stop loss, Expected R:R, Entry build, Size reason, Monitoring requirement, Timeframe + `Last Reviewed` + review cadence, Progress checkpoint and failure action, Trade-management policy (`Holding mode` + `Final exit precedence`). For `PILOT`: also Reduced pilot gates used, Scale-up trigger, Pilot expiry.

No entry should be executed without these fields filled. If missing, treat the trade as underdefined and downgrade conviction.

### Cross-Skill Dependencies

Lens score fields come from multiple sources:

- Technical score: `technical_assessment.conviction_score` plus one-line driver summary.
- Flow score: `flow_assessment.conviction_score` plus sponsor/trust/timing context from `flow_context`.
- Narrative score: `narrative_assessment.conviction_score` plus catalyst and failure-risk context.
- Fundamental score: `fundamental_assessment.conviction_score` plus valuation anchor / quality context when loaded.
- Portfolio fit score, composite score, aggression multiplier, and final size: parent workflow synthesis using `portfolio_constraints`.
- Correlation Role: computed from `fetch-ohlcv` rolling correlation (deterministic).

If a contributing skill is not active, fill the field with best available assessment and note the source limitation.

Default holding-mode inference for first-pass workflows: `CORE` + `LONG_TERM` → `THESIS`, `SPECULATIVE` + `SWING` → `TACTICAL`, everything else → `HYBRID`. The workflow may override this.

## Symbol Plan Template

The full plan template lives in `memory/symbols/README.md` under "Symbol Plan Body Template". Read it before creating or fully rewriting a symbol plan. The template defines frontmatter schema and all body sections (Thesis, Catalyst, Active Scenarios, Lens Scores, Plan, Trade Management, Invalidation, Open Position Monitoring, Notes, Digest Sync).

## Review Discipline

### Benchmark And Style Discipline

- During reviews, compare portfolio behavior against `IHSG` and relevant sector leaders.
- Watch for frustration-driven style drift.
- Prefer best-ideas density over activity; if the book is cluttered with mediocre or redundant names, say it explicitly and push for fewer, higher-quality exposures.
- If the investor is rotating styles without a framework, say it explicitly.

### Re-Entry Discipline

- After a major loss, do not endorse re-entry unless thesis, sponsorship, and structure have all reset.
- Re-entry must be treated as a new trade, not emotional continuation of the old one.

### Postmortem Upgrade Loop

Use postmortems as system upgrades, not blame sessions. Extract repeated behavioral mistakes, convert them into operating rules, improve both the human decision process and the assistant workflow.

## Review Cadence

### Daily (Quick Check)

- Check stop loss levels and triggered invalidations.
- Check whether any progress checkpoint date has passed and whether the required checkpoint condition was met.
- Scan news/filings for held positions.
- Check flow changes on key positions.
- Review current P&L, exposure, and current `portfolio_heat` from the portfolio tools.

### Weekly

- Review all open positions: thesis intact or broken.
- Check sizing compliance against position caps.
- Check rolling correlation changes among top holdings.
- Check for stale plans that have not been reviewed within their expected cadence.
- Compare portfolio behavior versus `IHSG` and relevant sector leaders.
- Check whether any active tactical trades demand more monitoring than the investor is realistically providing.
- Update watchlist and trigger status.
- Record weekly portfolio heat and action items in the retained review summary.

### Monthly

- Full performance review: realized and unrealized.
- Review the portfolio equity curve and decision process as a system, not only as isolated symbol outcomes.
- Sector allocation and concentration check.
- Rebalance check: cadence, drift, thesis validity.
- Strategy quality review: what worked and what failed.
- Review whether style drift, attention mismatch, or repeated re-entry mistakes are recurring.
- Capture durable lessons in long-term memory.

## Leader Breadth Risk Monitor

Track a small leader basket (from active/watchlist universe) and count fresh invalidations.

- If multiple leaders break structure/stop in the same review window, treat this as regime deterioration. (Flag PM-W09)
- When deterioration appears, reduce portfolio heat, tighten stops, and delay aggressive adds.
- Record the signal and resulting action in the retained review summary.

Portfolio health red flag: if portfolio is flat/red while IHSG prints new highs, strategy likely has structural misalignment and needs overhaul. (Flag PM-W08)

## Plan Staleness Discipline

Each symbol plan should carry an explicit review cadence and last-reviewed date.

Practical thresholds:

- `SWING`: stale after 7 calendar days without review
- `POSITION`: stale after 30 calendar days without review
- `LONG_TERM`: stale after 90 calendar days without review

If a plan is stale: flag `PM-W10`, downgrade confidence in the stored plan, require refresh before allowing aggressive adds.

## Watchlist Management

| Status | Criteria | Action |
|--------|----------|--------|
| WATCHING | Thesis interesting but not actionable yet, or position exited but name still worth tracking | Monitor catalyst/flow/price trigger |
| READY | Trigger conditions are close | Prepare plan and alerts |
| ACTIVE | Triggered and position is open | Execute and monitor |

Treat the watchlist as attention-budgeted inventory, not a dumping ground. Keep `READY` inventory tight enough to match realistic monitoring capacity. Any watchlist name without a clear `why now`, trigger, invalidation, or recent review should be refreshed, demoted, or removed.

Watchlist table format:

```markdown
| Symbol | Status | Thesis | Trigger | Invalidation | Added | Leader | Notes |
|--------|--------|--------|---------|--------------|-------|--------|-------|
| BBCA | READY | Rate cut beneficiary | Break above 10,000 with volume | Closes below 9,650 | 2025-01-15 | Yes | Waiting for volume confirmation |
| ADRO | WATCHING | Coal cycle + restructuring | Foreign accumulation signal | ASP weakens while volume distribution expands | 2025-01-20 | No | Monitor catalyst window |
```

## Common Workflows

### New Position Entry

1. Resolve `regime_aggression`. Check IHSG cash target vs current cash ratio.
2. Choose `entry_type` (FULL or PILOT). Validate sizing against constraints.
3. Fill required fields from the Symbol Plan Template, write to symbol memory.

### Desk Check

1. Call `portfolio_state`. If missing, stop.
2. For each position: check thesis health, stops, scenarios, sizing compliance, review cadence.
3. For READY symbols: track price movement and thesis changes.
4. Check portfolio-level: heat, concentration, regime, cash target.
5. Return `portfolio_constraints`, findings, and items requiring human attention to parent workflow.

### Deep Review

1. Full holdings review + stale/neglected name resurfacing + system quality audit.
2. Check realized vs unrealized mix, style drift, process debt, best-ideas density.
3. Return findings and cleanup proposals.

### Position Exit

1. Document exit source (symbol baseline vs portfolio rail). Update symbol memory. Evaluate process.

### Rebalance

1. Check drift and event triggers. Validate replacement correlation. Skip immaterial trades.

## Review Summary Template

```markdown
# Desk Check: {YYYY-MM-DD}

## Market Context
- IHSG: {level} ({change%})
- Key news: {1-2 headlines}
- Regime aggression: {0.25-1.5}
- Current portfolio heat: {X%}

## Actions Taken
- {action 1}
- {action 2}

## Positions Updated
| Symbol | Action | Price | Notes |
|--------|--------|-------|-------|
| ... | ... | ... | ... |

## Watchlist Changes
- Added: {symbols + reason}
- Removed: {symbols + reason}
- Triggered: {symbols}

## Key Observations
- {insight 1}
- {insight 2}
- Checkpoint failures: {symbols or none}
- Stale plans: {symbols or none}
- Style drift: {none or what changed}

## Next Actions
- {next checks and actions}
```

## Execution Defaults

- Portfolio tools first. Temporary scripts in `work/` only for one-off calculations.
- Write concrete outputs to memory, not only narrative answers.
- Constraints are a separate layer after symbol analysis: PM caps size and reduces aggression but does not redefine the symbol-level exit engine.
- Flag health warnings when detected during any workflow.
