# Take-Profit Doctrine for a Structure-First, Wyckoff-Aware Swing Framework on IDX Equities

## Executive synthesis and doctrine objectives

The missing “take-profit / exit-for-profit” doctrine can be filled without changing the framework’s identity by treating trade management as a **state machine** driven by: (a) *market structure* (swings, BOS/CHOCH, range vs trend), (b) *market phase* (Wyckoff markup vs distribution maturity), (c) *accepted value* (volume-profile VA/POC/HVN/LVN behavior), and (d) *friction constraints* that are more binding on IDX than in large-cap US equities (auto-rejection limits; two daily sessions; periodic auction windows; liquidity that can thin and spreads that can widen, especially during stress). citeturn16view1turn15view0turn17view2turn10view5

From the research base used here, three principles are “load-bearing” for a doctrine that stays structure-first and is implementable in a deterministic pipeline:

1. **Exits must be pre-planned in the same way stops are pre-planned**, because initial risk (R) and all R-multiples depend on having an exit point defined at entry; trailing stops are simply a rule-based mechanism that tightens that exit in the favorable direction and is not moved backward. citeturn35view0turn10view4turn33view0  
2. **Partial exits and trailing stops are complementary**, not substitutes: partials monetize level-to-level structure (and reduce behavioral pressure), while trailing rules decide whether the final portion is a “runner” or an “ordinary win.” This is consistent with practitioner trade management that explicitly combines (i) profit targets defined in risk multiples and (ii) trailing logic for the remainder. citeturn32view1turn32view0turn35view0  
3. **On markets with meaningful frictions, stop/target tightness must be chosen with transaction costs in mind**. Empirical work on trailing stop rules shows they can reduce downside/risk but that transaction costs erode the benefit of tighter thresholds, making wider thresholds more robust when costs and slippage are material. citeturn10view5turn17view2turn25view1

The rest of this brief translates those principles into (i) design choices that answer the user’s seven research questions, and (ii) an actionable rule set (“R-TP-XX”) that can be dropped into the skill as a new **Take-Profit And Trade Management** section.

## Research findings relevant to exits

Wyckoff phase analysis supplies observable “exit urgency” cues because it defines how campaigns transition from markup to distribution using repeatable events (e.g., buying climax, automatic reaction, signs of weakness, last point of supply, UT/UTAD). In particular, distribution schematics explicitly characterize **SOW** and **LPSY** as showing supply dominance / demand exhaustion, and **UTAD** as a late-range test that often precedes markdown—exactly the kind of context where a long-only framework should tighten or exit rather than “hope for one more push.” citeturn14view1turn14view0turn14view2

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["Wyckoff distribution schematic UTAD SOW LPSY","Wyckoff accumulation markup distribution markdown cycle schematic","volume profile value area POC VAH VAL HVN LVN example chart"],"num_per_query":1}

Volume-profile and auction-market concepts provide a **non-oscillator** way to express “value acceptance vs rejection,” which maps naturally onto your existing fields (“value acceptance state,” VAH/VAL/POC/HVN/LVN). A mainstream platform definition is that **POC** is the price with the highest traded volume in the profile window, and **Value Area** is the price range that contains a chosen percentage of the volume (commonly 70%), bounded by **VAH** and **VAL**; the value-area calculation is explicitly defined as expanding outward from the POC until the target percentage is reached. citeturn10view2  
Practitioner AMT/Market Profile guidance further links: (a) **balanced conditions** to rotation around value/POC, (b) **imbalanced conditions** to a progressive shift of value/POC, and (c) **acceptance outside value** to trend continuation, while **reversion back into value** increases the probability of rotation back toward POC. citeturn24view1turn24view2turn24view3  
The same sources commonly treat HVNs as “accepted” zones that can act as support/resistance while LVNs (gaps/shelves) mark rejection and can facilitate faster movement to the next HVN—useful for defining target ladders and “fast-travel” expectation between nodes. citeturn24view0turn24view3turn10view2

Trailing stop methods that remain compatible with structure-first trading fall into three families:

