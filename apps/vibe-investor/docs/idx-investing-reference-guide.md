# IDX Investing Reference Guide

## Goal

This is a human-facing investing handbook for analyzing IDX stocks and managing an IDX portfolio.

It is distilled from the current Vibe Investor doctrine, but written as a practical reference for a human investor. It should help you build a thesis, analyze a stock through multiple lenses, map future scenarios, size risk, and review decisions without reading agent internals or prompt files.

## 1. Market Reality

IDX is not an efficient market in the textbook sense. Price often moves because of sponsor flow, liquidity control, and narrative repricing, not only because fundamentals changed.

A good business can bleed for months if supply dominates and sponsor flow is weak. A mediocre business can run hard if accumulation is active and the story is fresh. The job is not to morally judge that reality but to trade and invest with it.

Use four lenses for every serious stock view:

| Lens | What it answers |
|---|---|
| Technical | Where is price in structure, what setup exists, where is invalidation, what is the next path? |
| Flow | Are visible brokers accumulating or distributing, is sponsor quality good, and does flow lead/confirm/warn versus price? |
| Narrative | What is the market story, what catalyst can reprice the stock, is the story early or crowded, and what breaks it? |
| Fundamental | Is the business real and durable, are financials trustworthy, is valuation reasonable, and what is the value-trap risk? |

Core principles:

- Preserve capital first. Avoid large drawdowns before chasing upside.
- Think in probabilities, not certainty.
- Separate process quality from P&L outcome.
- Change your view when evidence changes. Do not defend stale bias.
- When signals conflict, do not force action. `WAIT` is a valid decision.

## 2. Thesis Building

A thesis is a falsifiable explanation of why a stock should work, what must happen next, and what would prove you wrong.

Minimum thesis structure:

- Why this stock should work.
- What the key driver or catalyst is.
- What must be true for the thesis to stay valid.
- What evidence would weaken or break the thesis.
- What timeframe you expect the thesis to play out on.
- What monitoring signals matter next.

Evidence hierarchy:

1. Official filings and company disclosures
2. Company profile, financials, and hard operating data
3. Internal research and analysis documents
4. External news and reputable web sources
5. Social discussion
6. Rumors

Rules:

- Do not treat rumor as the base thesis unless the trade is explicitly speculative and sized accordingly.
- Size should scale with evidence quality, not excitement.
- If you cannot define invalidation, the thesis is underbuilt.
- If one linear path is not enough because future outcomes can diverge materially, introduce scenarios, but keep the detailed scenario map in Section 7.

## 3. Technical Playbook

Technical analysis is the chart-level operating plan: where to engage, where you are wrong, and what path price is likely to take next.

Use daily as the main structure authority and 15m as the timing/trigger layer. Intraday timing can veto a trade, but it should not override a damaged daily thesis.

Workflow:

1. Define the job: fresh setup, update, or postmortem.
2. Classify daily state: trend continuation, range rotation, potential reversal, or no-trade.
3. Map location: support/resistance zones, swing levels, value area, MA context, liquidity draws.
4. Choose one setup family or no setup.
5. Wait for trigger.
6. Confirm participation and acceptance.
7. Build risk from invalidation backward.
8. Choose one action: `BUY`, `HOLD`, `WAIT`, or `EXIT`.
9. Define what confirms, weakens, or invalidates the plan next.

Setup families:

| Setup | Use when | Needs |
|---|---|---|
| `S1` Breakout + retest continuation | Trend supports continuation and resistance is being reclaimed | Close beyond level, follow-through, retest hold or continued acceptance |
| `S2` Pullback to demand | Uptrend intact and price returns to a meaningful support/demand zone | Support hold, constructive selling pressure, daily structure intact |
| `S3` Sweep/excursion reclaim reversal | Price briefly trades through liquidity then reclaims | Clear excursion, reclaim/rejection, confirmation that reclaim holds |
| `S4` Range edge rotation | Regime is balanced and price is at a range edge | Edge reaction and edge-to-edge path |
| `S5` Wyckoff spring reclaim | Accumulation/range context with support-side spring behavior | Spring-like excursion, reclaim, follow-through |
| `NO_VALID_SETUP` | Location or structure is poor | Stay in `WAIT` |

