# Skill Edge Validation for an IDX Technical-Analysis LLM System

## Executive summary

Your architecture—deterministic feature/structure extraction feeding a constrained “policy” LLM—matches a broad best-practice pattern in modern applied AI: let code do computation and let a language model do interpretation, decision structuring, and explanation. This approach is defensible as an engineering choice because it improves auditability and reduces “free-form model hallucination” risk compared to pure-LLM chart reading, but it does **not** automatically create a market edge. Tool-augmented / program-aided LLM research consistently finds that offloading formal steps to external tools improves correctness on tasks that models are intrinsically bad at (exact computation, strict rules), which supports your split in principle. citeturn15search0turn15search2turn15search12turn15search1

The biggest *real* edges here are likely to be: (i) reproducibility and post-trade auditability (you can trace every decision to deterministic signals + doctrine), (ii) discipline from explicit invalidation and RR gating (a known antidote to behavioral errors), and (iii) a “WAIT-by-default” posture that reduces overtrading and narrative overfitting. Behavioral finance research (including Indonesia-focused work) supports that trading decisions are materially affected by biases like confirmation bias and optimism—exactly the kind of thing rigid gating and checklists can reduce. citeturn11search3turn2search3turn2search0turn2search1

The biggest *delusions / active harms* are likely to be: (i) treating ICT/SMC labels (liquidity sweeps, BOS/CHOCH narratives) as if they reliably identify “smart money” rather than often being post-hoc descriptions of price moves, (ii) trusting LLM vision to “confirm” chart structure when the model’s chart-reading accuracy is not consistently human-level even on *simpler* chart tasks than trading charts, and (iii) under-weighting IDX frictions—price fractions, auto-rejection (daily price limits), and intraday auctions—because these microstructure rules can dominate how breakouts, stops, and “sweeps” actually behave. citeturn12view1turn14view0turn20view0turn20view1turn24view0

A critical point: a system like this can look extremely “professional” while still being statistically hollow. Financial research has decades of evidence that (a) many technical patterns can appear significant in-sample, and (b) the combination of many rules + parameter choices tends to inflate apparent performance unless you deliberately correct for multiple testing / backtest overfitting. Your doctrine’s breadth (Wyckoff + VPVR + SMC + MA + multi-timeframe structure) increases that risk unless you design evaluation to penalize degrees of freedom. citeturn2search3turn2search0turn2search1turn38search9turn38search3

## Architecture edge

### How your split compares to best practice

What you’re doing conceptually resembles **tool-augmented / program-aided LLM** design: the model is not asked to “be a calculator,” it’s asked to reason over structured outputs from calculators. This has strong support in the LLM systems literature:

- **Toolformer** shows that models can improve by learning *when* to call tools and incorporate tool outputs, precisely because base LMs often fail at “mechanical correctness.” citeturn15search0turn15search3  
- **PAL (Program-aided Language Models)** and **Program-of-Thoughts** show that separating reasoning from computation improves accuracy because you reduce the model’s incentive/opportunity to fabricate intermediate steps. citeturn15search2turn15search12turn15search5  
- **ReAct** motivates an interleaving of reasoning and action/tool use to reduce hallucination and increase controllability in multi-step tasks. citeturn15search1turn15search4  

In other words: your deterministic preprocessing is not just “engineering taste”—it is aligned with a known, evidence-backed pattern for improving correctness and auditability.

### Where this is genuinely advantageous versus other approaches

**Versus pure LLM chart analysis:**  
Pure multimodal “look at the candlestick and decide” approaches are vulnerable to: (i) visual misread errors, (ii) implicit/unstated assumptions, and (iii) hallucinated indicators/levels. Hallucination is widely recognized as an inherent failure mode of LMs, and can show up as overly confident but wrong rationales. citeturn1search10turn42view0 Your deterministic layer reduces the surface area for that type of error by turning raw data into explicit claims the model must reference.