- **Structural trailing** (behind swing lows / structure breaks), aligned with the logic that swing lows are invalidation points for long positions when broken. citeturn5search3turn5search15  
- **Volatility-based trailing** (ATR / Wilder volatility concepts), which explicitly scale the stop distance with realized volatility via ATR multipliers and are designed to adapt as volatility rises or falls. citeturn33view0turn33view1turn33view3  
- **MA-based trailing** (close below key MA), which is widely used for trend identification and dynamic support/resistance, but is explicitly more prone to false signals in choppy conditions—suggesting the need to combine MA rules with structure confirmation in sideways regimes. citeturn34view1turn5search2turn34view0

On markets where “friction risk” matters, two empirical points are especially relevant to design:

- **Trailing stop-loss rules can reduce risk / downside**, but the mean-return trade-off is sensitive to how tight the threshold is and to transaction costs; wider thresholds can remain useful after accounting for transaction costs. citeturn10view5  
- **Trading costs (including spreads) can widen in stress**, and emerging market liquidity metrics show that during crises, transaction costs rise and bid-ask spreads widen even when trading activity increases—consistent with a doctrine that becomes *more conservative* about tight trailing and *more proactive* about harvesting profits when stress indicators appear. citeturn17view2turn3search3

Finally, time-based management has two different “evidence hooks” relevant to your use case:

- Practitioner/system design literature treats **time stops** as valid trade management: if the trade does not progress after entry, tightening stops or exiting can be explicitly used as time-stop behavior. citeturn32view3turn20search7turn35view0  
- Cross-sectional momentum evidence shows abnormal-return persistence over **3–12 month holding periods** with dissipation/reversal tendencies later, implying that trade edges can be time-horizon-dependent (even when your entry is structure-based). This supports having doctrine that classifies “winner staleness” by elapsed sessions and phase maturity, rather than only by entry staleness. citeturn38view0turn38view1

## Trade management architecture for this skill

A doctrine that can be integrated into your existing deterministic pipeline benefits from explicitly defining “live trade state” variables that are computable from fields you already have (or can trivially add without changing the OHLCV→ta_context preprocessing philosophy). The key idea is: **trade outcomes are decided by what happens after entry**, so the policy layer needs a consistent mapping from observed structure/value/phase into (a) partial exits, (b) trailing-stop updates, and (c) “exit now vs hold” overrides. citeturn35view0turn32view1turn10view2

A minimal state model (implementation-neutral) that supports the rulebook below:

- **profit_state**: `PRE_T1`, `POST_T1`, `POST_T2`, `RUNNER_ONLY` (derived from whether price has tagged each target in `target_ladder`). citeturn32view1  
- **regime_state**: `BALANCE` vs `IMBALANCE` (you already compute balance/imbalance classification; volume profile adds “acceptance outside value” as confirmation). citeturn24view2turn24view1  
- **phase_maturity**: `FRESH`, `MATURING`, `MATURE`, `DEGRADING` (computed from Wyckoff cycle mapping + maturity cues like UT/UTAD/SOW/LPSY, plus structural failure signs). citeturn14view1turn14view2  
- **trail_mode**: `STRUCTURE`, `ZONE`, `MA`, `ATR`, `HYBRID` (selected by regime + setup family + phase maturity). citeturn33view0turn34view1turn24view2  
- **risk_friction_flag**: `LOW`, `ELEVATED`, `HIGH` (computed from liquidity/red flags you already have + market-level stress cues; doctrine uses it mainly to avoid overly tight trailing and to bias toward harvesting into liquidity). citeturn17view2turn10view5turn25view1

Why this is specifically important for IDX: the exchange microstructure includes discrete sessions (including pre-opening/pre-closing mechanisms and two daytime sessions), and it enforces auto-rejection limits (orders outside bands can be rejected automatically), both of which mean that the “how” and “when” of exit execution can matter more than in continuously traded, deep US large caps. citeturn16view1turn15view0  
In addition, Indonesia market development actions such as lot-size changes (500→100 shares/lot) and tick/lot rules have documented effects on liquidity proxies like bid-ask spreads and depth; this supports treating liquidity as variable by symbol and period, not as a constant. citeturn26view0turn15view4