Risk rules:

- No setup without invalidation.
- Stop should come from structural invalidation first, not arbitrary percentage.
- Primary target should be the next meaningful zone.
- If next-zone path is unclear, stay in `WAIT`.
- If reward-to-risk is poor, stay in `WAIT`.
- Do not average down into broken structure.
- After first target, protect the remaining position with a trail or tighter risk rule.

`WAIT` is usually the right answer when state is unclear, price is mid-range, trigger is absent, confirmation is mixed, invalidation is vague, liquidity path is unclear, or RR is weak.

## 4. Flow Playbook

Broker flow is a sponsor-quality and supply/demand lens, not a standalone buy/sell engine.

Read gross flow first, then use net flow as a compression layer. Net-only thinking can hide heavy two-way activity and false comfort.

Core flow questions:

- Is visible broker pressure constructive or distributive, and how strong is the conviction score (0-100)?
- Who is behind the flow? Foreign buying with local selling is a very different signal than local buying with foreign selling.
- Are buyers paying up above VWAP or absorbing below?
- Is buying/selling persistent or random?
- Is concentration asymmetric? Gini asymmetry >0.12 suggests institutional accumulation; <-0.12 suggests institutional distribution.
- Is broker coverage high enough to trust the visible picture?
- Does flow lead price, confirm price, warn against price, or remain unclear?
- Where is the net accumulation price relative to current price? If accumulators are in profit, the flow read is stronger.

Useful concepts:

| Concept | Interpretation |
|---|---|
| Rising CADI + positive recent net flow | Usually constructive |
| Buyers paying above VWAP | More aggressive sponsorship |
| High persistence | Stronger signal quality |
| High Gini asymmetry (buy > sell) | Institutional accumulation pattern — few big buyers, many small sellers |
| Net accumulation price below current price | Visible accumulators are in profit, supporting the read |
| Foreign net buy + local net sell | High-conviction institutional accumulation |
| Local net buy + foreign net sell | Often distribution into retail buying |
| Government/BUMN net flow | State-directed activity with different persistence characteristics |
| Positive flow-price alignment | Flow is confirming structure |
| Flow deterioration while chart still looks fine | Warning signal |
| CADI, MFI, or freq+Gini divergence | Different types of flow-price mismatch; freq+Gini divergence can reveal hidden accumulation |
| Low coverage / high anomaly / high wash risk | Discount the flow read |

Trust regime matters. On illiquid, noisy, or anomaly-prone tickers, broker flow deserves less authority. On cleaner, liquid tickers with stronger historical flow-price usefulness, flow can carry more weight in synthesis. High-volatility tickers use a different factor weighting that emphasizes MFI over persistence.

End every flow read with:

- what would confirm the flow verdict,
- what would weaken it,
- what would invalidate it,
- and when to review again.

## 5. Narrative Playbook

Narrative is a pricing regime, not a moral judgment on business quality. A weak business can still rally if the story is fresh, under-owned, and sponsored. A strong story can still be a bad trade if it is already crowded and priced in.

First do a business reality check. Avoid building story on shells, unclear monetization, multi-year revenue decay with no credible recovery path, or distress risk.

Use this narrative regime map:

| Regime | Meaning |
|---|---|
| `THEME_OR_ROTATION` | Macro, sector, commodity, or factor rotation |
| `TURNAROUND` | Recovery from weak base, margin repair, debt reduction, utilization recovery |
| `CORPORATE_ACTION` | M&A, spin-off, rights issue, asset injection, backdoor process |
| `POLICY_OR_INDEX_FLOW` | Regulation, incentives, tariff changes, MSCI/LQ45 inclusion |
| `RERATING_OR_YIELD` | Discount closure, holdco rerating, dividend/special payout demand |
| `SPECULATIVE_HYPE` | Attention-driven story with weak fundamental anchor |

Map catalysts as dossiers, not headlines:

- What exactly is the event?
- When is it expected?
- How do you verify it?
- What does success look like?
- How likely is it?
- How big is the impact if it lands?