**Versus pure quant/rules engines:**  
Quant systems excel at consistency and testability, but “discretionary-style TA” often contains tacit logic that is hard to fully encode. Your architecture’s promise is that the LLM can act as a flexible policy layer *without* being allowed to invent raw facts. This resembles what recent trading-agent surveys call “LLM as a Trader” (direct BUY/HOLD/SELL decisions) but with a stronger governance story than many academic prototypes, because inputs are constrained and precomputed. citeturn42view0

**Versus typical hybrid research systems:**  
In LLM trading-agent research, a recurring weakness is evaluation methodology: short backtests, unclear cost modeling, and limited discussion of integration into real execution constraints. A 2026 survey notes that few papers account properly for trading costs and many use short evaluation windows, which undermines credibility. citeturn42view0turn2search0turn2search1 Your approach can be better than “research toy agents” *if* you realize its main value is governance + disciplined process, then evaluate it with cost-aware, overfitting-aware methods.

### Where the architecture can still be delusional

Even with deterministic preprocessing, the LLM layer can still:

- **Narrativize noise**: produce coherent explanations for random walks, especially if the doctrine contains many “interpretation hooks.” This is the core danger of a broad discretionary doctrine. citeturn38search9turn2search3  
- **Overfit by selection**: if you review many names and only act on the “best looking,” you are effectively doing multiple hypothesis testing. Without correction, you will systematically overestimate edge. citeturn2search3turn2search0turn2search1  

This is why serious strategy research emphasizes reality-check style testing and explicit multiple-testing controls. citeturn2search3turn2search0turn2search1

## LLM chart reading evidence

### What the chart-understanding literature actually supports

There is real peer-reviewed work on vision-language models reading charts, but it is mostly about *data visualizations* (line charts, bar charts, scatter plots)—not noisy candlestick charts with overlays.

- A human-centered benchmark study (CHART-6) finds **humans consistently outperform GPT-4V** on most graph types and task categories (value identification, arithmetic computation, and statistical inference), with only a few exceptions. citeturn12view1turn13search4  
- Structured prompting can improve performance: a Microsoft study introduces “visual chain-of-thought” prompting and reports gains on chart benchmarks like ChartQA, implying that raw “just look and answer” is weaker and that careful decomposition is required. citeturn12view2  
- ChartBench (a large benchmark) was motivated by the claim that off-the-shelf multimodal LLM chart comprehension remains limited and that evaluation should test both comprehension and reliability. citeturn13search0turn13search17  

### What we know about candlestick-chart vision specifically

Candlestick charts are harder than typical “data viz QA,” because they combine time series, dense glyphs, gaps, annotations, and often multiple subpanels and overlays.

A 2025 study comparing vision-instruct LLMs against vision models and numeric models explicitly notes that applying LLMs to **candlestick chart images** is challenging; it proposes post-hoc calibration to reduce prediction bias and treats raw LLM visual predictions as unreliable without adjustment. citeturn14view0

Separately, an LLM-agent survey notes that most multimodal models have **not been specifically trained/evaluated on financial visual data such as K-line (candlestick) charts**, and refers to early experiments as “promising” but not mature. citeturn42view0

### Is chart reading adding signal or mostly confirmation theater?

Based on the evidence above, **the highest-probability interpretation** is:

- Your chart-reading step is unlikely to add *new predictive signal* beyond what your deterministic `ta_context` already encodes, unless the chart images contain information that the JSON does not (e.g., unusual gaps, corporate-action distortions, obvious data holes, or annotation errors). citeturn12view1turn14view0  
- It can still add value as a **sanity check / anomaly detector**—but only if you treat disagreements as a reason to *downgrade confidence* (often to WAIT), not as a reason to “argue” the chart into alignment. This aligns with how your doctrine frames charting as default visual context rather than automatic decision weight (per your provided skill).  
- If you use vision mainly for “visual confirmation,” you risk the trap that the academic literature warns about implicitly: models can be confidently wrong on chart reading tasks, and humans tend to overweight plausible explanations. citeturn12view1turn1search10turn38search9  