## Take-profit and trade management rulebook

The following rules are written to be inserted verbatim as a doctrine section. They assume the skill can read: setup family (S1–S5), regime (balance/imbalance), Wyckoff phase mapping, key structure points (swings; BOS/CHOCH), zones, MAs (21EMA/50SMA/200SMA), ATR, and volume-profile levels.

**R-TP-01 (Exit plan is mandatory at entry).** Every `BUY` must include: (a) a `target_ladder` with at least two rungs, (b) the initial trail method selection (`trail_mode` + anchor), and (c) an explicit “winner time stop” definition (elapsed sessions threshold), because initial risk (R) and all R-multiples are only well-defined when an exit point exists. citeturn35view0turn32view1

**R-TP-02 (Profit-taking uses structure and value, not oscillators).** Profit targets must be derived from opposing structure/levels (HTF supply zones, prior swing highs, VAH/HVN clusters) and/or risk multiples, not oscillator thresholds, to remain consistent with structure-first Wyckoff logic and auction/value concepts. citeturn32view1turn24view2turn10view2

**R-TP-03 (Two exit types).** Classify every profit exit as either (a) **with-trend exits** (selling into strength at preplanned targets via limit logic) or (b) **countertrend exits** (triggered by giveback/structure failure and executed as a protective exit). citeturn32view1turn10view4

**R-TP-04 (Profit-defense is progressive).** The stop may tighten as the trade progresses, but it must never loosen (never move “backward”), and stop tightening should be compatible with the chosen trail mode. citeturn35view0turn10view4

**R-TP-05 (Trade management runs on D authority by default).** Unless an emergency invalidation occurs, trailing-stop updates and profit-taking decisions must be evaluated on the daily close, because intraday spreads and noise can be higher (especially near the open and end of day). citeturn25view1turn16view1

**R-TP-06 (Liquidity-aware execution windows).** Prefer harvesting partials into known liquidity windows (when spreads/market depth are more favorable) and avoid impulsive “panic exits” near structurally noisy windows unless the invalidation condition is hit. citeturn25view1turn17view2

**R-TP-07 (Range doctrine is different from trend doctrine).** If `regime_state = BALANCE` (range), the default objective is **rotation** (edge→POC→opposite edge), and the default profit-taking style is **faster + more complete**; runners are only permitted after acceptance outside balance. citeturn24view1turn24view2

**R-TP-08 (Trend doctrine is different from rotation doctrine).** If `regime_state = IMBALANCE` (trend), the default objective is **continuation** and the default profit-taking style is **smaller early partials + larger runner allocation**, with trailing selected to avoid premature exits while the trend persists. citeturn24view1turn33view1turn10view5

**R-TP-09 (Target ladder must include a “structure target” and an “R target”).** `target_ladder` must include at least: (a) one rung that is a recognizable structure/value destination (prior swing high, supply zone boundary, VAH/HVN), and (b) one rung defined by an R multiple (typically +1R), so the ladder works even when structure is ambiguous (discovery). citeturn32view1turn22search0turn33view0

### Partial exit framework

**R-TP-10 (Default partial sizing template).** If no special condition applies, set partial sizing as: **T1 = 25–33%**, **T2 = 25–33%**, **T3 (runner) = remainder**, consistent with common risk-multiple profit-taking that exits ~¼–⅓ at +1R and reduces further by +2R while leaving a remainder to manage differently. citeturn32view1turn32view0turn35view0

**R-TP-11 (T1 definition).** T1 is the earliest of: (a) nearest opposing micro-structure level that is likely to cause a reaction, or (b) **+1R** from entry, because +1R is a robust, testable first monetization point that anchors discipline. citeturn32view1turn35view0

