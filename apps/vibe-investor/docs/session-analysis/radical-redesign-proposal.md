# Vibe Investor Agent — Radical Redesign Proposal

**Based on:** [Session Behavioral Analysis](./session-behavioral-analysis.md), [Incremental Recommendations](./improvement-recommendations.md)  
**Date:** 2026-04-03  
**Philosophy:** The incremental fixes patch symptoms. This document redesigns the decision architecture.

---

## The Core Problem, Restated

The current system is a **risk-avoidance machine** that was accidentally built to never take risk.

Every skill, every gate, every default points one direction: don't act. The system has no concept of
"the cost of not acting." It measures risk of entry obsessively (20+ gates) but never measures risk
of inaction. In a market that spent 2 months below SMA200, this produced a perfectly logical,
perfectly useless result: 0 buys, rising cash, and a user who can't deploy capital through his own
investment system.

The fix isn't adding more rules on top. It's restructuring how the agent thinks about decisions.

---

## Design Principle: Dual-Mandate Decision Architecture

The current system has one mandate: **protect capital**.

The idealized system has two mandates that exist in tension:

1. **Protect capital** — don't take stupid risk
2. **Deploy capital** — don't waste good setups

These mandates must be given equal architectural weight. The agent must feel the pull of both, and
the synthesis must explicitly resolve the tension rather than always defaulting to safety.

This is not "be more aggressive." It's "be honest about both sides of the trade-off."

---

## Redesign 1: Replace the Gate Cascade with a Conviction Scoring System

### Current Architecture (broken)

```
BUY requires: gate1 AND gate2 AND gate3 AND ... AND gate20
Any single failure → WAIT
```

This is a serial veto chain. Each gate has independent veto power. The more gates you add, the
harder it becomes to ever act. In practice, with 20 gates and even a 90% pass rate per gate,
the probability of all passing is 0.9^20 = 12%. With realistic pass rates in a weak market,
it's near zero.

### Proposed Architecture

```
Score = weighted_sum(all_factors)
Action = f(score, position_size_curve)
```

Replace the binary gate cascade with a continuous conviction score that maps to a position-sizing
curve. Nothing is a binary veto except hard safety rails.

#### Factor Categories and Weights

| Category | Weight | Factors |
|----------|--------|---------|
| Thesis quality | 25% | Evidence grade, catalyst proximity, narrative strength, fundamental anchor |
| Technical structure | 25% | Daily state, location quality, setup family, trigger status, RR |
| Flow alignment | 15% | Broker-flow verdict, sponsor quality, trust regime, timing relation |
| Portfolio fit | 15% | Heat budget, concentration, correlation, liquidity, regime |
| Momentum/timing | 10% | Retest observed, confirmation quality, follow-through |
| Opportunity cost | 10% | Wait duration, missed-move tracking, cash drag |

Each factor scores 0-100. The weighted sum produces a composite conviction score 0-100.

#### Score-to-Action Mapping

| Conviction Score | Action | Position Size |
|------------------|--------|---------------|
| 0-25 | NO TRADE | 0% |
| 26-40 | WATCHLIST | 0% |
| 41-55 | PILOT | 0.25-0.5% of portfolio |
| 56-70 | STARTER | 0.5-1.5% of portfolio |
| 71-85 | STANDARD | 1.5-3% of portfolio |
| 86-100 | HIGH CONVICTION | 3-5% of portfolio |

#### Hard Safety Rails (the only binary vetoes)

These are the ONLY things that can override the scoring system:

1. Portfolio heat exceeds 8% → block all new longs
2. Single position exceeds 30% → block adds to that position
3. Thesis explicitly invalidated → EXIT regardless of score
4. Liquidity insufficient (position > 5% ADTV) → cap size, don't block
5. CAPITAL_PRESERVATION regime → cap at PILOT size, don't block entirely

