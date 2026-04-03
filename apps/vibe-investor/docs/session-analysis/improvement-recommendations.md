# Vibe Investor Agent — Improvement Recommendations

**Based on:** [Session Behavioral Analysis](./session-behavioral-analysis.md)  
**Date:** 2026-04-03  
**Priority:** Fix the "never buys" problem without weakening exit discipline

---

## Recommended Package: Options A + B + E

Three complementary changes that address all three root causes without requiring a fundamental architecture rewrite.

---

## Option A: Patch Existing Skills (Surgical Fixes)

**What it fixes:** The goldfish problem — repeating "wait for retest" without tracking whether the retest happened or how long the wait has been active.

### A1. Add `wait_staleness` field to symbol memory

**Where:** `portfolio-management/SKILL.md` (Operating Rules or Desk Check Review section) + `portfolio-management/references/trading-plan-template.md` (Open Position Monitoring section)

**Change:** When a WAIT or NO_CHASE recommendation is issued for a READY symbol, stamp the date and session into the symbol's memory file. Add a new field to the Open Position Monitoring block:

```markdown
## Open Position Monitoring
- ...existing fields...
- Wait recommendation issued: {YYYY-MM-DD}
- Wait recommendation age: {N desk-checks}
- Wait staleness action: {if age >= 3 desk-checks, force re-evaluation}
```

**Rule to add to desk-check defaults (main prompt):**

> For every READY symbol carrying a WAIT or NO_CHASE recommendation, check `wait_recommendation_age`. If the same WAIT has persisted for 3 or more desk-checks without the trigger level being tested, the agent must resolve one of three outcomes: (1) upgrade to actionable with adjusted entry, (2) downgrade to WATCHING with explicit reason, or (3) explicitly renew the WAIT with fresh evidence and a new trigger level. "Same WAIT, no new evidence" is not a valid renewal.

### A2. Add `retest_observed` check to TA UPDATE mode

**Where:** `technical-analysis/SKILL.md` (UPDATE Requirements section, under Phase Contracts → MODE)

**Change:** Add a mandatory pre-check to every UPDATE run:

> Before repeating a prior "wait for retest at level X" recommendation, the UPDATE must check whether price visited level X since the prior review. Use `daily[]` and `intraday_1m[]` to determine:
>
> - **Tested and held:** Price reached the zone and showed acceptance/defense. Acknowledge this explicitly. Evaluate whether the retest qualifies as the trigger the prior WAIT was waiting for. If yes, upgrade the recommendation.
> - **Tested and failed:** Price reached the zone and broke through. Acknowledge this explicitly. Downgrade the setup or update invalidation.
> - **Not tested:** Price did not reach the zone. State this explicitly. If this is the 3rd+ consecutive session where the zone was not tested, evaluate whether the setup is stale or whether the entry zone needs adjustment to reflect the new price reality.
>
> Do not repeat a prior WAIT recommendation without stating which of these three outcomes occurred.

### A3. Add opportunity-cost tracking

**Where:** `portfolio-management/SKILL.md` (Desk Check Review section) + `portfolio-management/references/review-watchlist-and-review-logging.md`

**Change:** Add a review step for READY symbols that moved away from the trigger zone:

> For every READY symbol where the current price is more than 5% above the last recommended entry zone, compute and state the missed move: "AADI was READY at 10,500 entry zone on {date}. Current price is 12,000. Missed move: +14.3%." Include this in the desk-check findings.
>
> Opportunity cost is not a reason to chase. It is a reason to re-evaluate whether the entry framework is too restrictive, whether the setup has evolved into a different family, or whether the name should be re-underwritten at current levels.

---

## Option B: Add "Pilot Entry" Tier to Portfolio Management

**What it fixes:** The "never buys" problem — the 20-gate cascade makes BUY mathematically impossible in weak markets.

**Where:** `portfolio-management/SKILL.md` (new section after Entry Discipline) + `portfolio-management/references/trading-plan-template.md` (new entry build option)

### New section in SKILL.md: Pilot Entry Pathway

```markdown
## Pilot Entry Pathway

A pilot entry is a minimal-risk position designed to establish skin in the game when the
full gate cascade cannot be satisfied but the thesis and invalidation are clear.

### When to use

- Symbol is READY with explicit thesis, invalidation, and evidence grade 1-3
- Full BUY gates are not satisfied (e.g., trigger absent, confirmation mixed, regime defensive)
- The agent has issued WAIT for 2+ desk-checks on this symbol
- The thesis has not degraded since the WAIT was issued

### Pilot sizing

- Maximum: 0.5% of portfolio equity
- Default: 0.25% of portfolio equity
- Must still fit within portfolio heat budget
- Must still pass liquidity check (position vs ADTV)

### Pilot gates (reduced set)

All must be true:

1. Thesis quality is at least MEDIUM conviction with evidence grade 1-3
2. Invalidation is explicit and the stop is defined
3. Regime is not CAPITAL_PRESERVATION (DEFENSIVE or better)
4. Liquidity is acceptable
5. No active portfolio override blocks the name

Skipped gates (vs full BUY):

- Perfect 15m trigger not required (daily location sufficient)
- Full confirmation not required (partial or developing OK)
- Flow alignment not required (neutral or better OK)
- Optimal RR not required (acceptable RR OK — lower threshold)

### Pilot lifecycle

- Pilot is a probe, not a commitment. It does not change the symbol's trade classification
  or holding mode.
- If the full BUY trigger fires after pilot entry, scale to planned size through normal gates.
- If the setup fails or invalidation is hit, exit the pilot. Loss is capped at 0.25-0.5% of
  portfolio — acceptable as information cost.
- If the setup stales (3+ desk-checks with no trigger and no invalidation), exit the pilot
  and downgrade to WATCHING.
- Pilot entries must be logged in the symbol plan with `entry_type: pilot` and the reduced
  gate set that was used.

### Pilot constraints

- Maximum 2 active pilots at any time
- Pilots do not count toward the 50:30:10 allocation rule (too small to matter)
- Pilots do count toward portfolio heat (even small risk is real risk)
- A pilot cannot be scaled up without passing the full BUY gate cascade
- CAPITAL_PRESERVATION regime blocks all pilots — this is the one hard override
```

