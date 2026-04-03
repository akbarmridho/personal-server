# Vibe Investor — Agent Architecture Proposal

**Based on:** [Radical Redesign Proposal](./radical-redesign-proposal.md)  
**Date:** 2026-04-03  
**Revision:** v3 — synthesis lives in main prompt, not a separate skill

---

## Architecture: Same Topology, New Decision Logic

Keep the current single-agent + subagent architecture exactly as-is:

```text
VIBE INVESTOR (single agent/prompt)
  ├── Can load any skill combination dynamically
  ├── Can spawn subagents with any skill combination
  │
  ├── desk-check:
  │     parent = orchestrator + PM skill + synthesis (in main prompt)
  │     subagents = TA + flow + narrative skills (per symbol batch)
  │
  ├── ad-hoc: parent loads what it needs
  └── explore-idea: parent + narrative subagents
```

**What changes is not the topology. It's three things:**

1. What skills produce (conviction scores, not verdicts)
2. How the parent synthesizes (weighted scoring in main prompt, not gate cascade)
3. What new state the system tracks (opportunity cost, recommendation lifecycle, performance)

---

## Why Synthesis Lives in `main.md`, Not a Skill

Synthesis is not domain expertise you load on demand. It's how the agent thinks.

1. **It's never optional.** Every workflow that touches a symbol eventually needs to form a
   view. If synthesis is a skill you have to remember to load, you'll forget it — or a
   subagent won't load it — and you're back to the old gate cascade by accident.

2. **It's the agent's core judgment.** The scoring weights, the aggression curve, the
   score-to-action mapping — that's the agent's decision personality. It belongs in the
   system prompt the same way "preserve capital first" and "think in probabilities" already
   live there. You wouldn't put "be direct" in a loadable skill.

3. **Skills are for domain expertise.** TA is a skill because you don't need chart analysis
   during a news-digest. Flow is a skill because you don't need broker data during a
   fundamental review. But the decision framework? Always on.

4. **Zero loading friction.** The main prompt is always present. If the conviction scoring
   logic is in `main.md`, it's impossible to accidentally bypass it.

5. **It replaces existing sections, not adds to them.** The current `main.md` already has
   "exit synthesis contract" and "mixed-signal arbitration" sections doing this job badly.
   The new synthesis logic replaces those sections. Net prompt length change is close to zero.

---

## The Three Real Changes

### Change 1: Skills Produce Scores, Not Verdicts

**Current:** Each skill produces a categorical verdict.

- TA → BUY / HOLD / WAIT / EXIT
- Flow → ACCUMULATION / DISTRIBUTION / NEUTRAL
- Narrative → STRONG / MODERATE / WEAK / BROKEN
- PM → pass / block

**Proposed:** Each skill produces a conviction score (0-100) plus structured evidence.

```yaml
# Example: what a TA skill run now returns
technical_assessment:
  conviction_score: 62
  confidence: MEDIUM
  bull_factors:
    - "Higher lows intact on daily"
    - "S2 setup developing at demand"
  bear_factors:
    - "Trigger not active on 15m"
    - "IHSG context damaged"
  risk_map:
    invalidation: 10200
    target_1: 11500
    rr: 2.1
  red_flags: [...]
  key_levels: [...]
```

Skills keep ALL their analytical frameworks, rubrics, references, chart pipelines,
deterministic scripts. The ONLY thing that changes is the output format: a score with
structured evidence instead of a categorical verdict.

**Why this matters:** The old system collapses scores 16-60 into one label: "WAIT." The new
system distinguishes "WAIT because everything is broken" (score 20) from "WAIT because the
trigger hasn't fired yet but everything else is great" (score 55). That distinction is what
lets the parent size appropriately instead of blocking entirely.

**Scoring rubric example (TA):**

| Score   | Meaning                                                  |
|---------|----------------------------------------------------------|
| 0-15    | Structure broken, thesis invalidated                     |
| 16-30   | Damaged, no setup, poor location                         |
| 31-45   | Mixed, developing, mid-range noise                       |
| 46-60   | Setup forming, location decent, trigger developing       |
| 61-75   | Setup valid, trigger active or near, confirmation partial |
| 76-90   | Clean setup, trigger confirmed, good RR                  |
| 91-100  | Textbook setup, strong confirmation, excellent RR        |

Each skill defines its own 0-100 rubric in its own SKILL.md. Narrative already has a 0-15
strength score — maps to 0-100 naturally. Flow already has conviction_pct in the deterministic
output. Fundamental can derive from quality framework + valuation.

### Change 2: Parent Synthesis Uses Weighted Scoring (in `main.md`)

The parent agent receives conviction scores from all active skills and computes a composite.
This replaces the current "exit synthesis contract" and "mixed-signal arbitration" sections
in `main.md`.

**Composite scoring formula:**