Everything else is a factor in the score, not a veto. "Flow is unclear" doesn't block — it
reduces the flow alignment score. "Trigger is developing" doesn't block — it reduces the
momentum/timing score. "Confirmation is mixed" doesn't block — it reduces conviction and
therefore size.

#### Why This Works

- A strong thesis + good location + unclear flow = STARTER (not WAIT)
- A strong thesis + good location + strong flow + weak regime = STANDARD with reduced size
- A mediocre thesis + perfect setup + strong flow = STARTER (thesis weakness limits size)
- A strong thesis + poor location + no trigger = WATCHLIST (correctly)

The system naturally sizes down when evidence is mixed instead of refusing to act. The user gets
small positions in good ideas early, with a clear path to scale up as evidence improves.

---

## Redesign 2: Introduce Opportunity Cost as a First-Class Input

### Current State

The system tracks:

- Risk of being wrong (invalidation, stop loss, portfolio heat)
- Risk of being too big (concentration, correlation, liquidity)

The system does NOT track:

- Cost of being late (missed moves on READY names)
- Cost of being empty (cash drag in a recovering market)
- Cost of being stale (same WAIT for weeks)

### Proposed: Opportunity Cost Ledger

Add a new memory file: `memory/notes/opportunity-cost.md`

Track for every READY symbol:

```markdown
## Opportunity Cost Ledger

| Symbol | READY since | Entry zone | Current price | Missed move | Wait age | Status |
|--------|-------------|------------|---------------|-------------|----------|--------|
| AADI | 2026-03-08 | 10,500 | 12,000 | +14.3% | 18 sessions | STALE |
| ITMG | 2026-03-10 | 28,300 | 30,500 | +7.8% | 15 sessions | STALE |
| DSNG | 2026-03-23 | 1,700 | 1,850 | +8.8% | 8 sessions | ACTIVE |
```

Rules:

- Every desk-check must update this ledger
- Missed move > 10% triggers a mandatory re-evaluation: was the entry framework too restrictive?
- Wait age > 5 desk-checks triggers staleness: the setup must be re-underwritten or expired
- Cumulative missed opportunity across all READY names is reported as "portfolio opportunity cost"
  alongside portfolio heat
- The opportunity cost feeds into the conviction scoring system (Redesign 1) as the
  "opportunity cost" factor — longer waits and bigger missed moves increase the pressure to act

### Opportunity Cost in the Decision Output

Every desk-check synthesis must include:

```markdown
## Risk Balance
- Portfolio heat: 3.2% (within budget)
- Cash ratio: 62% (above 70% floor by shortfall)
- Opportunity cost this period: AADI +14.3%, ITMG +7.8% missed
- Net assessment: defensive posture is costing more than it's protecting
```

This forces the agent to confront the cost of inaction every single session, not just the cost
of action.

---

## Redesign 3: Replace Binary Regime Gate with Continuous Aggression Curve

### Current State

```
IHSG < SMA200 → CAPITAL_PRESERVATION → no new longs → period.
```

This is a binary switch that locked the portfolio out of the market for 2 months.

### Proposed: Continuous Aggression Curve

Instead of 4 discrete states, use a continuous aggression multiplier (0.0 to 1.5):

```
aggression = f(ihsg_ma_state, breadth, leader_health, rate_of_change, macro_context)
```

| IHSG State | Base Aggression | With improving breadth | With deteriorating breadth |
|------------|----------------|----------------------|--------------------------|
| Above all MAs, healthy | 1.2-1.5 | 1.5 | 1.0 |
| Above SMA50, below EMA21 | 0.8-1.0 | 1.0 | 0.7 |
| Below SMA50, above SMA200 | 0.5-0.7 | 0.7 | 0.4 |
| Below SMA200 | 0.2-0.4 | 0.4 | 0.2 |
| Below SMA200 + red flags | 0.1-0.2 | 0.2 | 0.1 |

The aggression multiplier scales the position size from the conviction scoring system:

```
final_size = conviction_size × aggression_multiplier
```

