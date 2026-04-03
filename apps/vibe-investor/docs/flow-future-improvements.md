# Flow Future Improvements

## Purpose

This note captures the main follow-up gaps between the current `flow-analysis` implementation and the richer behavior described in `flow-plan/idx-flow.html`, the AlphaFlow product guide, and practical flow-analysis workflows observed in the IDX community.

The current implementation is complete enough for practical use:

- deterministic broker-flow fetch exists
- deterministic `flow_context` exists
- `flow-analysis` skill exists
- parent workflow integration exists

This document is for future upgrades, not for reopening the completed base implementation.

## Current Boundary

Current `flow-analysis` already covers:

- `CADI`
- selected-period `Buy vs VWAP`
- `GVPR`
- `MFI`
- `Frequency Profile`
- persistence
- concentration (HHI-based)
- trust regime (4 weight profiles)
- verdict (3 levels: `ACCUMULATION`, `NEUTRAL`, `DISTRIBUTION`)
- monitoring

Current Wyckoff detection already covers:

- full schematic events: `SC`, `BC`, `AR`, `Spring`, `UT`, `UTAD`, `SOS`, `SOW`, `ST`, `ToS`, `LPS`, `LPSY`
- cycle phases: `accumulation`, `markup`, `distribution`, `markdown`, `unclear`
- schematic phases: `A` through `E`
- segment history with events, maturity, confidence

Current limitations that matter:

- broker-flow fetch defaults to `60` sessions, which is fine for active read + trust read, but still thin for heavier statistical validation
- the system uses deterministic, transparent heuristics first
- the system does not attempt full product-parity black-box replication

## Future Improvements

### 1. Strong Verdict Tiers

Source-truth gap:

- AlphaFlow uses 5 verdict levels with explicit score ranges:
  - `STRONG ACCUMULATION`: score > 0.35
  - `ACCUMULATION`: 0.05 to 0.35
  - `NEUTRAL`: -0.05 to 0.05
  - `DISTRIBUTION`: -0.35 to -0.05
  - `STRONG DISTRIBUTION`: < -0.35

Current implementation:

- 3 verdict levels only: `ACCUMULATION` (score >= 0.06), `NEUTRAL`, `DISTRIBUTION` (score <= -0.06)

Why it matters:

- the strong tiers communicate conviction intensity
- "multiple bullish factors converging with high confidence" is a meaningfully different read from "net bullish bias"
- the parent workflow can use strong tiers to adjust sizing or urgency

Related observation:

- independent IDX flow analysis work (Campaign Risk Analyzer) uses a 6-regime lifecycle: Accumulation → Sponsored markup → Rotation/churn → Distribution → Unwind → Noise
- "Sponsored markup" (strong institutional push, safe to hold) vs "Rotation/churn" (participants rotating, unclear direction) vs "Unwind" (post-distribution collapse) are distinct states that the current 3-verdict system collapses together
- the strong verdict tiers partially address this: STRONG ACCUMULATION maps to sponsored markup, DISTRIBUTION maps to distribution/unwind
- consider whether "Rotation/churn" deserves its own label or maps cleanly to NEUTRAL

Recommended implementation direction:

- split existing verdict thresholds into 5 tiers
- adjust threshold values to match source-truth ranges or calibrate to local data
- update skill output contract and interpretation rules

### 2. Standalone `SMT` Score With Explicit Components

Source-truth gap:

- AlphaFlow presents `SMT` as a dedicated 0-100 composite
- the guide document describes five components: Net Flow (30%), Persistence (25%), Concentration (20%), Absorption (15%), Execution Quality (10%)
- the live product UI shows a different weighting: Net Flow (40%), Persistence (20%), Price Confirm (30%), plus Confidence and Wash Risk as separate meta-fields
- the product also shows a daily SMT time series chart and a 12-day SMT Momentum chart, not just a single score

Current implementation:

- the same behavioral ingredients exist but are spread across verdict inputs instead of emitted as a single `SMT` card
- persistence, concentration, execution quality, and CADI (net flow) are all computed
- absorption is partially captured via MFI but not as a dedicated component

Why it is now more implementable:

- the AlphaFlow guide provides explicit component weights and score ranges
- the current implementation already computes 4 of 5 components
- only absorption needs a dedicated computation

Note on component weights:

- the guide and the live UI show different weights, which suggests the product iterates on these
- recommended approach: start with the guide weights, expose them as configurable, and adjust based on backtesting

SMT score ranges:

- `68-100`: Strong Accumulation
- `54-67`: Accumulation
- `47-53`: Neutral
- `32-46`: Distribution
- `0-31`: Strong Distribution

Recommended implementation direction:

- add absorption detection: flag sessions where volume is elevated but price movement is small relative to ATR
- compute `smt_score` as weighted sum of normalized components
- compute daily SMT series (per-day score over the primary window)
- compute SMT momentum (slope of SMT series over trailing 12 sessions, classified as rising / falling / steady)
- emit:
  - `smt_score` (0-100)
  - `smt_components` with individual values and weights
  - `smt_signal` (Strong Accumulation / Accumulation / Neutral / Distribution / Strong Distribution)
  - `smt_confidence` (how many components agree with the direction)
  - `smt_momentum` (rising / falling / steady)
  - `smt_daily_series` (per-day scores for the primary window)
- keep it explicitly documented as a product-specific composite

### 3. Gini-Based Concentration Asymmetry

Source-truth gap:

- AlphaFlow uses the Gini coefficient to compare buy-side vs sell-side concentration
- explicit thresholds:
  - `> +0.12`: institutional accumulation (few big buyers, many small sellers)
  - `+0.02 to +0.12`: leaning accumulation
  - `-0.02 to +0.02`: neutral / balanced / retail-driven
  - `-0.12 to -0.02`: leaning distribution
  - `< -0.12`: institutional distribution (few big sellers, many small buyers)

Current implementation:

- uses HHI-based asymmetry comparing buy vs sell HHI and GVPR patterns
- classifies as `buy_heavy`, `sell_heavy`, `balanced`, `mixed`

Why it matters:

- Gini captures the shape of the distribution (inequality), not just concentration at the top
- HHI is dominated by the largest players; Gini captures the full curve
- the Gini asymmetry (buy Gini minus sell Gini) is a cleaner single metric for institutional split-order detection

Recommended implementation direction:

- compute Gini coefficient for buy-side and sell-side broker value distributions per day
- compute asymmetry as `buy_gini - sell_gini`
- average over the primary window
- emit:
  - `gini_buy`
  - `gini_sell`
  - `gini_asymmetry`
  - `gini_asymmetry_state` (using the threshold table above)
- keep HHI as a secondary metric; Gini becomes the primary concentration asymmetry signal

### 4. Multi-Type Divergence Detection

Source-truth gap:

- AlphaFlow detects three distinct divergence types:
  1. CADI Divergence: price vs CADI direction mismatch
  2. MFI Divergence: price vs MFI (buying pressure) direction mismatch
  3. Frequency + Gini Divergence: trading frequency rising with flat prices and high buy-side concentration, indicating hidden institutional split-order accumulation

Current implementation:

- single `divergence_state` comparing flow slope vs price slope over 10 sessions
- no MFI divergence
- no frequency + Gini divergence

Why it matters:

- each divergence type captures a different institutional behavior pattern
- frequency + Gini divergence is particularly valuable for detecting hidden accumulation that other metrics miss

Recommended implementation direction:

- split `divergence_state` into:
  - `cadi_divergence_state`
  - `mfi_divergence_state`
  - `freq_gini_divergence_state`
- compute MFI divergence by comparing MFI slope vs price slope
- compute frequency + Gini divergence by detecting rising frequency with flat price and elevated buy-side Gini
- emit a combined `divergence_summary` for backward compatibility