**R-TP-12 (T2 definition).** T2 is the earliest of: (a) the next opposing HTF structure level (prior swing high / supply zone), or (b) **+2R**, because extending risk-multiple targets is explicitly supported as a scalable template and encourages consistency. citeturn32view1turn22search0

**R-TP-13 (T3 definition).** T3 is not a fixed “top call.” It is either: (a) the next major HTF objective if structurally well-defined, or (b) “open-ended” with trailing if in discovery (new highs / broken resistance). citeturn22search0turn22search5turn33view1

**R-TP-14 (Setup-conditioned partial split).** Modify partial sizing by setup family:  

- S1/S2 (continuation): shift weight to runner (e.g., 25/25/50) because trend-following trailing is designed to keep traders in the trend. citeturn33view1turn24view1  
- S3/S5 (reversal/spring): shift weight earlier (e.g., 33/33/34 or 40/30/30) because reversals often encounter overhead supply and distribution risk sooner. citeturn14view1turn32view1  
- S4 (range rotation): treat the opposite range edge or VAH/VAL boundary as the primary liquidation zone and permit only a small runner unless acceptance outside value develops. citeturn24view2turn24view1

**R-TP-15 (Quality-conditioned partials).** If breakout/continuation quality is strong (clean BOS, acceptance outside value, value/POC shift supportive), reduce early partial aggressiveness; if quality is marginal (late-phase, weak acceptance, overhead supply nearby), increase early partial aggressiveness. citeturn24view1turn24view2turn14view1

**R-TP-16 (Auction/value-conditioned partials).** If price reaches a target located at an HVN/VAH and immediately shows acceptance failure (re-entry into value), treat that as a “take what the market gave” condition and advance the partial schedule (harvest more at that rung). citeturn24view2turn10view2turn24view0

### Trailing stop selection and updates

**R-TP-17 (Trail selection is regime + phase + setup).** Choose `trail_mode` as a function of: `regime_state` (balance vs imbalance), Wyckoff phase maturity, and setup family; do not allow arbitrary switching without a state change. citeturn24view1turn14view1turn33view0

**R-TP-18 (Structural trailing is default in continuation markup).** In a clean uptrend (sequence of higher highs/higher lows; bullish BOS intact), the default trailing is **STRUCTURE**: stop under the last confirmed daily swing low (or the last “weak low” that should not break if trend is intact). citeturn5search3turn5search15

**R-TP-19 (Zone trailing is default in accepted-value grind trends).** If uptrend progress is characterized by accepted zones (HVNs building higher; POC/value shifting up), use **ZONE** trailing: stop below the last accepted demand zone or last HVN that should hold if value remains above. citeturn24view1turn24view0turn10view2

**R-TP-20 (ATR trailing is default under high friction / high volatility).** If volatility rises or friction risk is elevated, use **ATR** trailing (or hybrid) with a multiplier chosen to avoid constant whipsaw, because ATR trailing stops explicitly scale stop distance with volatility and wider thresholds are more robust under transaction costs. citeturn33view0turn33view3turn10view5

**R-TP-21 (ATR parameters are volatility- and cost-sensitive).** Use a longer ATR window / larger multiplier when volatility is high or liquidity is thin; do not tighten the multiplier just because open profit is large, since tight thresholds are more transaction-cost sensitive. citeturn33view0turn10view5turn17view2

**R-TP-22 (MA trailing is a “soft exit,” not a stand-alone trigger in chop).** MA-based trailing is permitted, but it must be (a) restricted to trending regimes, and (b) confirmed by structure (e.g., close below 21EMA **plus** a structural lower low / CHOCH), because MAs are lagging and are less reliable in sideways conditions. citeturn34view1turn34view0turn5search2

**R-TP-23 (Discovery mode prefers trailing over targets).** In discovery (new highs / resistance break), default to trailing (STRUCTURE or ATR) rather than trying to predefine “the top,” consistent with the purpose of volatility-based trailing tools: staying in the trend until a sufficiently large adverse move forces reevaluation. citeturn22search0turn33view1turn33view0