In short: treat vision as **error-checking and communication**, not as an alpha source, unless you can demonstrate via ablations that “with vision” improves outcomes.

## Doctrine coherence

### What parts are coherent with known microstructure mechanisms

There *is* academically grounded support for some ingredients of your doctrine, but often in narrower or differently framed forms than retail “SMC” narratives suggest.

**Support/resistance and liquidity pockets:**  
A key microstructure idea is that “levels” can correspond to **liquidity provision** and order clustering, not mystical geometry.

- Kavajecz & Odders-White argue that support/resistance levels coincide with peaks in limit-order-book depth, interpreting technical analysis as revealing information about liquidity provision (their abstract states this directly). citeturn32view0turn33view0  
- Research on stop-loss order clustering and “price cascades” in FX markets shows that stop-loss orders can create rapid, self-reinforcing moves when triggered in waves, and notes practitioner lore about “running the stops.” citeturn30view0  

These are not proofs that “liquidity sweep = smart money manipulation,” but they do support a weaker claim: **clusters of conditional orders and liquidity can cause acceleration, slippage, and fast moves around salient levels**.

**Volume-at-price / volume profile:**  
Market profile / volume-at-price techniques have a long practitioner history (often attributed to Peter Steidlmayer), and the CMT community documents volume-at-price as a distinct way to represent volume distribution across prices. citeturn11search0  
That supports VPVR as a plausible *contextual* tool (where did trade occur, where did acceptance happen), but it does not itself prove predictive edge.

**Trend-following components (MAs, structure):**  
There is evidence that simple trend-following rules can work in some contexts and in some emerging markets, but results are conditional and period-dependent:

- A study using Indonesian composite index data (1998–2016) finds that MA trading rules can be applied and that performance depends on MA length and trend regime, with some years negative. citeturn27view0  
- A foundational U.S. stock study proposes systematic pattern recognition and finds some patterns associated with return differences, but this is not the same thing as guaranteeing tradable profit after frictions. citeturn38search3  
- A major review emphasizes that modern TA evaluation must account for transaction costs, out-of-sample validation, and data-snooping controls, because early findings often fail under stricter testing. citeturn38search9turn2search3  

### Where the doctrine becomes internally conflict-prone

Your doctrine combines:

- “Structure” (BOS/CHOCH, swing points),
- “liquidity events” (sweeps, reclaim),
- “Wyckoff phase narratives,”
- “value/acceptance” (VPVR),
- and MA state.

This can be coherent if you treat them as **different lenses on the same underlying primitives**: trend, range, liquidity, and participation. But it becomes conflict-prone when each lens is treated as an independent “signal generator.”

Two well-known failure paths appear in systems like this:

**Rule explosion → narrative overfitting:**  
The more rule families you have, the more ways you can explain any outcome. This is the same statistical problem as multiple testing: somewhere, a rule will “fit,” especially in hindsight. Reality-check style methods exist specifically because selecting the best rule from many creates false discoveries. citeturn2search3turn2search0

**Confirmation bias amplification:**  
When a framework encourages “find the story” (e.g., “composite operator is accumulating”), it can amplify biases. An Indonesia-focused behavioral study finds confirmation bias and related biases have statistically significant effects on trading decisions in social trading contexts. citeturn11search3

### A practical coherence test used in professional settings

A useful “prop-style” sanity rule (regardless of whether a desk calls it Wyckoff or not) is: **one thesis, one trigger, one invalidation**—everything else is context.

Your doctrine already moves in this direction (single setup family, bounded action, explicit invalidation). The coherence question is whether Wyckoff / VPVR / SMC elements are:

- **Primary** (any one of them can override the rest), which tends to create incoherence, or
- **Contextual** (they adjust confidence and trade management), which is closer to professional practice.

The more you force all lenses to agree, the more you risk “analysis paralysis.” The more you allow any lens to override, the more you risk “story shopping.”

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["Wyckoff accumulation schematic phases A B C D E diagram","volume profile VPVR POC VAH VAL example chart","candlestick chart liquidity sweep reclaim example","support resistance order clustering round numbers illustration"],"num_per_query":1}