### 5. Rolling Trust Regime Series

Source-truth gap:

- AlphaFlow shows a time-varying regime series, not only one static trust badge

Current implementation:

- one static trust summary per run

Why it matters:

- a ticker can be broadly trustworthy over the full window but weak right now
- news-driven or speculative phases can temporarily break flow usefulness

Why it is a strong next candidate:

- this is easier than full `R²` / `Rank IC` parity
- it can be implemented with the current data shape
- it would make flow history more comparable to TA's phase-history style reasoning

Recommended implementation direction:

- compute a rolling local trust proxy over a shorter sliding window (e.g., 10 sessions)
- classify each window as:
  - `high`
  - `transitioning`
  - `low`
- expose:
  - the rolling series
  - the current state

### 6. High Volatility Regime

Source-truth gap:

- AlphaFlow has 5 regime classifications: Blue Chip, Mid Cap, Low Liquidity, High Volatility, Institutional-Driven
- High Volatility regime weights MFI more heavily to filter noise from genuine signals

Current implementation:

- 4 weight profiles: `institutional_driven`, `blue_chip_high_liquidity`, `low_liquidity_small_cap`, `mid_cap_moderate`
- no high-volatility regime

Why it matters:

- stocks with large daily price swings need different factor weighting
- MFI is more useful as a noise filter in volatile names
- without this regime, volatile mid-caps get the generic `mid_cap_moderate` profile

Recommended implementation direction:

- detect high volatility using ATR-based or return-based volatility over the trust window
- add `high_volatility` weight profile with elevated MFI weight
- insert volatility check before the existing regime cascade

### 7. Net Accumulation Price

Source-truth gap:

- practical IDX flow analysis uses "net accumulation price" as a key metric
- this represents the volume-weighted average price at which net accumulation occurred
- when net accumulation price is below current market price, it suggests the accumulated position is in profit

Current implementation:

- `buy_avg_vs_vwap_pct` captures execution quality relative to VWAP
- no explicit net accumulation price concept

Why it matters:

- net accumulation price gives a concrete "cost basis" for the accumulated position
- comparing it to current price immediately shows whether accumulators are in profit or underwater
- this is intuitive and widely used in IDX flow discussions

Recommended implementation direction:

- compute net accumulation price as the volume-weighted average price of net positive flow days
- emit:
  - `net_accumulation_price`
  - `net_accumulation_vs_current_pct` (how far current price is from accumulation price)
- this is a simple computation on existing data

### 8. Wyckoff PS / PSY Events And Continuation / Pullback Sub-Events

Source-truth gap:

- AlphaFlow's Wyckoff Event Guide shows a canonical 7-event sequence for each side:
  - Accumulation: `PS` → `SC` → `AR` → `ST` → `Spring` → `SOS` → `LPS`
  - Distribution: `PSY` → `BC` → `AR` → `ST` → `UTAD` → `SOW` → `LPSY`
- the live product detects and annotates `PS` (Preliminary Support) and `PSY` (Preliminary Supply) on the price chart
- the BMRI phase history shows phases with `PSY` events being tracked (e.g., "1 events: PSY", "8 events: PSY → PSY → PSY → PSY → AR → ST")
- AlphaFlow also lists two additional sub-events:
  - Continuation: phase extends with consistent buyer dominance
  - Pullback: healthy retracement in an uptrend, potential re-entry

Current implementation:

- detects: `SC`, `BC`, `AR`, `Spring`, `UT`, `UTAD`, `SOS`, `SOW`, `ST`, `ToS`, `LPS`, `LPSY`
- `PS` and `PSY` are not detected — these are the first events in both canonical sequences
- no explicit Continuation or Pullback event types

Why it matters:

- `PS` is the first sign of buying interest after a prolonged decline; it marks the earliest stage of potential accumulation
- `PSY` is the first sign of selling pressure after a rally; it marks the earliest stage of potential distribution
- without these, the system cannot detect the very beginning of a Wyckoff schematic — it only picks up from `SC`/`BC` onward
- the BMRI example shows AlphaFlow detecting multiple `PSY` events within a single markdown phase, which helps track the progression of selling pressure
- Continuation confirms that the current phase is extending rather than transitioning
- Pullback within markup is a re-entry signal useful for the TA skill's S2 setup family

Recommended implementation direction for PS:

- detect `PS` when: price is in a decline, a session shows buying interest (higher close position, moderate volume) near or at a new low area, but without the climactic volume of `SC`
- this is a softer signal than `SC` — it should have lower score and lower priority
- `PS` should unlock or reinforce phase `A` detection

Recommended implementation direction for PSY:

- detect `PSY` when: price is in a rally, a session shows selling pressure (lower close position, moderate volume) near or at a new high area, but without the climactic volume of `BC`
- mirror logic of `PS` for the distribution side

Recommended implementation direction for Continuation / Pullback:

- Continuation event: detect when the current phase has persisted for N+ bars with consistent directional dominance
- Pullback event: detect when price retraces within an established markup/markdown phase on declining volume, then resumes direction
- add all four new event types to `EVENT_PRIORITY` list in `wyckoff_state.py`
- `PS` and `PSY` should be high priority (they are canonical sequence starters); Continuation and Pullback should be lower priority (informational)

### 9. `SMT` Confidence And `SMT`-Specific Wash Discount

Source-truth gap:

- AlphaFlow shows `SMT Confidence` and `Wash Risk` as separate fields alongside the SMT score
- the live UI shows: SMT score 25, Confidence 58%, Wash Risk 38%
- alert badges like "ELEVATED CROSS FLOW RISK" and "PERSISTENT NET DISTRIBUTION" are generated from these meta-fields

Current implementation:

- wash risk and anomaly are global fields
- no SMT-specific discounted score exists

Why it matters:

- source-truth logic distinguishes:
  - raw `SMT`
  - whether that `SMT` should be trusted
- this is more specific than a general trust downgrade

Why it is deferred:

- depends on having a standalone `SMT` first

Recommended implementation direction:

- only after `SMT` exists:
  - add `smt_confidence`
  - add `smt_wash_discount`
  - add `smt_effective_score`
  - generate alert badges when conditions are met (e.g., "ELEVATED CROSS FLOW RISK" when wash risk is high, "PERSISTENT NET DISTRIBUTION" when distribution persists across multiple sessions)

### 10. Per-Broker Persistence Table

Source-truth gap:

- AlphaFlow's Broker Activity view shows a per-broker persistence table with columns: Broker, Direction (Buy/Sell), Streak (consecutive days in same direction), Max Streak, Consistency %
- the calendar view shows per-day detail: asymmetry state (Buy-skew / Sell-skew), CADI delta, SMT confidence, wash risk, buy concentration, sell concentration
- summary line: "16 of 21 buying, 5 selling"

Current implementation:

- persistence is computed as a single aggregate score via longest-streak analysis weighted by broker value contribution
- no per-broker persistence breakdown
- no daily-level persistence detail

Why it matters:

- per-broker persistence reveals which specific brokers are most convicted
- a single aggregate score hides whether persistence is driven by one large broker or many aligned brokers
- the broker-level view helps identify when a key broker flips direction (early warning)
- the "16 of 21 buying, 5 selling" summary is a simple but powerful signal

Recommended implementation direction:

- for each broker in the primary window, compute:
  - current direction (buy / sell)
  - current streak (consecutive days in same direction)
  - max streak over the window
  - consistency % (days in current direction / total active days)
- detect broker role flips: when a broker that was a consistent buyer (streak ≥ 3) switches to selling (or vice versa), flag it as a transition signal
- compute leader change frequency: how often the top buyer/seller changes identity across the window (high frequency = rotation/churn regime)
- emit:
  - `broker_persistence` array (top N brokers by value)
  - `broker_persistence_summary` (e.g., "16 of 21 buying, 5 selling")
  - `broker_role_flips` (count and list of significant direction changes)
  - `leader_change_frequency` (how often the dominant broker changes)
