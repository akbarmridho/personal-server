# Vibe Investor Agent — Behavioral Analysis

**Scope:** ~100 sessions (Feb 7 – Apr 3, 2026), 5 skill frameworks, main system prompt, trading plan template  
**Analyst:** Kiro (external review, not the vibe-investor agent itself)

---

## The Three Complaints — Verdict

### 1. "The AI is too fucking defensive"

**Verdict: TRUE — and it's the biggest problem.**

Across ~100 sessions spanning nearly 2 months:

- Zero clean "BUY now" recommendations were ever issued. Not one.
- Every held position was classified as "hold-only," "exit-review," or "no add."
- Every buy candidate (AADI, ITMG, DSNG, TAPG, ESSA, BMRI) perpetually required "one more retest" or "shelf proof" before action.
- The agent is excellent at saying "trim BUMI 50 lots at 225" (specific, decisive, actionable) but says "wait for shelf proof at 10900-10500" for buys (vague, perpetually deferred).
- Cash ratio drifted from ~38% → 55% → 58% → 62% across the period. The portfolio is slowly bleeding toward all-cash with no re-entry mechanism.

The net effect: the agent is a **one-way valve**. Capital exits positions but never re-enters. Over 2 months, the user never got a green light to deploy cash despite multiple "READY" candidates being identified.

The agent's defensiveness is not random — it's a direct consequence of the system design. See Root Cause Analysis below.

### 2. "Almost everything is 'thesis intact but price low, time to avg down'"

**Verdict: FALSE — the opposite is true.**

The agent *never* recommends averaging down. It actively fights this pattern with language like:

- "averaging down is usually just buying your regret"
- "that's how people turn a manageable mistake into portfolio infection"
- "BUMI is the type of stock that can look 'cheap' all the way down"

The agent correctly refused to add to BUMI, BUVA, ELSA, and MEDC even when they were deep underwater.

If anything, the agent's anti-avg-down stance is so strong that it extends to situations where adding might actually be reasonable (e.g., a thesis-quality name that pulled back to a planned add zone). The agent treats "price went down" as universally disqualifying for adds, even when the original plan included a staged entry at lower levels.

### 3. "Every TA says 'wait for retest' — smart goldfish with memory loss"

**Verdict: HALF RIGHT.**

The "wait for retest" repetition is real:

- AADI got "wait for 10900-10500 retest" across 5+ sessions
- ITMG got "wait for 28300 shelf" across 4+ sessions
- DSNG and TAPG got the same treatment
- The agent never tracked how long a "wait" recommendation had been active
- The agent never acknowledged whether the retest already happened
- The agent never set an expiration on the wait

The "memory loss" part is wrong:

- The agent's file-based memory system is actually excellent
- It reads prior run logs, references specific prior analysis paths, maintains consistent thesis framing
- It traces doctrine back to skill files when challenged

The user noticed the retest problem and pushed back in one session:

> "how tf you check or see the retest? daily ohlcv? or intraday ohlcv? cause if you see retest on multiple daily candle then we are behind"

The agent explained the methodology but didn't address the core concern — are we missing entries by always waiting?

---

## Root Cause Analysis — Why the Agent Behaves This Way

The defensive behavior isn't a bug in the agent's reasoning. It's the inevitable output of the system's design.

### 1. The prompt and skills stack defensive rules multiplicatively, not additively

To issue a BUY, the agent must pass ALL of these gates simultaneously:

| Layer | Gates |
|-------|-------|
| Market regime | AGGRESSIVE / NORMAL / DEFENSIVE / CAPITAL_PRESERVATION |
| IHSG cash floor | 30% / 50% / 70% base, +10pp escalated |
| Portfolio heat | Max 5-6% total open risk |
| Concentration | No single stock >30%, sector limit ≤2 |
| Correlation | corr >0.75 blocks |
| Liquidity | Position size vs ADTV |
| TA: State | Daily state must be classifiable |
| TA: Location | Must be meaningful (not mid-range) |
| TA: Setup | Exactly one setup family must fit |
| TA: Trigger | Must be active (15m owns this) |
| TA: Confirmation | Must not be rejected |
| TA: Invalidation | Must be explicit |
| TA: Path | Next-zone path must exist |
| TA: RR | Must be above threshold |
| TA: Conflicts | No unresolved contradictions |
| Flow | Broker-flow verdict should confirm or lead |
| Narrative | Story should be STRONG or MODERATE |
| PM | Trade classification, evidence grade, all minimum fields filled |

That's ~20 independent gates. If ANY single gate fails, the default is WAIT.

In a weak market (IHSG below SMA200 for most of this period), the regime gate alone forces CAPITAL_PRESERVATION with 70-80% cash floor. The TA gates then add "wait for retest" on top. The flow gates add "sponsor quality unclear." The result is that **BUY is mathematically almost impossible**.

### 2. The TA skill's "default to WAIT" doctrine is asymmetric

The technical-analysis SKILL.md has 11 hard gates (G1-G11) and the explicit rule:

> "unresolved decision-critical ambiguity defaults to WAIT"

This means:

- State unclear → WAIT
- Location poor → WAIT
- No valid setup → WAIT
- Trigger absent → WAIT
- Confirmation mixed → WAIT
- Invalidation unclear → WAIT
- No next-zone path → WAIT
- RR below threshold → WAIT

There is no equivalent gate cascade for EXIT. EXIT requires only: invalidation failed OR thesis invalidated OR trigger failure + confirmation breakdown. That's **2-3 conditions for EXIT vs 11+ for BUY**. The system is structurally biased toward inaction on entries and action on exits.

### 3. The "wait for retest" problem is a structural gap in the TA skill