Judge four separate dimensions:

- Stage: `EARLY`, `BUILDING`, `LATE`, `EXHAUSTED`
- Strength: 0-15 from freshness, market awareness, fundamental support, catalyst proximity, flow alignment
- Durability: `LOW`, `MEDIUM`, `HIGH`
- Crowding / priced-in risk: `LOW`, `MEDIUM`, `HIGH`, plus whether upside remains if the catalyst lands exactly as expected

Narrative verdict guide:

| Score | Verdict | Meaning |
|---|---|---|
| 12-15 | `STRONG` | Fresh, supported, catalyst-active |
| 8-11 | `MODERATE` | Real story but partly priced or catalyst delayed |
| 4-7 | `WEAK` | Stale or weakly supported |
| 0-3 | `BROKEN` | No credible narrative edge |

Kill discipline:

- Define the primary failure trigger upfront.
- Actively look for disconfirming filings, weak execution signals, or overcrowding before getting attached.
- If deal terms worsen, policy is delayed, expected recovery fails, or social attention fades without business follow-through, downgrade fast.
- Do not use social momentum to override a broken story.

## 6. Fundamental Playbook

Fundamental analysis answers whether the business is worth owning and whether valuation is supported by real economics. It does not solve timing by itself.

Review order:

1. Business model and segment mix
2. Revenue quality and growth drivers
3. Profitability and one-off distortion
4. Capital efficiency: ROE, ROA, ROCE, turnover
5. Balance sheet: liquidity, leverage, refinancing risk
6. Cash flow: OCF, FCF, CFO vs PAT
7. Ownership/governance and minority alignment
8. Industry structure and moat
9. Valuation
10. Red flags and thesis posture

Business quality checklist:

- Can you clearly explain what the company sells, to whom, and what drives margin?
- Is the business still structurally relevant?
- Does it have moat from brand, license, switching costs, network effects, or barriers to entry?
- Is market share stable/rising, ROE/FCF durable, and pricing power real?
- Is the industry in growth, maturity, or structural decline?

Financial quality checklist:

- Is growth recurring or driven by one-offs/acquisitions/channel stuffing?
- Does cash conversion support reported profit?
- Are receivables, inventory, DSO/DIO, prepayments, or related-party balances ballooning without clean logic?
- Is ROE high because of genuine economics or just leverage?
- Is dividend yield sustainable or a trap?
- Is Altman Z-score in a safe zone, caution zone, or distress zone?

Ownership/governance checklist:

- Who actually controls the company?
- Is the ultimate owner aligned with minorities or extractive?
- What is reported free float versus effective float?
- Are there sticky institutions, foreign holders, or a dangerous overhang block?
- Are nominee/custody names being misread as active owners?
- Is there dilution, pledge, related-party, or repeated fundraising risk?

Valuation discipline:

- Start from the business model. Do not force P/E on businesses where current earnings do not represent normalized economics.
- Use a primary method plus one or two sanity checks when possible.
- For asset-heavy or segment-mixed names, use NAV/PBV/SOTP where appropriate.
- For early-growth or high-uncertainty names, scenario valuation is usually more honest than one fake-precise number.
- If valuation methods diverge widely, explain why instead of averaging blindly.

Value-trap warning signs:

- Cheap P/E caused by one-off gains.
- Low PBV with structurally weak ROE.
- High dividend yield with unsustainable payout.
- Profit without cash.
- Structural industry decline hidden under “cheapness”.

## 7. Scenario Building

Use scenarios when one linear thesis is too narrow and future outcomes can branch in materially different ways.

Use them for turnaround paths, corporate actions, commodity-cycle exposure, policy uncertainty, dilution/funding paths, pre-profit operating ramps, or chart structures with two very different next legs.

Do not force every stock into fixed `bull/base/bear` labels. Name the branches based on the real mechanism.

Good scenario format:

| Field | Meaning |
|---|---|
| Scenario | Short branch name tied to the actual path |
| Trigger / evidence | What would confirm that this branch is playing out |
| Implication | What you would do: add, hold, trim, exit, promote to watchlist, or downgrade |
| Likelihood | Optional rough estimate, only if it improves decision quality |