At aggression 0.2, a STANDARD conviction (1.5-3%) becomes 0.3-0.6% — effectively a pilot.
At aggression 0.1, it becomes 0.15-0.3% — a micro-pilot.

But it's never zero (unless hard safety rails trigger). The system can always take a small
position in a high-conviction idea, even in the worst regime. The regime controls HOW MUCH,
not WHETHER.

### Cash Floor Becomes a Soft Target, Not a Hard Block

Current: "IHSG below SMA200 → keep 70% cash → if cash is 62%, you must trim to get to 70%"

Proposed: "IHSG below SMA200 → target 70% cash → new positions are sized to stay within the
target → if a high-conviction pilot takes cash to 69.5%, that's fine — the floor is a budget,
not a wall"

The cash floor constrains the aggression multiplier rather than blocking action entirely.

---

## Redesign 4: Replace "Wait for Retest" with Decision Lifecycle

### Current State

The TA skill issues WAIT and the recommendation lives forever. There's no expiration, no
tracking, no escalation. The agent says "wait for retest at 10,900" and then says it again
next session, and again, and again.

### Proposed: Every Recommendation Has a Lifecycle

```
ISSUED → ACTIVE → {TRIGGERED | EXPIRED | SUPERSEDED}
```

Every WAIT/BUY/HOLD recommendation must include:

```yaml
recommendation:
  action: WAIT
  symbol: AADI
  issued_date: 2026-03-25
  decision_horizon: 5 trading days  # or 3 desk-checks
  upgrade_trigger: "Daily close above 10,900 with volume > 20d avg"
  downgrade_trigger: "Daily close below 10,200"
  expiry_action: "Re-underwrite or downgrade to WATCHING"
  retest_check:
    level: 10,900
    tested_since_issued: false  # updated each session
    tested_date: null
    test_result: null  # held | failed | not_tested
```

Rules:

1. Every session that reviews this symbol MUST update `tested_since_issued` by checking
   whether price visited the level since `issued_date`
2. If `decision_horizon` passes without trigger → execute `expiry_action` automatically
3. If the level was tested and held → the agent must acknowledge this and evaluate upgrade
4. If the level was tested and failed → the agent must acknowledge this and evaluate downgrade
5. A recommendation cannot be renewed with the same parameters — if the setup is still valid,
   it must be re-underwritten with fresh evidence and a new horizon

This kills the goldfish problem. The agent can't say "wait for retest" forever because the
recommendation expires. It can't ignore that the retest happened because it's forced to check.

### Lifecycle State in Symbol Memory

Add to the symbol plan frontmatter:

```yaml
active_recommendation:
  action: WAIT
  issued: 2026-03-25
  horizon_expires: 2026-04-01
  upgrade_trigger: "..."
  downgrade_trigger: "..."
  retest_level: 10900
  retest_status: not_tested  # not_tested | tested_held | tested_failed
  retest_checked: 2026-03-28
```

The desk-check workflow reads this, checks the OHLCV data for the period since `issued`,
updates `retest_status`, and enforces the horizon.

---

## Redesign 5: Invert the TA Skill's Default from WAIT to "What Would Make Me Act?"

### Current State

The TA skill's decision tree is:

```
Can I prove this is a BUY? → No → WAIT
```

Every phase is looking for reasons to NOT act. The default is inaction.

### Proposed: Dual-Question Decision Tree

```
1. What would make me BUY this? → [specific conditions]
2. What would make me WALK AWAY? → [specific conditions]
3. Where am I between those two? → [conviction score]
```

Instead of a serial veto chain, the TA skill produces a **conviction assessment** with:

- Bull case: what's working, what would confirm
- Bear case: what's broken, what would invalidate
- Current position: where the evidence sits between bull and bear
- Conviction score: 0-100 based on the balance of evidence
- Recommended action: derived from the score, not from gate survival

The key shift: the TA skill's job is to ASSESS, not to GATEKEEP. It produces a conviction
score and a risk map. The portfolio-management skill uses that score plus its own factors to
determine sizing. No single skill has veto power over the final decision.