The TA skill defines setup families (S1-S5) that all require a trigger event. S1 is "breakout and retest continuation," S2 is "pullback to demand." Both inherently require waiting for price to come to you.

But the skill has **no mechanism** for:

- Tracking how long a "wait for retest" has been active
- Acknowledging when a retest already occurred between sessions
- Escalating a stale WAIT into a forced decision (upgrade, downgrade, or expire)
- Recognizing that in a recovering market, the "retest" may never come because the move is real

The agent correctly follows the skill's rules each session, but since each session is stateless on the "wait duration" dimension, it keeps issuing the same recommendation without progress.

### 4. The portfolio-management skill's mixed-signal arbitration always resolves toward safety

The hierarchy is:

1. Hard invalidation
2. Portfolio override
3. Parent synthesis
4. Discretionary adds

And the explicit rule:

> "If conflict remains ambiguous after hard rules and portfolio overrides, prefer the safer sizing path."

This means when TA says "setup developing" and flow says "unclear" and narrative says "moderate," the PM skill resolves to "wait" because the safer path is always inaction.

---

## What's Actually Working Well

- **Exit discipline is genuinely strong.** BUMI was called invalidated early and decisively. LEAD and BULL were closed on structural breaks. The agent doesn't let losers run.
- **Anti-averaging-down discipline is excellent.** The agent never recommends adding to broken positions.
- **Memory system is sophisticated.** Cross-session continuity via file-based state is well-maintained.
- **Analytical depth is high.** The 4-lens framework (technical, flow, narrative, fundamental) produces thorough analysis.
- **The agent adapts to user pushback.** When challenged, it explains reasoning and sometimes adjusts.
- **Thesis construction is rigorous.** New theses get proper structure, catalysts, invalidation.

---

## What Needs to Change

### 1. Add a "WAIT staleness" tracker

When a symbol gets WAIT/NO_CHASE, record the date. If the same recommendation persists for N sessions (e.g., 3 desk-checks) without the trigger level being tested, force a re-evaluation: either the level is wrong, the setup expired, or the opportunity passed. Don't let WAIT be eternal.

### 2. Create a "pilot entry" pathway that bypasses the full gate cascade

The current system requires ~20 gates to pass for BUY. Add a lighter-weight "pilot entry" (e.g., 0.25-0.5% of portfolio) that requires fewer gates — maybe just: thesis quality OK, invalidation explicit, regime not CAPITAL_PRESERVATION, and liquidity OK. This lets the agent deploy small capital to test ideas without needing perfect confirmation.

### 3. Rebalance the asymmetry between entry and exit gates

Currently EXIT needs 2-3 conditions, BUY needs 11+. Consider:

- Reducing the hard gates for BUY when conviction is HIGH and evidence grade is 1-2 (official filings / hard data)
- Adding a "confirmation already happened" fast-track when the retest was observed in prior sessions

### 4. Add explicit "opportunity cost" accounting to the WAIT decision

The agent never quantifies what it costs to wait. If AADI was READY at 10,500 and is now at 12,000, the agent should acknowledge "our WAIT recommendation cost us 14% of upside" and factor that into future WAIT decisions. Currently, missed opportunities are invisible.

### 5. Fix the regime gate's interaction with the cash floor

During the analysis period, IHSG was below SMA200 for weeks, which locked the cash floor at 70-80%. With the portfolio already at 55-62% cash, the agent correctly noted the shortfall but the only way to close it was trimming — never by acknowledging that some of the cash floor was already met by prior trims. The floor should be a constraint on new gross exposure, not a perpetual blocker when you're already close.

### 6. Track "retest observed" state in symbol memory

When the agent says "wait for retest at 10,900," the next session should check whether 10,900 was actually tested in the intervening period. If it was tested and held, the agent should acknowledge that and potentially upgrade to BUY. If it was tested and failed, downgrade. Currently this check doesn't happen.

### 7. Model selection matters

| Model | Quality | Notes |
|-------|---------|-------|
| gpt-5.4 | Excellent | Direct, opinionated, well-structured |
| gpt-5.4-mini | Weak | Missed IDX holidays, thinner analysis, more tool errors |
| mimo-v2-pro-free | Dangerous | Hallucinated completely unrelated tool calls (medicaid_scraper), executed commands from wrong project |
| big-pickle | Decent | Used in 1 session, performed adequately |

Stick with gpt-5.4 for anything that touches portfolio decisions.

---

## Cross-Session Statistics

| Metric | Value |
|--------|-------|
| Total sessions analyzed | ~100 |
| Sessions with BUY recommendation | 0 |
| Sessions with EXIT/TRIM recommendation | 15+ |
| Sessions with WAIT/HOLD-ONLY | 40+ |
| Unique symbols in coverage | 40+ |
| User frustration instances | 8+ |
| Cash ratio trajectory | 38% → 55% → 58% → 62% |
| "Wait for retest" repeated across sessions | AADI (5+), ITMG (4+), DSNG (3+), TAPG (3+) |

---

## The Uncomfortable Truth

The agent is doing exactly what it was told to do. The prompt says "preserve capital first," the PM skill says "prefer the safer sizing path," the TA skill says "default to WAIT under ambiguity," and the regime gate says "no aggressive new longs in CAPITAL_PRESERVATION."

In a market where IHSG spent weeks below SMA200, the system correctly computed that the right answer is "don't buy anything."

The problem is that this is **correct in theory but useless in practice**. A system that can only say "don't buy" in a weak market and "wait for retest" in a recovering market will never deploy capital. The defensive rules need a counterweight — some mechanism that says "we've been defensive long enough, the cost of inaction is now higher than the cost of a small wrong entry."

**The agent isn't broken. It's too obedient.**