## IDX microstructure relevance

### Why market structure differs enough to matter

Your topic is IDX equities, which trade under rules and liquidity conditions that meaningfully affect the behavior of the exact setups you care about (breakouts, sweeps, stops, follow-through).

**Intraday auctions and session structure:**  
IDX trading includes a pre-opening and pre-closing mechanism where the system forms opening/closing prices via matching logic rather than continuous trading, and there is an intraday break. A law-firm summary of amended rules describes pre-opening, two sessions, and pre-closing timing in Jakarta time, including opening/closing price determination by the exchange system. citeturn20view0 A broker’s market-info page lists similar sequencing (pre-opening, session 1, break, session 2, pre-closing, post-closing). citeturn0search31  
This matters because “breakout confirmation” and “15m trigger candles” can be structurally distorted around auctions and breaks.

**Price fractions and tick constraints:**  
Orders must respect price fractions that vary by price level; this shapes how “clean” levels look and how stops/entries execute. citeturn20view1turn7view1

**Auto-rejection (daily price limits) and trading halts:**  
Auto rejection caps intraday price moves and can reject orders outside limits; tables for limits by price bucket (e.g., 35% / 25% / 20%) are documented in both a law-firm summary and a brokerage explanation. citeturn20view0turn20view1  
Rules have also been adjusted in recent years; reporting on April 2025 changes notes a lower-limit auto rejection adjustment to 15% and updated trading halt thresholds. citeturn24view0

These mechanics can **invalidate naive Western “liquidity sweep” interpretations**: in a price-limited market, apparent “runs” may be mechanical cascades into limits rather than discretionary stop hunts, and invalidation can fail simply because price cannot trade through the level you assumed.

### Liquidity and retail dominance: implications for TA frameworks

**Retail participation:**  
Reporting quoting the financial regulator indicates retail transactions reached ~50% in 2025, overtaking institutions, with concerns about manipulation and the need for stronger protection. citeturn22view1 Retail participation at that scale tends to increase herding and “crowded level” behaviors, but also increases noise and the prevalence of pump/dump microstructure in smaller names.

**Rapid growth in investor base:**  
KSEI-referenced reporting indicates Indonesia’s capital market investor count exceeded 20 million by late 2025. citeturn22view0 This supports the idea that crowding behavior around obvious levels could be strong, but it also means the “smart money vs retail” dichotomy becomes less clean: flows can be fragmented and sentiment-driven.

**Foreign vs local positioning:**  
KSEI’s published “Total Asset Listed in C-BEST” table shows local and foreign asset values moving over time (example months from late 2024 through early 2026). citeturn22view3 This matters because many Western TA heuristics implicitly assume deep institutional liquidity; in IDX, liquidity depth and foreign participation can be regime-like variables.

### Tick size and liquidity quality are first-order constraints

Academic microstructure work on Indonesia shows that tick size changes affect spreads, depth, and order strategy:

- Tick size reduction evidence (Jakarta Stock Exchange era) finds reduced relative bid-ask spread but also reduced depth; traders shift strategy (e.g., splitting orders). citeturn23view0  
- Another study on tick size changes in IDX finds liquidity effects on depth but not necessarily on relative spread, emphasizing liquidity’s multidimensional nature. citeturn23view1  

This is directly relevant to your approach because setups like breakout-retest or “wick sweep + reclaim” are extremely sensitive to **spread, depth, and fill quality**—especially in thinner names.

### Translation verdict for your frameworks