### Phase Contract Changes

Replace the current "stop if X" gates with "score reduction if X":

| Current | Proposed |
|---------|----------|
| State unclear → WAIT (hard stop) | State unclear → -20 conviction, continue |
| Location poor → WAIT (hard stop) | Location poor → -15 conviction, continue |
| No valid setup → WAIT (hard stop) | No valid setup → -25 conviction, continue |
| Trigger absent → WAIT (hard stop) | Trigger absent → -15 conviction, continue |
| Confirmation mixed → WAIT (hard stop) | Confirmation mixed → -10 conviction, continue |

The only hard stops remain:

- Data missing → can't analyze (real dependency failure)
- Thesis explicitly invalidated → EXIT

Everything else reduces conviction rather than blocking the decision entirely.

---

## Redesign 6: Restructure the Synthesis Layer

### Current State

The parent workflow receives outputs from TA, flow, narrative, and fundamental skills, then
must "reconcile" them. In practice, reconciliation means: if any skill says something negative,
the synthesis downgrades. There's no mechanism for one strong signal to override a weak negative.

### Proposed: Weighted Lens Synthesis with Explicit Conflict Resolution

The parent synthesis receives conviction scores from each lens:

```yaml
lens_scores:
  technical: 62  # decent setup, trigger developing
  flow: 45       # unclear, low trust
  narrative: 78  # strong story, fresh catalyst
  fundamental: 70 # undervalued, good quality
  portfolio_fit: 55 # fits but regime is weak

composite: weighted_average(technical=25%, flow=15%, narrative=25%, fundamental=20%, portfolio=15%)
         = 0.25(62) + 0.15(45) + 0.25(78) + 0.20(70) + 0.15(55)
         = 15.5 + 6.75 + 19.5 + 14.0 + 8.25
         = 64.0 → STARTER position
```

When lenses conflict, the synthesis must:

1. State the conflict explicitly: "Flow is unclear (45) while narrative is strong (78)"
2. Assess which lens is more relevant for THIS symbol in THIS context
3. Apply a context-dependent weight adjustment if warranted
4. Produce a final score with the conflict noted, not resolved by defaulting to the weakest lens

The key change: **a strong narrative + strong fundamental can carry a trade even when flow is
unclear**, as long as the composite score clears the threshold. Currently, unclear flow alone
can block a trade that every other lens supports.

### Conflict Resolution Hierarchy (replaces mixed-signal arbitration)

1. Hard safety rails (portfolio heat, concentration, liquidity) → cap size, don't block
2. Thesis invalidation from ANY lens → EXIT
3. Composite conviction score → determines base size
4. Aggression multiplier (regime) → scales the size
5. Explicit conflict notes → attached to the decision for review

---

## Redesign 7: Build an Equity Curve Feedback Loop

### Current State

The agent reviews individual positions but never evaluates its own decision-making as a system.
It doesn't know whether its WAIT recommendations are costing more than its EXIT recommendations
are saving.

### Proposed: Agent Performance Tracking

Add `memory/notes/agent-performance.md`:

```markdown
## Agent Decision Performance

### Entry Decisions
| Symbol | Recommended | Actual | Outcome | Notes |
|--------|-------------|--------|---------|-------|
| AADI | WAIT at 10,500 | Never entered | Price now 12,000 (+14.3%) | Missed |
| BUMI | EXIT at 225 | Exited at 225 | Price now 180 (-20%) | Correct |
| LEAD | EXIT at 1,050 | Exited at 1,050 | Price now 900 (-14.3%) | Correct |

### System Metrics (rolling 30 days)
- Correct exits: 3/3 (100%)
- Missed entries: 4/6 (67%)
- False WAITs (setup was valid, we missed it): 2
- Correct WAITs (setup failed, we avoided it): 1
- Net opportunity cost of WAITs: -8.5% average
- Net capital saved by EXITs: +15.2% average
- Decision quality ratio: exits are strong, entries need work

### Behavioral Drift Flags
- WAIT duration trending up: YES (avg 12 sessions, was 5)
- Entry rate trending down: YES (0 entries in 30 days)
- Cash ratio trending up: YES (38% → 62%)
- Action: recalibrate entry thresholds
```