**R-TP-24 (After T1, remove catastrophic loss risk).** After T1 is filled, the stop for the remaining position must be advanced to at least *(a)* entry (break-even) or *(b)* a structural/zone level that makes a full-size loss unlikely unless a genuine reversal occurs. citeturn32view1turn35view0turn39view1

**R-TP-25 (After T2, promote to “runner logic”).** After T2 is filled, treat the remainder explicitly as a runner and apply the selected trailing mode without discretionary interference, unless an explicit “profit exit override” signal occurs. citeturn32view1turn33view1

### Profit exit signals for “take the money now”

**R-TP-26 (Profit exit override hierarchy).** Profit exit overrides are triggered, in order of priority, by: (1) structural breakdown, (2) Wyckoff distribution maturity signal, (3) value acceptance failure, (4) time stop activation. citeturn14view1turn24view2turn32view3

**R-TP-27 (Structural breakdown exit).** If the chosen trail anchor breaks on the daily close (swing low break for STRUCTURE; accepted zone failure for ZONE; ATR line break for ATR; MA+structure failure for MA), issue `EXIT` for the remaining size. citeturn33view0turn5search3turn24view2

**R-TP-28 (UTAD is a high-urgency exit context).** If a Wyckoff **UTAD** occurs (late-range break above resistance followed by failure back into the range), tighten aggressively (advance trail to very near structure) and prefer harvesting remaining size on the next bounce; if a subsequent SOW prints, exit remaining size. citeturn14view1turn14view2

**R-TP-29 (SOW and LPSY are high-urgency exit contexts).** If Wyckoff **SOW** and/or **LPSY** signatures appear (supply dominance; weak rallies; demand exhaustion), tighten to the nearest structural level that must hold; if that level breaks, exit remaining size. citeturn14view1turn14view2

**R-TP-30 (Buying climax logic).** If a buying-climax-like event appears in context (climactic up-move + subsequent automatic reaction), treat it as “phase maturity rising,” increase partial aggressiveness, and switch trailing from STRUCTURE→ZONE or ZONE→MA/ATR (tighter) depending on regime. citeturn14view1turn14view0

**R-TP-31 (Value acceptance failure exit).** If price was accepted outside value (trend) but then **re-enters and holds inside the prior value area**, assume rotation risk has risen (toward POC) and harvest at least the next planned partial; if POC fails to hold afterward, exit remaining size. citeturn24view2turn24view1turn10view2

**R-TP-32 (POC/value migration is a “hold vs tighten” gauge).** If POC/value area have been progressively shifting upward, maintain runner posture; if POC/value stops migrating or shifts down while price stalls, treat as maturity/degradation and tighten. citeturn24view1turn24view2

**R-TP-33 (LVN traversal expectation).** If price enters an LVN (low-volume shelf) with momentum, expect faster travel to the next HVN and use that HVN as a natural target; if price fails to traverse and instead rejects back, treat as failed initiative and tighten/harvest. citeturn24view0turn24view3

### Time-based profit management

**R-TP-34 (Winner staleness is real and must be defined).** Define “winner staleness” as elapsed sessions since entry (or since last structural expansion) **without** reaching the next ladder rung and **without** producing new favorable structure; this is separate from “entry staleness.” citeturn32view3turn38view0

**R-TP-35 (Time stop before T1).** If `profit_state = PRE_T1` and the trade fails to reach T1 within the pre-defined time window for that setup/regime, reduce risk by either (a) tightening the stop (effectively a time stop) or (b) exiting, depending on whether structure still supports the thesis. citeturn32view3turn35view0

**R-TP-36 (Time stop after T1).** If `profit_state = POST_T1` and price fails to make a new structural high for the defined “runner patience window,” harvest an additional partial on the next strength and tighten the trailing anchor to the nearest valid structural level. citeturn32view3turn32view1

**R-TP-37 (Holding-period realism).** For medium-term holds, assume the edge horizon can be time-dependent; if a trade has reached your usual swing horizon without progress, prefer monetization over indefinite holding. citeturn38view0turn32view3