- **Wyckoff / volume profile** can translate reasonably as *contextual narratives* (accumulation/distribution as a way to describe range-to-trend transitions; value acceptance/rejection framing), but you should be cautious about claiming phase detection is reliable without market-specific calibration. General descriptions of Wyckoff’s accumulation/markup/distribution/markdown cycle exist widely, but those are conceptual, not empirically guaranteed. citeturn11search9turn11search2  
- **ICT/SMC “smart money” framing** is the most at risk of becoming delusional on IDX because microstructure constraints (auto rejection, auctions, tick sizes) can create “sweep-like” prints without any adversarial intent, and because the causal story (“institutions hunted stops”) is rarely verifiable from public OHLCV alone. The closest academically grounded version of this idea is not “smart money,” but “order clustering and conditional orders can accelerate moves around salient levels.” citeturn30view0turn32view0turn23view0  

## Bounded decision output

### Why forcing BUY/HOLD/WAIT/EXIT can be a real edge

Many documented cognitive biases push traders toward action, overconfidence, and story-driven trades. Evidence in Indonesian contexts links biases such as confirmation bias to trading decisions. citeturn11search3

A bounded action space, explicit invalidation, and RR gating can therefore create a “process edge” even if the signal edge is modest: you reduce impulsive trades, enforce asymmetric risk, and make postmortems meaningful because decisions are comparable over time.

Also, this “discrete action” framing mirrors a lot of LLM trading-agent research, where agents commonly output Buy/Hold/Sell signals. The key difference is that your doctrine aims to constrain and justify them, while the research survey notes many systems neglect costs and have short evaluation windows. citeturn42view0turn2search0turn2search1

### Where it becomes a limitation

Markets are continuous; decisions are discrete. Your action space can hide the most important variable: **position sizing**. In professional risk practice, “should I trade?” and “how big?” are separate questions.

A common failure mode in BUY/HOLD/WAIT/EXIT systems is **false precision**: BUY may imply equal confidence across contexts. If your doctrine already has “timing authority” and participation quality states, you are halfway to expressing uncertainty; without a sizing dimension, you risk compressing nuance into narrative.

A compromise that preserves your constraint discipline is to keep the action space but add a deterministic mapping from “quality score” to sizing bands (e.g., 0x, 0.5x, 1x), while keeping WAIT as the default under contradiction—matching your own governance principle.

## Known failure modes

These are predictable ways your system can be consistently wrong given the architecture and the market:

**Regime changes and nonstationarity:**  
TA patterns can change or disappear once they become crowded or once the underlying volatility/liquidity regime shifts. The literature on technical trading stresses the importance of out-of-sample verification and the fragility of in-sample profitability under stricter testing. citeturn38search9turn2search3

**“Best-looking chart” selection bias:**  
Scanning many stocks and picking the one that matches a setup family is multiple testing in disguise; it inflates apparent edge. This is exactly what reality-check methods and backtest-overfitting work were designed to address. citeturn2search3turn2search0turn2search1

**LLM visual confirmation errors:**  
Even strong vision-language models underperform humans on many chart tasks; candlestick-specific LLM vision is explicitly described as challenging and bias-prone without calibration. If chart vision is a veto/confirm step, it may veto correctly computed setups due to misread, or confirm incorrectly. citeturn12view1turn14view0turn42view0

**Auto-rejection and gap-like behavior:**  
Auto rejection (price limits) can create “one-way” moves and prevent orderly invalidation. Stops may not fill where expected, and breakout follow-through logic can be mechanically capped. citeturn20view1turn24view0turn20view0

**Auction-session distortions:**  
Pre-opening / pre-closing matching can produce prints that look like breakouts or sweeps but are simply auction clearing. Signals built on continuous-trading assumptions can misclassify these events. citeturn20view0turn20view3turn0search31

**Low-liquidity names (spread/impact dominates):**  
Microstructure work on tick size and liquidity in Indonesia shows spreads, depth, and order strategies shift with tick/price structure; in thin names, transaction costs and impact can overwhelm a technical “RR on paper.” citeturn23view0turn23view1turn20view1

**News and corporate actions:**  
OHLCV-only logic cannot reliably anticipate suspensions, sudden disclosures, or corporate actions that reshape price paths. Even in financial-ML contexts, studies emphasize the gap between statistical predictability and economic viability once frictions and real-world conditions are included. citeturn17view0