This file is updated every desk-check and deep-review. It gives the agent (and the user)
a feedback loop on whether the decision system is actually working or just avoiding decisions.

### Feedback Into Conviction Scoring

If the agent-performance tracker shows:

- False WAIT rate > 50% → reduce the conviction threshold for PILOT by 5 points
- Missed entry rate > 60% → increase the opportunity cost weight in the scoring system
- Cash ratio rising for 3+ consecutive desk-checks with READY names available → flag
  "systematic under-deployment" and require explicit justification for continued inaction

---

## Redesign 8: Rethink the Skill Boundaries

### Current Problem

Each skill operates as an independent analyst that produces a verdict. The parent workflow
then tries to reconcile 4-5 independent verdicts. This creates the "weakest link" problem:
the most cautious skill dominates.

### Proposed: Skills as Lenses, Not Judges

Skills should produce **evidence packets**, not **verdicts**. The verdict is owned by the
synthesis layer alone.

| Current | Proposed |
|---------|----------|
| TA produces: BUY / HOLD / WAIT / EXIT | TA produces: conviction score + risk map + key levels |
| Flow produces: ACCUMULATION / DISTRIBUTION / NEUTRAL | Flow produces: conviction score + sponsor quality + timing context |
| Narrative produces: STRONG / MODERATE / WEAK / BROKEN | Narrative produces: conviction score + catalyst map + failure risk |
| PM produces: pass / block | PM produces: sizing constraints + risk budget + regime multiplier |
| Parent reconciles verdicts | Parent computes composite score from lens scores |

The synthesis layer is the only place where a final action (BUY/HOLD/WAIT/EXIT) is produced.
No individual skill can unilaterally block or approve a trade.

---

## Summary: The Idealized Decision Flow

```
1. GATHER
   - Load memory, prior state, opportunity cost ledger
   - Fetch data (OHLCV, broker flow, documents, filings)
   - Check recommendation lifecycles (any expired? any retests observed?)

2. ANALYZE (parallel, per lens)
   - Technical: conviction score + risk map + levels + setup assessment
   - Flow: conviction score + sponsor quality + timing relation
   - Narrative: conviction score + catalyst map + failure risk
   - Fundamental: conviction score + valuation anchor + quality flags

3. SYNTHESIZE
   - Compute composite conviction score (weighted average of lens scores)
   - Apply aggression multiplier (continuous, from regime assessment)
   - Check hard safety rails (heat, concentration, liquidity, invalidation)
   - Compute final position size from score × multiplier, capped by rails
   - Resolve conflicts explicitly (which lens disagrees, why, which is more relevant)

4. DECIDE
   - Map final score to action: NO TRADE / WATCHLIST / PILOT / STARTER / STANDARD / HIGH CONVICTION
   - Attach decision lifecycle: horizon, upgrade trigger, downgrade trigger, expiry
   - Update opportunity cost ledger
   - Update agent performance tracker

5. EXECUTE MEMORY
   - Write symbol plans, thesis updates, watchlist changes
   - Refresh registries
   - Write run log
```

---

## What This Changes in Practice

### Scenario: AADI in a weak market (IHSG below SMA200)

**Current system:**

- Regime: CAPITAL_PRESERVATION → no new longs
- TA: setup developing but trigger absent → WAIT
- Flow: unclear → no confirmation
- Result: WAIT (for the 15th time)

**Proposed system:**