Practical rules:

- Keep only 2-4 active branches for one symbol or thesis.
- Make branches mutually useful, not just rhetorical variations.
- Do not force probabilities to sum to 100% if that creates fake precision.
- Review old scenarios first before inventing new ones.
- On each review, ask: which branch is gaining evidence, which branch is weakening, which branch should be retired, and whether a new branch has emerged.

Example:

| Scenario | Trigger / evidence | Implication |
|---|---|---|
| Margin recovery resumes | Next results show margin rebound and cash conversion improves | Hold/add if chart and flow confirm |
| Recovery delayed but thesis alive | Revenue okay but margin still compressed, no balance-sheet stress | Hold smaller, avoid aggressive add, extend monitoring |
| Dilution/funding stress | Working capital worsens, new funding need appears, or rights issue terms are poor | Trim/exit and downgrade thesis |

## 8. Synthesis

The hardest part is not reading one lens. It is deciding what to do when lenses disagree.

Each lens produces a conviction score (0-100). Parent synthesis computes a weighted composite:

```
composite = 0.25 × technical + 0.15 × flow + 0.25 × narrative + 0.20 × fundamental + 0.15 × portfolio_fit
```

The composite maps to a sized action:

| Composite score | Action tier | Base size band |
|---|---|---|
| 0-25 | `NO_TRADE` | 0% |
| 26-40 | `WATCHLIST` | 0% |
| 41-55 | `PILOT` | 0.25-0.5% |
| 56-70 | `STARTER` | 0.5-1.5% |
| 71-85 | `STANDARD` | 1.5-3.0% |
| 86-100 | `HIGH_CONVICTION` | 3.0-5.0% |

Final sizing applies the portfolio cap and aggression multiplier:

```
final_size = min(base_size, max_new_position_size_pct) × regime_aggression
```

Binary overrides are limited to hard safety rails only:

- Thesis invalidated from any lens → EXIT
- Portfolio heat above 8% → block all new longs
- Single position above 30% → block adds
- Position above 5% ADTV → cap size
- 4 active pilots already live → block new PILOT

Everything else should change the score or size, not act as a veto. The system has two mandates with equal weight: protect capital and deploy capital.

How to weigh conflicts:

- When lenses disagree, state the score spread, explain which lens deserves more weight for this symbol in this context, and document the reasoning.
- If fundamentals are strong but flow and chart are under distribution, patience may be warranted for long-term holding, but fresh adds usually need better structure/sponsorship.
- If narrative is hot but already late/crowded and price is extended, respect the story but avoid chasing poor location.
- If TA is triggering but thesis quality is weak and evidence is rumor-heavy, keep size small or pass.
- If flow is warning while TA still looks fine, reduce conviction and tighten monitoring.
- If a long-term thesis remains intact but portfolio heat is high or IHSG regime/cash pressure is weak, portfolio risk can still force smaller size or delayed adds.
- Do not collapse mixed evidence by defaulting to the weakest lens.

Decision outputs should be explicit:

- What is the composite score and action tier?
- Which scenario is dominant now?
- What action is justified today and at what size?
- What level/event changes the decision?
- What should be reviewed next and when?

## 9. Portfolio & Risk

Portfolio management is a risk operating system, not just idea collection.

Trade classification:

| Classification | Use when |
|---|---|
| `THESIS` | Durable multi-driver view with higher-tier evidence and longer holding tolerance |
| `TACTICAL` | Setup-driven or catalyst-window trade with shorter holding intent |
| `SPECULATION` | Low-evidence, rumor-led, or optionality-heavy trade |

Holding mode:

| Holding mode | Behavior |
|---|---|
| `TACTICAL` | Smaller size, faster trim discipline, stronger need for easy exits |
| `HYBRID` | Middle ground between setup sensitivity and thesis patience |
| `THESIS` | More patience allowed, but still inside liquidity, concentration, and heat limits |

Sizing and risk rules:

- Default risk per trade is around 1% of portfolio equity, scaled down when conviction, liquidity, or stop quality is weak.
- Total portfolio heat should stay around 5-6% max open risk.
- Do not let one position exceed 30% weight.
- Keep speculative allocation <=10%.
- Keep at least 50% of the book in names with real margin of safety when that is your active style constraint.
- Limit sector crowding and also check hidden theme/factor clustering.
- If correlation with an existing large holding is >0.75, reduce size or skip.
- If intended position size is >5% of ADTV, assume exit/liquidity risk is too high and reduce size or avoid.
- Use stock beta versus IHSG as a market-risk overlay: high-beta stocks (>1.3) get steeper sizing discounts in weak regimes, defensive-beta stocks (<0.7) can use more of the available budget.
- Track portfolio-weighted beta across holdings. High portfolio beta in a deteriorating regime is a risk flag.

IHSG cash overlay and aggression curve:

The market regime produces a continuous aggression multiplier (0.25-1.5) based on IHSG structure and breadth:

| IHSG state | Base | Improving breadth | Deteriorating breadth |
|---|---|---|---|
| Above all key MAs, healthy | 1.2 | 1.5 | 1.0 |
| Above SMA50, below EMA21 | 0.8 | 1.0 | 0.7 |
| Below SMA50, above SMA200 | 0.5 | 0.7 | 0.4 |
| Below SMA200 | 0.3 | 0.4 | 0.25 |
| Below SMA200 + red flags | 0.25 | 0.3 | 0.25 |

Cash targets by IHSG state:

| IHSG state | Base minimum cash |
|---|---|
| Below EMA21 | 30% |
| Below SMA50 | 50% |
| Below SMA200 | 70% |

If broader red flags are also present, escalate those targets by +10pp to 40% / 60% / 80%. These are soft budget targets that compress `regime_aggression`. Reserve `max_new_position_size_pct` for concentration, correlation, liquidity, and theme constraints.

Add/trim/exit discipline:

- Add only if prior tranche is working and thesis/structure remain valid, or if the plan explicitly allows staged entry near favorable location with unchanged invalidation.
- Do not average down below broken structure just because price is cheaper.
- Trim progressively when evidence weakens, even before full invalidation, if the scenario or plan has shifted.
- Early exit is justified when better opportunity needs cash, market regime worsens, liquidity risk rises, or portfolio constraints are breached.
- If thesis breaks, replace the name. Do not mechanically top up losers.

## 10. Review & Postmortem

Review is where stale bias gets killed and process gets upgraded.

Daily quick check:

- Check stops and invalidations.
- Check whether any progress checkpoint date has passed.
- Scan new filings/news for held names.
- Check flow changes on key positions.
- Check P&L, exposure, cash ratio, and portfolio heat.

Weekly review:

- Review all open positions: thesis intact, improving, degrading, or invalidated?
- Compare portfolio versus IHSG and relevant sector leaders.
- Check sizing, concentration, correlation, and liquidity compliance.
- Recheck active scenarios: which branch is playing out?
- Refresh watchlist triggers and remove stale names.
- Flag tactical trades that need more monitoring than you can realistically provide.

Monthly/deep review:

- Review realized and unrealized contribution.
- Review equity curve and decision process as a system.
- Check style drift, overtrading, revenge re-entry, cluttered watchlist, stale plans, and hidden clustering.
- Reassess thesis hygiene and whether old scenarios need retirement.
- Convert repeated mistakes into explicit operating rules.

Plan staleness thresholds:

| Timeframe | Stale after |
|---|---|
| `SWING` | 7 calendar days |
| `POSITION` | 30 calendar days |
| `LONG_TERM` | 90 calendar days |

Postmortem rule:

- Judge process and outcome separately.
- A profitable trade with weak underwriting is still a process problem.
- A losing trade with clean invalidation and sound evidence can still be a good process.
- After a major loss, re-entry is a new trade and needs thesis, sponsorship, and structure to reset.

## 11. Quick Checklists

### Before Buy