## Comparison to alternatives

### Pure discretionary price action

Discretionary traders often do exactly what your doctrine enforces: top-down thesis, single trigger, clear invalidation, and risk control. The difference is that discretionary processes are vulnerable to inconsistency and bias—documented as meaningful drivers of trading decisions. citeturn11search3

Your system’s value versus pure discretion is therefore less “better TA” and more **better process control**: reproducible structure labeling + forced decision discipline.

### Systematic quant strategies on IDX

Evidence suggests there may be some exploitable structure in Indonesian markets (e.g., trend effects), but results vary by method and can be fragile:

- Moving average trading rules on the Indonesian composite index show periods of usefulness and sensitivity to parameter choice and trend regime. citeturn27view0  
- Yet machine-learning return prediction for LQ45 constituents (2016–2025) reports near-zero/negative R², roughly coin-flip directional accuracy, and underperformance versus buy-and-hold after transaction costs—highlighting how hard it is to turn weak signals into profit once costs are included. citeturn17view0  

So, compared to “serious quant,” your approach is not obviously inferior—but it must be evaluated with the same seriousness: transactions costs, slippage, walk-forward testing, and multiple-testing correction. citeturn2search0turn2search1turn2search3

### Commercial TA platforms with “AI” features

Commercial products often automate *parts* of what your deterministic layer does:

- TrendSpider documents automated technical analysis features that automatically draw trendlines with mathematical rules. citeturn16search0turn16search7  
- Autochartist markets itself as algorithmic pattern recognition and key-level detection. citeturn16search1turn16search9  
- Trading Central positions itself as investment decision support with analytics/AI framing. citeturn16search4turn16search20  

Relative to these tools, your novelty is less “we found hidden patterns” and more: **(a)** you formalize doctrine into a constrained decision contract, and **(b)** you combine structured evidence + narrative explanation into a single policy output. If you removed the LLM and replaced it with a deterministic rules engine that emits BUY/HOLD/WAIT/EXIT + RR gates, you would still have much of the system’s real value; the LLM primarily adds flexibility and explainability.

### Other LLM-based trading research systems

Finance-specialized LLM work (e.g., BloombergGPT, FinGPT) has focused heavily on text tasks (news, reports, QA) rather than OHLCV-based swing trading. citeturn1search1turn1search0  
The LLM trading-agent literature surveyed in 2026 shows a fast-growing research trend but highlights issues that should make you skeptical of easy “LLM edge” claims: short backtesting windows, limited cost modeling, and insufficient discussion of deployment constraints. citeturn42view0turn2search0turn2search1

## What would count as “real edge” versus “dressed-up standard practice”

A credible claim of edge for your system needs to survive three filters:

**Cost reality filter:** performance must remain after realistic spreads, commissions, and fill assumptions—especially given tick/auto-rejection constraints. Research on Indonesia shows market structure changes affect liquidity and spreads; ignoring these will inflate backtests. citeturn23view0turn23view1turn20view1

**Overfitting filter:** you must treat rule selection + parameter tuning + “best setup selection across many names” as multiple testing, and correct for it. Backtest overfitting probability and deflated/probabilistic Sharpe frameworks exist specifically to prevent false confidence. citeturn2search0turn2search1turn2search3

**Ablation filter:** the system should show that components add value:

- deterministic-only (no vision) vs deterministic + vision  
- Wyckoff/VPVR on vs off  
- SMC/ICT constructs on vs off  
Given the literature showing VLM chart-reading gaps and candlestick-vision challenges, you should assume vision adds little until proven otherwise. citeturn12view1turn14view0turn13search0

If those filters are passed, the likely “true novelty” is not the TA concepts themselves (which have extensive prior art), but the **governed decision pipeline**: deterministic evidence generation + constrained policy reasoning + explicit invalidation + auditable logs. That is genuinely aligned with best practice in both modern LLM system design and serious trading research, and it is also where the approach is least delusional. citeturn15search0turn15search2turn15search12turn2search0turn2search3