- Technical conviction: 62 (decent setup, trigger developing, good location)
- Flow conviction: 45 (unclear, low trust ticker)
- Narrative conviction: 78 (strong coal thesis, war premium catalyst)
- Fundamental conviction: 75 (undervalued, strong cashflow)
- Portfolio fit: 50 (regime weak, but heat budget available)
- Composite: 64 → STARTER range
- Aggression multiplier: 0.3 (below SMA200, but breadth improving)
- Final size: 1.5% × 0.3 = 0.45% → PILOT
- Decision: "BUY pilot 0.45% at market. Scale to STARTER if 10,900 holds on retest within
  5 trading days. Exit pilot if 10,200 breaks. Recommendation expires in 3 desk-checks."

The user gets a small position. The agent gets skin in the game. If the setup works, there's
a clear scale-up path. If it fails, the loss is 0.45% × stop distance — trivial.

### Scenario: BUMI with broken thesis

**Current system:** EXIT (correct)

**Proposed system:**

- Technical conviction: 15 (structure broken)
- Flow conviction: 20 (distribution)
- Narrative conviction: 10 (thesis invalidated)
- Fundamental conviction: 30 (cheap but governance risk)
- Composite: 18 → NO TRADE
- Hard rail: thesis invalidated → EXIT
- Result: EXIT (same correct answer, but arrived at through scoring, not just one gate)

The system produces the same correct answer for clear exits. The difference is only in the
gray zone where the current system defaults to WAIT and the proposed system defaults to
"small position, prove it."

---

## Migration Path

This is a radical redesign but it doesn't have to be big-bang. The migration can be phased:

### Phase 1: Add the missing inputs (1-2 days)

- Add opportunity cost ledger to memory
- Add recommendation lifecycle to symbol plans
- Add retest-observed checking to desk-check
- Add agent performance tracker
- No skill rewrites yet — just new data collection

### Phase 2: Add conviction scoring to synthesis (2-3 days)

- Keep existing skills producing their current outputs
- Add a scoring layer in the parent synthesis that converts skill outputs to 0-100 scores
- Use the score alongside the existing gate cascade (score informs, gates still decide)
- Start tracking whether the score would have produced different decisions

### Phase 3: Replace gates with scoring (3-5 days)

- Rewrite TA skill to produce conviction scores instead of BUY/WAIT/EXIT
- Rewrite flow skill to produce conviction scores
- Rewrite narrative skill to produce conviction scores
- Rewrite PM skill to produce sizing constraints instead of pass/block
- Parent synthesis uses composite scoring as the primary decision engine
- Hard safety rails remain as the only binary vetoes

### Phase 4: Tune and calibrate (ongoing)

- Use agent performance tracker to calibrate scoring weights
- Adjust aggression curve based on actual market behavior
- Tune conviction thresholds based on false-WAIT and missed-entry rates
- The system learns from its own decisions

---

## Risk of This Redesign

Let's be honest about what could go wrong:

1. **Over-deployment in a crash.** The continuous aggression curve might allow too many pilots
   in a genuine crash. Mitigation: hard safety rails still exist, and CAPITAL_PRESERVATION
   caps at PILOT size (0.25-0.5%).

2. **Death by a thousand pilots.** If the agent opens 10 pilots at 0.3% each, that's 3% of
   portfolio in scattered micro-positions that are hard to manage. Mitigation: cap active
   pilots at 3-4 simultaneously, require each pilot to have a clear scale-up or exit path.

3. **Scoring system gaming.** The agent might learn to inflate scores to justify action.
   Mitigation: each lens score must be backed by specific evidence, and the agent performance
   tracker creates accountability.

4. **Loss of the exit discipline that works.** The current system's exit discipline is
   genuinely strong. Mitigation: EXIT remains a hard rail triggered by thesis invalidation,
   not by scoring. The scoring system only changes entry and hold decisions.

5. **Complexity.** The scoring system is more complex than the gate cascade. Mitigation: the
   scoring is deterministic and auditable. Each factor has a clear rubric. The agent must
   show its work.

---

## The One-Sentence Version

Stop asking "is this safe enough to buy?" and start asking "how much conviction do I have,
and what size does that conviction justify?"