- Can I explain the thesis in 1-2 sentences?
- Is evidence quality strong enough for the intended size?
- What scenario am I underwriting, and what would switch it?
- Is location good and trigger confirmed, or am I chasing mid-range noise?
- Where is invalidation and is RR acceptable?
- Does flow confirm, lead, or warn?
- Is the narrative still early enough, or already crowded/priced in?
- Is valuation sane and is this not a value trap?
- Does this fit portfolio heat, concentration, correlation, and liquidity limits?

### While Holding

- Is thesis status intact, improving, degrading, or invalidated?
- Which scenario is playing out now?
- Are checkpoint expectations still on track?
- Has structure broken, sponsor flow weakened, or narrative aged?
- Is position size still appropriate given liquidity and portfolio heat?
- Should I trim before full invalidation because evidence quality is weakening?

### Before Adding

- Is the prior tranche green or is this just emotional averaging down?
- Has evidence improved, not just price become cheaper?
- Is structure still valid and is invalidation unchanged or tighter?
- Does the active scenario justify more exposure?
- Does the add breach heat, concentration, correlation, or ADTV constraints, and is any IHSG cash-target shortfall reflected in `regime_aggression`?

### Before Trimming Or Exiting

- Is this a hard invalidation, a scenario downgrade, a portfolio-risk override, or just noise?
- Has the target/path already been mostly realized?
- Is narrative now late/crowded or deal/policy/catalyst quality deteriorating?
- Is flow turning into distribution or a warning?
- Is there a better use of capital elsewhere?
- If exiting, what lesson should be recorded?

### During Drawdown

- Is the drawdown inside the planned scenario or outside it?
- Did structural invalidation hit?
- Has the fundamental or narrative thesis actually weakened, or is this sponsor/liquidity pressure only?
- Is this a valid hold, a smaller-size hold, or an exit?
- Do not average down into broken structure or broken evidence.

### Before Passing Or Skipping

- Is the thesis too dependent on rumor?
- Is evidence too weak, ownership/governance too dirty, or financial quality too questionable?
- Is the story already priced in and crowded?
- Is location poor, invalidation unclear, or RR weak?
- Is liquidity too thin or correlation/theme exposure too redundant?
- If skipping, what condition would make the idea worth revisiting?

### When Thesis Or Scenario Weakens

- Which specific assumption failed?
- Which scenario branch gained probability and what is the new operating implication?
- Is this a trim, a full exit, a watchlist downgrade, or just tighter monitoring?
- What evidence would repair the thesis enough to re-enter later?

## 12. Key Terms

| Term | Meaning |
|---|---|
| Bandar / sponsor | Large informed or influential player whose accumulation/distribution can shape price behavior |
| Goreng | Aggressive price pumping/frying behavior, often with low-quality fundamentals and narrative-driven chase |
| Pompom | Promotional hype or coordinated attention pushing a stock story |
| Cuci piring | Late-stage distribution / exit-liquidity phase after retail crowding |
| Haluasi premium | Extra price paid for an imagined future story beyond current base-value support |
| Accumulation | Repeated buying/sponsorship that absorbs supply and supports markup |
| Distribution | Repeated selling/supply pressure that weakens the setup despite surface optimism |
| Invalidation | The level, event, or evidence condition that proves the thesis or setup wrong |
| Scenario switch trigger | The concrete evidence or level that moves the operating view from one scenario branch to another |
| Portfolio heat | Sum of open risk across positions, used to prevent too many simultaneous high-risk bets |
| Holding mode | Operating posture for a position: `TACTICAL`, `HYBRID`, or `THESIS` |
| Composite score | Weighted average of lens conviction scores (0-100) that maps to a sized action tier |
| Aggression multiplier | Continuous 0.25-1.5 multiplier from IHSG structure and breadth that scales position sizing |
| Beta | Stock's sensitivity to IHSG moves; defensive (<0.7), moderate (0.7-1.3), aggressive (>1.3) |
| Gini asymmetry | Buy-side Gini minus sell-side Gini; positive = institutional accumulation pattern, negative = institutional distribution |
| Net accumulation price | VWAP of net-positive flow days; smart money's average cost basis for the visible accumulation |
| Participant flow | Flow breakdown by broker type: foreign, government/BUMN, local private |