- this uses existing daily broker data; no new data source needed

### 11. Regime Threshold Calibration

Source-truth gap:

- AlphaFlow's screener shows explicit IDR thresholds for market cap and liquidity:
  - Market Cap: Large ≥ 40T, Mid 5T to <40T, Small 500B to <5T, Micro <500B
  - Liquidity: High ≥ 500B avg daily value (25d), Medium 100B to <500B, Low 10B to <100B, Very Low <10B

Current implementation:

- Market Cap: Large > 10T, Mid ≥ 1T, Small ≥ 100B, Micro < 100B
- Liquidity: High > 50B, Medium ≥ 10B, Low ≥ 1B, Very Low < 1B

Why it matters:

- the current thresholds are significantly lower than AlphaFlow's
- a stock with 15T market cap is classified as "large" in the current system but "mid" in AlphaFlow
- a stock with 80B daily value is classified as "high" liquidity currently but "low" in AlphaFlow
- this affects which weight profile is selected, which changes the verdict computation
- misclassification means the wrong factor weights are applied

Recommended implementation direction:

- review and recalibrate thresholds to align with AlphaFlow's IDX-specific ranges
- the AlphaFlow thresholds are likely calibrated to the actual IDX market distribution
- consider making thresholds configurable rather than hardcoded

### 12. Wyckoff Phase History With Event Chains

Source-truth gap:

- AlphaFlow shows a rich phase history table with columns: Phase, Period, Days, Open → Close, Range (L-H), Change %, Trend Strength, Confidence
- each phase row shows its event chain (e.g., "8 events: PSY → PSY → PSY → PSY → AR → ST")
- phases are expandable to show individual event timelines with date ranges, price changes, and durations
- the history spans years (2022 → 2026 for BMRI), not just the current analysis window

Current implementation:

- `wyckoff_history` stores up to 8 segments with: cycle_phase, schematic_phase, start/end timestamps, duration, price range, change %, confidence, maturity, events
- events within segments are stored but not as a readable chain summary
- history is limited to the OHLCV data window (typically ~200 daily bars)

Why it matters:

- the event chain summary (e.g., "PSY → PSY → AR → ST") is a compact way to see how far through the schematic a phase has progressed
- longer history provides better context for where the stock is in its multi-year cycle
- the expandable event timeline is useful for understanding the pace and quality of each event

Recommended implementation direction:

- add `event_chain` string to each segment (e.g., "PSY → BC → AR → ST")
- add `event_count` to each segment
- consider extending the OHLCV fetch window for Wyckoff history purposes (separate from the flow analysis window)
- the current segment structure already has most fields; this is mainly a presentation improvement

### 13. Participant-Type Flow Breakdown

Source-truth gap:

- practical IDX flow analysis breaks down flow by participant type:
  - Foreign net flow
  - Smart money net flow
  - Retail net flow
  - Local institution net flow
- each type has different behavioral implications

Current implementation:

- broker-flow data is aggregated by broker code, not by participant type
- no foreign vs domestic vs institutional vs retail classification

Why it matters:

- foreign net buy of Rp 120B with smart money net sell of Rp 3.9B tells a very different story than aggregate net buy of Rp 116B
- participant-type breakdown reveals who is driving the flow and who is distributing into it
- this is the most common framing used by IDX flow analysts

Why it is deferred:

- requires broker-code-to-participant-type mapping (which brokers are foreign, which are smart money, which are retail)
- this mapping is not static and may need periodic updates
- the current broker-flow fetch may not include the metadata needed for classification

Recommended implementation direction:

- define a broker classification table: foreign brokers, smart money brokers, local institution brokers, retail-heavy brokers
- compute net flow per participant type over the primary window
- emit:
  - `participant_flow.foreign_net`
  - `participant_flow.smart_money_net`
  - `participant_flow.retail_net`
  - `participant_flow.local_institution_net`
  - `participant_flow.dominant_type`
- this is a data-dependency improvement, not a computation improvement

### 14. Ridge `R²` With Out-Of-Sample Validation

Source-truth gap:

- AlphaFlow describes flow-price trust using a model-style `R²` with out-of-sample validation
- `R²` measures how well broker flow data can predict future price movements
- thresholds: `< 3%` weak, `3-10%` moderate, `> 10%` strong

Current implementation:

- trust uses deterministic regime inputs plus `Spearman` flow-price relationship

Why it matters:

- trust level gates how much authority broker flow gets
- a model-based `R²` captures explanatory power across multiple features better than one-series correlation

Why it is deferred:

- exact source-truth feature set and training protocol are unknown
- current default history is too short for a credible rolling train/test process
- this needs a wider broker-flow history window than the current operational default

Needed before implementation:

- longer broker-flow history, ideally well beyond `60` sessions
- explicit design choices for:
  - features
  - target horizon
  - train/test split
  - walk-forward method
  - ridge regularization
  - badge thresholds

### 15. Stock Beta Relative To IHSG

Source-truth gap:

- practical IDX portfolio management uses stock beta as a core risk metric
- beta measures the sensitivity of a stock's return to IHSG movements: how much systematic (non-diversifiable) market risk a position carries
- IDX practitioners use beta for: measuring portfolio exposure to IHSG, adjusting allocation by risk profile, managing portfolio volatility, and switching between defensive and aggressive posture based on market phase
- when IHSG regime deteriorates, rotating toward low-beta names preserves capital while maintaining market exposure; when regime improves, rotating toward high-beta names captures more upside

Current implementation:

- the IHSG regime overlay and aggression curve exist but operate on market structure alone (MA state, breadth)
- no per-symbol beta computation
- no portfolio-level beta exposure metric
- the trust regime classifies stocks by market cap and liquidity but not by systematic risk sensitivity

Why it matters:

- the current regime-aware sizing scales position size by market conditions but does not account for how much each position amplifies or dampens market moves
- a portfolio with 5 high-beta positions in a deteriorating regime has far more effective exposure than the same number of low-beta positions
- beta directly answers: "if IHSG drops 5% tomorrow, how much does this position hurt me?"
- this is complementary to flow analysis: flow tells you who is accumulating/distributing, beta tells you how much market risk that position carries regardless of flow quality

Beta interpretation:

- `beta = 1`: stock moves in line with IHSG
- `beta > 1`: stock is more volatile than IHSG, amplifies market moves (both up and down)
- `beta < 1`: stock is more stable, dampens market moves
- `beta < 0`: stock moves inversely to IHSG (rare in IDX)
- beta is not static — it changes over time as business conditions, leverage, liquidity, ownership concentration, and sector dynamics shift

Factors that empirically affect beta in IDX:

- business structure and industry cyclicality
- company leverage
- trading liquidity and frequency
- ownership concentration
- sensitivity to macro and commodity factors
- role as sector or index proxy (e.g., large-cap banking stocks proxy IHSG itself)

Computation method:

- use daily returns for both the stock and IHSG over a rolling window
- stock daily return: `r_stock = (close_t - close_t-1) / close_t-1`
- IHSG daily return: `r_ihsg = (ihsg_close_t - ihsg_close_t-1) / ihsg_close_t-1`
- beta = `Cov(r_stock, r_ihsg) / Var(r_ihsg)` over the rolling window
- this is equivalent to the slope coefficient from an OLS regression of stock returns on IHSG returns
- recommended rolling window: 120 trading days (~6 months) for a stable estimate, with optional 60-day short-term beta for regime-change sensitivity
- both `fetch-ohlcv` for the stock and `fetch-ohlcv` for `IHSG` already provide the required daily close data (3 years of history)