### Re-entry after partials

**R-TP-38 (Re-entry is a new trade, not “undoing a sell”).** Any re-add after partial exits must be evaluated as a fresh entry that satisfies the same actionability gates, with its own invalidation, and must respect the system’s add-only-when-working principle. citeturn35view0turn32view1

**R-TP-39 (Re-add trigger type).** Allow re-add only after a bullish continuation trigger (e.g., BOS with acceptance outside value, or breakout→retest-hold) that implies the campaign continues; do not re-add merely because price returned to your partial exit price. citeturn24view2turn22search0

**R-TP-40 (Re-add sizing).** Re-add size must be capped so that the worst-case loss on the add does not raise total trade risk above the original planned risk envelope; if that cannot be achieved, no re-add is permitted. citeturn35view0turn10view5

## Setup and phase mappings for defaults

A practical way to keep the doctrine deterministic is to define **default templates** (partials + trail mode) by setup family, then allow only state-driven deviations (phase maturity shift; acceptance failure; friction spike). This matches research emphasizing that trade management must be consistent, testable, and sensitive to market conditions and transaction costs. citeturn32view1turn10view5turn17view2

For integration into your existing five setup families, the following defaults are consistent with the evidence base above:

- **S1 breakout-retest continuation**: default partials 25/25/50 with STRUCTURE or ATR trailing (depending on volatility) because trend-following trailing tools are designed to avoid early exits while a breakout trend extends. citeturn33view1turn33view0turn32view1  
- **S2 pullback to demand**: default partials 33/33/34 with STRUCTURE trailing, because the trade is already “buying support,” and the invalidation logic is naturally swing-based. citeturn5search3turn32view1  
- **S3 sweep-reclaim reversal**: default partials 40/30/30 with ZONE→MA/ATR tightening once the first reaction completes, because reversal trades are most vulnerable to late distribution/maturity signals and overhead supply. citeturn14view1turn32view1turn34view1  
- **S4 range-edge rotation**: default partials 50/30/20 with a primary exit at opposite range edge / VA boundary and minimal runner unless the market accepts a new value area outside the range. citeturn24view2turn24view1  
- **S5 Wyckoff spring with reclaim**: default partials 33/33/34 early in markup; shift to 40/30/30 and tighter trailing as maturity increases, because Wyckoff explicitly models how campaigns shift from accumulation to markup and later to distribution. citeturn14view2turn14view1

## ta_context schema integration notes

The doctrine above can be integrated with minimal schema impact because most conditions map to fields you already produce (structure, zones, MAs, volume profile, Wyckoff cycle, actionability state). What is typically missing in a pure “analysis snapshot” schema is *trade state*—progress through the ladder, and the chosen trail method/anchor. citeturn32view1turn24view2turn35view0

A compatible extension (optional but recommended) is a `trade_management` object stored alongside the existing output, updated on each `HOLD` run. It can be computed without any new indicators:

```json
{
  "trade_management": {
    "profit_state": "PRE_T1 | POST_T1 | POST_T2 | RUNNER_ONLY",
    "phase_maturity": "FRESH | MATURING | MATURE | DEGRADING",
    "trail_mode": "STRUCTURE | ZONE | MA | ATR | HYBRID",
    "trail_anchor": {
      "type": "swing_low | demand_zone | vah_val | ma21 | atr",
      "price": 0
    },
    "time_stop": {
      "max_sessions_pre_T1": 0,
      "max_sessions_post_T1_no_new_high": 0
    },
    "partials_plan": [
      {"target_id": "T1", "size_pct": 0.0},
      {"target_id": "T2", "size_pct": 0.0},
      {"target_id": "T3", "size_pct": 0.0}
    ]
  }
}
```

This aligns with research-driven trade management in three ways: (1) it keeps exits preplanned and measurable in R-multiples, (2) it makes trailing selection deterministic and state-dependent, and (3) it explicitly encodes time stops and friction-aware behavior rather than leaving them implicit or discretionary. citeturn35view0turn32view1turn10view5