```text
composite = 0.25 × technical
          + 0.15 × flow
          + 0.25 × narrative
          + 0.20 × fundamental
          + 0.15 × portfolio_fit
```

When a lens is skipped: use neutral default (50), or prior session's score if recent enough
(< 3 desk-checks old). Reweight remaining lenses proportionally if no prior exists.

**Continuous aggression multiplier (replaces 4 discrete regime states):**

```text
aggression = f(ihsg_ma_state, breadth, leader_health, rate_of_change)
```

| IHSG State                   | Base | Improving breadth | Deteriorating breadth |
|------------------------------|------|-------------------|-----------------------|
| Above all MAs, healthy       | 1.2  | 1.5               | 1.0                   |
| Above SMA50, below EMA21     | 0.8  | 1.0               | 0.7                   |
| Below SMA50, above SMA200    | 0.5  | 0.7               | 0.4                   |
| Below SMA200                 | 0.2  | 0.4               | 0.2                   |
| Below SMA200 + red flags     | 0.1  | 0.2               | 0.1                   |

**Score-to-action mapping:**

| Composite | Action          | Base Size     |
|-----------|-----------------|---------------|
| 0-25      | NO TRADE        | 0%            |
| 26-40     | WATCHLIST       | 0%            |
| 41-55     | PILOT           | 0.25-0.5%     |
| 56-70     | STARTER         | 0.5-1.5%      |
| 71-85     | STANDARD        | 1.5-3%        |
| 86-100    | HIGH CONVICTION | 3-5%          |

**Final sizing:**

```text
final_size = score_to_size(composite) × aggression_multiplier
```

A STARTER (1.5%) in a weak regime (aggression 0.3) becomes 0.45% — effectively a pilot.
The system scales down in bad markets without blocking entirely.

**Hard safety rails (the only binary overrides):**

1. Portfolio heat > 8% → block all new longs
2. Thesis invalidated from any lens → EXIT
3. Single position > 30% → block adds
4. Position > 5% ADTV → cap size
5. Max 3-4 active pilots simultaneously

Everything else is a factor in the score, not a veto. "Flow is unclear" reduces the flow
score. "Trigger is developing" reduces the timing score. Neither blocks the decision.

**Conflict resolution (replaces mixed-signal arbitration):**

When lenses disagree, the parent must:

1. State the conflict: "Flow is 45 while narrative is 78"
2. Assess which lens is more relevant for this symbol in this context
3. Apply context-dependent weight adjustment if warranted
4. Produce a final score with the conflict noted — not resolved by defaulting to the weakest

**Dual mandate (replaces "preserve capital first" as sole mandate):**

The agent operates under two mandates in tension:

1. Protect capital — don't take stupid risk
2. Deploy capital — don't waste good setups

Both mandates have equal architectural weight. The synthesis must explicitly resolve the
tension rather than always defaulting to safety.

### Change 3: New State Tracking

Three new memory surfaces, managed by the parent agent:

#### Recommendation Lifecycle (in symbol frontmatter)

```yaml
active_recommendation:
  action: WAIT
  issued: 2026-03-25
  horizon_expires: 2026-04-01
  upgrade_trigger: "Daily close above 10,900 with volume"
  downgrade_trigger: "Daily close below 10,200"
  expiry_action: re-underwrite or downgrade to WATCHING
  retest_level: 10900
  retest_status: not_tested  # not_tested | tested_held | tested_failed
  retest_checked: 2026-03-28
  composite_score: 55
```

Rules:

- Every desk-check must check if horizon expired and if retest occurred
- If horizon passes without trigger → execute expiry_action automatically
- If retest occurred and held → acknowledge and evaluate upgrade
- If retest occurred and failed → acknowledge and evaluate downgrade
- A recommendation cannot be renewed with the same parameters — must re-underwrite with
  fresh evidence and a new horizon
- No more infinite WAITs

#### Opportunity Cost Ledger — `memory/notes/opportunity-cost.md`

```markdown
| Symbol | READY since | Entry zone | Current | Missed  | Wait age | Status |
|--------|-------------|------------|---------|---------|----------|--------|
| AADI   | 2026-03-08  | 10,500     | 12,000  | +14.3%  | 18 sess  | STALE  |
| ITMG   | 2026-03-10  | 28,300     | 30,500  | +7.8%   | 15 sess  | STALE  |
```

Rules:

- Every desk-check updates prices, computes missed moves, flags stale waits
- Missed move > 10% triggers mandatory re-evaluation of entry framework
- Wait age > 5 desk-checks triggers staleness: re-underwrite or expire
- Cumulative missed opportunity reported alongside portfolio heat in every synthesis
- Feeds into composite score as pressure toward action (not as a reason to chase)

#### Agent Performance Tracker — `memory/notes/agent-performance.md`