Recommended implementation direction:

- compute beta in `build_flow_context.py` or as a separate utility, since OHLCV data for both stock and IHSG is already fetched
- emit:
  - `beta_120d` (rolling 120-day beta)
  - `beta_60d` (rolling 60-day beta, optional, for short-term regime sensitivity)
  - `beta_classification`: `defensive` (< 0.7), `moderate` (0.7-1.3), `aggressive` (> 1.3)
- at portfolio level (in `portfolio-management` skill or parent synthesis):
  - compute `portfolio_weighted_beta` as the position-weighted average beta across holdings
  - compare against IHSG regime: high portfolio beta in a deteriorating regime is a risk flag
  - use beta to refine the aggression multiplier: a high-beta stock in a weak regime should get a steeper size discount than a low-beta stock in the same regime

Integration with existing systems:

- trust regime: beta can inform weight profile selection — a high-beta stock with low liquidity behaves differently from a high-beta stock with high liquidity
- aggression curve: `final_size = score_to_size(composite) × aggression_multiplier × beta_adjustment` where `beta_adjustment` dampens sizing for high-beta names in weak regimes
- flow analysis: beta contextualizes flow signals — accumulation in a high-beta name during a weak regime is a stronger conviction signal than the same accumulation in a low-beta name

### 16. `Rank IC`

Source-truth gap:

- AlphaFlow describes `Rank IC` as a separate ranking-skill metric
- measures correlation between predicted price rankings and actual rankings
- thresholds: `< 0.05` weak, `0.05-0.15` moderate, `> 0.15` strong

Current implementation:

- no explicit `Rank IC`

Why it matters:

- `R²` answers explanatory fit
- `Rank IC` answers whether the signal orders better periods above worse periods
- the trust layer is more complete with both

Why it is deferred:

- same data-length problem as `R²`
- best implemented together with the model-validation layer instead of as an isolated cosmetic field

## Priority Order

If future work resumes, the recommended order is:

1. strong verdict tiers (smallest change, immediate usability improvement)
2. standalone `SMT` with explicit components (component weights now known, includes daily series and momentum)
3. Gini-based concentration asymmetry (cleaner signal than HHI alone)
4. multi-type divergence detection (captures hidden institutional patterns)
5. regime threshold calibration (current thresholds are significantly off from AlphaFlow's IDX-calibrated values)
6. stock beta relative to IHSG (computable from existing data, directly improves regime-aware sizing)
7. rolling trust regime series (time-varying trust)
8. high volatility regime (missing weight profile)
9. net accumulation price (simple computation, high practical value)
10. Wyckoff PS / PSY events and continuation / pullback sub-events (completes the canonical 7-event sequences)
11. per-broker persistence table (granular broker-level conviction data)
12. Wyckoff phase history with event chains (presentation improvement, longer history)
13. `SMT` confidence and wash discount (depends on #2)
14. participant-type flow breakdown (data-dependency blocker)
15. ridge `R²` with out-of-sample validation (ambitious, needs longer history)
16. `Rank IC` (ambitious, needs same infrastructure as #15)

Reason:

- items 1-4 are implementable now with current data and infrastructure
- item 2 is unblocked because the AlphaFlow guide provides explicit component weights
- item 5 is a threshold-only change but affects verdict accuracy for every stock
- item 6 needs no new data source (fetch-ohlcv already has stock + IHSG daily), and feeds directly into the aggression curve and portfolio-level risk management
- items 7-9 are moderate effort with clear value
- items 10-13 are refinements that depend on earlier items or TA-side changes
- items 14-16 have external dependencies or need significantly more data

## Non-Goals

Do not treat these improvements as reasons to reopen the current completed base implementation.

The current `flow-analysis` stack is already good enough for:

- deterministic preprocessing
- flow verdict
- trust-aware synthesis
- real workflow use

These improvements are for parity and refinement, not for basic viability.