### Trading plan template addition

Add to the `Plan` section:

```markdown
- Entry type: {FULL / PILOT}
- If PILOT: reduced gates used: {list which gates were satisfied vs skipped}
- If PILOT: scale-up trigger: {what must happen to upgrade to full size}
- If PILOT: pilot expiry: {N desk-checks or date after which pilot is exited if no progress}
```

---

## Option E: Forced Decision Timeline on Every WAIT

**What it fixes:** The "WAIT forever" problem — the agent defers indefinitely because WAIT has no expiration.

**Where:** `technical-analysis/SKILL.md` (Phase Contracts → DECISION section, after the WAIT action rule) + `main.md` (desk-check defaults)

### New rule in TA SKILL.md DECISION section

Add after the existing WAIT definition:

> Every WAIT recommendation must include:
>
> 1. **Upgrade trigger:** A concrete, falsifiable condition that would change WAIT to BUY or HOLD. Example: "If AADI holds 10,900 on a daily close within the next 5 trading days, upgrade to BUY pilot."
> 2. **Downgrade trigger:** A concrete condition that would change WAIT to REMOVED or downgrade conviction. Example: "If AADI loses 10,200 on a daily close, downgrade to WATCHING."
> 3. **Decision horizon:** A maximum number of trading days or desk-checks after which the WAIT must be resolved. Default: 5 trading days or 3 desk-checks, whichever comes first.
> 4. **Expiry action:** What happens if the decision horizon passes without either trigger firing. Default: downgrade to WATCHING with explicit note "setup expired without resolution."
>
> A WAIT without these four fields is incomplete. The agent must not issue a bare WAIT.

### New rule in main.md desk-check defaults

Add to the desk-check symbol review step:

> For every symbol carrying a WAIT recommendation with a decision horizon, check whether the horizon has passed. If yes, execute the expiry action. Do not silently renew the WAIT — if the setup is still valid, it must be re-underwritten with a fresh decision horizon and fresh trigger levels based on current price action.

---

## Options C and D (Deferred — Add Later If Needed)

### Option C: Graduate the Regime Gate

**What it would fix:** CAPITAL_PRESERVATION being a near-total blocker.

**Concept:** Instead of binary "no new longs," make it graduated:

| Regime | Full-size entry | Pilot entry | Adds to winners |
|--------|----------------|-------------|-----------------|
| AGGRESSIVE | Yes | Yes | Yes |
| NORMAL | Yes | Yes | Yes (selective) |
| DEFENSIVE | Half-size only | Yes | No |
| CAPITAL_PRESERVATION | No | No | No |

**Why deferred:** Option B's pilot pathway already carves out a DEFENSIVE-regime entry path. If that's enough, C isn't needed. If CAPITAL_PRESERVATION periods are too long and too frequent, revisit C to allow pilots even in CP mode (with tighter constraints).

### Option D: Confirmation Decay Mechanic

**What it would fix:** The TA skill treating every session as if it's the first time seeing the setup.

**Concept:** Confirmation requirements relax over time for structurally valid setups:

- Session 1: Full confirmation required (trigger + follow-through + no contradiction)
- Session 2: Trigger required, confirmation can be partial
- Session 3+: If setup is still structurally valid and level held, relax to "acceptable entry zone"

**Why deferred:** Option E's forced decision timeline achieves a similar effect by forcing resolution. If setups still stale despite E, add D as a complementary mechanic.

---

## Implementation Priority

| Change | Files to modify | Effort | Impact |
|--------|----------------|--------|--------|
| A1: Wait staleness | `main.md`, PM `SKILL.md`, `trading-plan-template.md` | Small | High — kills infinite WAIT loops |
| A2: Retest observed | TA `SKILL.md` | Small | High — kills goldfish retest behavior |
| A3: Opportunity cost | PM `SKILL.md`, `review-watchlist-and-review-logging.md` | Small | Medium — makes inaction cost visible |
| B: Pilot entry | PM `SKILL.md`, `trading-plan-template.md` | Medium | High — creates a path to deploy capital |
| E: Decision timeline | TA `SKILL.md`, `main.md` | Small | High — forces WAIT to resolve |
| C: Graduated regime | PM `SKILL.md`, `main.md` | Medium | Medium — only needed if B isn't enough |
| D: Confirmation decay | TA `SKILL.md` | Medium | Medium — only needed if E isn't enough |

**Suggested order:** E → A1 → A2 → B → A3 → then evaluate if C or D are needed.

E is the smallest change with the highest immediate impact (every WAIT gets a deadline). A1 and A2 are small patches that fix the staleness and retest tracking. B is the structural fix that creates a new entry pathway. A3 is nice-to-have visibility. C and D are insurance if the first batch isn't enough.