```markdown
| Metric                       | Value                  |
|------------------------------|------------------------|
| Correct exits                | 3/3 (100%)             |
| Missed entries (false WAITs) | 4/6 (67%)              |
| Correct WAITs                | 1/6 (17%)              |
| Entry rate                   | 0 entries in 30 days   |
| Cash trend                   | 38% → 62% (rising)    |
```

Rules:

- Updated every desk-check and deep-review
- Flags behavioral drift (rising WAIT duration, falling entry rate, rising cash)
- If false-WAIT rate > 50% → note in synthesis that entry thresholds may be too restrictive
- If 0 entries for 3+ desk-checks with READY names available → flag "systematic
  under-deployment" and require explicit justification for continued inaction

---

## How Subagents Work (Unchanged)

Same delegation pattern. Different output format.

**Current subagent contract:**

```text
Input:  symbol list, skills to load (TA + flow + narrative)
Output: analysis artifacts with categorical verdicts
```

**New subagent contract:**

```text
Input:  symbol list, skills to load (TA + flow + narrative), prior symbol state
Output: per-symbol assessment packets with conviction scores
        + analysis artifacts saved to memory
```

Parent receives score packets and runs synthesis (using the logic in `main.md`).
Same delegation, different output.

Skill loading stays flexible — exactly how it works today:

- Full desk-check batch: TA + flow + narrative
- Lightweight triage: TA only
- Catalyst-focused: narrative only
- Deep dive: TA + flow + narrative + fundamental

---

## What Changes in Each Existing File

### `main.md` — the main prompt

Sections replaced (not net-new):

- "Exit synthesis contract" → replaced by composite scoring formula + score-to-action mapping
- "Mixed-signal arbitration" → replaced by conflict resolution rules
- "Market Regime Gate" references → replaced by continuous aggression curve
- IHSG cash floor → becomes soft target that constrains aggression, not hard block

Sections added:

- Dual mandate ("protect capital" AND "deploy capital")
- Composite scoring formula and weights
- Score-to-action mapping table
- Continuous aggression curve table
- Hard safety rails (the only binary overrides)
- Conflict resolution rules
- Recommendation lifecycle rules in desk-check defaults
- Opportunity cost ledger update rules in desk-check defaults
- Agent performance tracker update rules in desk-check/deep-review defaults

Sections modified:

- Desk-check defaults: add lifecycle checking, opp cost update, performance update
- Deep-review defaults: add performance review dimension
- Principles: add "Deploy capital" alongside "Preserve capital"

Net prompt length: roughly the same. New synthesis sections replace existing synthesis
sections that were already doing the same job with the gate cascade.

### Each of the 5 existing skills

- **Add:** conviction score output contract (0-100 + bull/bear factors + confidence)
- **Add:** scoring rubric specific to that skill's domain (in each SKILL.md)
- **Remove:** final action verdict — skills assess, they don't decide
- **Keep:** everything analytical (frameworks, rubrics, references, scripts, pipelines,
  red flags, monitoring)

### `portfolio-management/SKILL.md` specifically

- Output changes from pass/block to portfolio constraints:

  ```yaml
  portfolio_constraints:
    heat_budget_remaining: 2.8%
    max_new_position_size: 1.5%
    regime_aggression: 0.3
    cash_floor_status: above
    concentration_flags: []
    hard_rails_triggered: []
  ```

- "Mixed-Signal Arbitration" section removed (now in main prompt)
- "Market Regime Gate" produces aggression multiplier instead of categorical state
- Entry/exit doctrine stays but "block" language changes to "cap" language

### New memory files

- `memory/notes/opportunity-cost.md` — opportunity cost ledger
- `memory/notes/agent-performance.md` — decision performance tracker

### Symbol frontmatter schema

- Add `active_recommendation` block (lifecycle with horizon, triggers, expiry, retest status)

---

## Migration Surface

| Item                              | Type                    | Effort       |
|-----------------------------------|-------------------------|--------------|
| `main.md` synthesis sections      | Replace existing        | Medium       |
| `technical-analysis/SKILL.md`     | Output contract change  | Small        |
| `flow-analysis/SKILL.md`          | Output contract change  | Small        |
| `narrative-analysis/SKILL.md`     | Output contract change  | Small        |
| `fundamental-analysis/SKILL.md`   | Output contract change  | Small        |
| `portfolio-management/SKILL.md`   | Output contract change  | Small-Medium |
| `opportunity-cost.md`             | New memory file         | Tiny         |
| `agent-performance.md`            | New memory file         | Tiny         |
| Symbol frontmatter schema         | Add recommendation lifecycle | Small   |

Total: 0 new skills, 0 new agents, 5 skill output contract updates, 1 prompt rewrite
(replacing existing sections), 2 new memory files, 1 schema addition.

---

## The One-Line Summary

Same agent, same subagents, same skills, same tools — but skills produce scores instead of
verdicts, and the main prompt turns those scores into sized actions instead of binary
go/no-go gates.
