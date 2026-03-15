Deterministic Wyckoff Market Structure Engine: Design and Implementation Blueprint
==================================================================================

The systematic translation of discretionary technical analysis into deterministic, algorithmic state machines represents a formidable challenge in quantitative financial engineering. The Wyckoff Method, pioneered by Richard D. Wyckoff in the early 20th century, relies heavily on the contextual interpretation of price action, volume, and market structure to identify the footprints of large institutional operators, conceptually framed as the "Composite Man". While highly effective in discretionary trading environments, its traditional reliance on fluid pattern recognition, subjective phase boundaries, and retrospective event labeling makes programmatic implementation highly susceptible to lookahead bias, repainting, and structural fragility.  

This comprehensive report provides an exhaustive, implementation-grade blueprint for constructing a deterministic Wyckoff history engine tailored for the `vibe-investor` technical-analysis pipeline. Operating under strict constraints—specifically, the reliance on daily and 60-minute OHLCV (Open, High, Low, Close, Volume) data without order-book or tick-level granularity, and the architectural mandate that state inference (`ta_context.daily_thesis.wyckoff_history`) must be decoupled from downstream chart generation—this design prioritizes non-repainting logic, mathematical objectivity, and robust finite state machine transitions.  

By synthesizing open-source algorithmic repositories, Pine Script logic, and Python-based market regime classifiers, this blueprint bridges the gap between historical market cycle theory and modern, backtest-safe computational frameworks.

Empirical Analysis of Existing Implementations
----------------------------------------------

To establish a quantitative foundation for the deterministic engine, a comprehensive review of existing open-source implementations, Pine Script indicators, and Python repositories was conducted. The objective was to isolate reproducible logic, mathematical threshold calibrations, and anti-noise filters while systematically discarding subjective prose and hindsight-dependent heuristics. The analysis focused heavily on how these existing codebases handle the transition from continuous time-series data into discrete structural events.  

Source Table: Real-World Implementations
----------------------------------------

The following table categorizes and evaluates the primary implementation-grade references analyzed for this architectural design. It assesses their method families, event coverage, reproducibility, and critical risks regarding algorithmic implementation.

Source Identifier

Implementation Type

Method Family

Event Coverage

Reproducibility

Strengths

Risks & Limitations

`Grzy0O68`

Pine Script (Open Source)

Full Event-Driven + Volume Spread Analysis

18+ Events (SC, Spring, UTAD, etc.), Phases A-E

High

Extensive Volume Spread Analysis (VSA) integration; explicit effort vs. result logic; strict phase bounding and clear visual states.

High programmatic complexity; potential for brittle state transitions if volume data is historically anomalous.

`Ls6NaDux`

Pine Script (Open Source)

Deterministic Factor Scoring

Structural Pivots, Regime Scoring

Very High

Strict non-repainting pivot rules (2 left/2 right bars); explicit 0-100 scoring logic; hysteresis filters to prevent state flickering.

Lacks explicit Wyckoff event nomenclature; focuses more on generalized market states and VWAP mean reversion.

`CReJpjHe`

Pine Script (Open Source)

Event/Heuristic Hybrid

SC, BC, Spring, UT, UTAD

High

Customizable volume moving average lengths; ATR-based price pattern lookbacks; automatic noise filtering for weak signals.

Uses localized lookbacks rather than continuous state machine persistence, risking loss of macro context.

`HzH1gd30`

Pine Script (Conceptual)

Full Event-Driven State Machine

14 Major Wyckoff Events

Medium

Dynamic Trading Range (TR) box extension; real-time phase A-E tracking; volume and spread confirmed events.

High risk of repainting if Trading Range boundaries are dynamically adjusted without strict confirmation lags.

`LSEG-API`

Python Jupyter Notebook

Pure Regime Classifier (Statistical)

4-Regime (Accumulation, Markup, Distribution, Markdown)

High

Uses mathematically robust Hidden Markov Models (HMM) and Gaussian Mixture Models (GMM) for unsupervised clustering.

Purely statistical; entirely ignores structural price action footprints (e.g., liquidity sweeps, Springs, Upthrusts).

QuantInsti

Python Repository / Guide

Hybrid Classifier (Machine Learning)

4-Regime

High

Utilizes strict walk-forward validation; uses Random Forests to filter signals inside specific HMM-detected regimes.

Relies heavily on returns distribution rather than OHLCV footprint analysis and effort-versus-result dynamics.

`Gifted87`

Python Repository

Rule-Based Scanner / LLM Hybrid

Basic (PS, SC, AR, ST, Spring)

Medium

Integrates yfinance data with programmatic structural checks and automated reporting.

Over-reliance on Large Language Model wrappers for final determination rather than strict deterministic state matrices.

Architectural Paradigms: Implementation Families
------------------------------------------------

The analysis of the broader algorithmic trading landscape reveals three distinct architectural paradigms for mapping market cycles. Each presents a unique tradeoff between code complexity, mathematical robustness, and the depth of narrative context provided to the downstream systems.  

The pure regime classifier model relies entirely on statistical and probabilistic mathematics to categorize the market into four broad, continuous phases: Accumulation, Markup, Distribution, and Markdown. These implementations typically deploy unsupervised machine learning techniques, such as Hidden Markov Models (HMM) or Gaussian Mixture Models (GMM), utilizing rolling windows of daily returns and realized volatility to assign a state probability to the current market environment. The primary strength of this family is its absolute mathematical objectivity and its inherent immunity to the structural noise of individual candlestick patterns. Because these models do not look for specific geometric shapes, they are easy to optimize via walk-forward testing. However, their fatal flaw within a Wyckoff context is their blindness to market microstructure. A statistical model cannot differentiate between a structural Wyckoff "Spring" (a deliberate liquidity sweep below a known support level) and a standard high-volatility news event. Furthermore, they provide no explicit pricing boundaries, such as the exact resistance of a distribution range, making precise risk management and stop-loss placement algorithmically difficult.  

Conversely, the full event-driven state machine approach attempts to hard-code the exact sequencing of the classic Wyckoff schematics into a rigid programmatic flow. The algorithm establishes a Trading Range (TR) upon detecting initial climax volume, and then hunts sequentially for Phase A (Preliminary Support, Selling Climax, Automatic Rally, Secondary Test), Phase B internal volatility contraction, Phase C terminal tests (Spring or Upthrust After Distribution), Phase D breakouts (Sign of Strength or Sign of Weakness), and finally Phase E continuation. This approach provides immense narrative value, successfully translating complex market psychology into discrete, actionable labels. When accurate, it perfectly delineates the chart and identifies high-probability, asymmetric entry points. The fundamental weakness of this family is extreme brittleness. Financial markets are highly entropic, and institutional order flow rarely adheres perfectly to textbook schematics. If the algorithm's volume threshold is slightly too high and it misses the initial Selling Climax, the entire state machine fails to advance, leaving the system stranded in an incorrect "Markdown" state while the market actually proceeds through accumulation and markup.  

The optimal solution, and the recommended paradigm for the `vibe-investor` pipeline, is the hybrid event and regime classifier. This architecture merges the statistical stability of broad regime detection with the structural awareness of event-driven logic. It utilizes a continuous, dynamic scoring system to classify the overarching macro regime based on moving averages, volatility bands, and Volume Spread Analysis (VSA). Simultaneously, it runs localized, loosely coupled event detectors to tag specific structural anomalies—such as Springs, Upthrusts, and volume climaxes—without demanding a strict, unbreakable linear progression from Phase A to Phase E. If a Phase C Spring is detected with a high degree of mathematical confidence, the state machine can probabilistically transition the overarching regime into Accumulation, even if the Phase A components were structurally ambiguous. This creates a fault-tolerant system capable of handling real-world market noise.  

Anatomy of Algorithmic Wyckoff Implementations
----------------------------------------------

To successfully build the hybrid deterministic engine, the abstract concepts of the Wyckoff methodology must be translated into explicit mathematical formulas derived strictly from OHLCV arrays.

Input Features and Data Normalization
-------------------------------------

Given the strict constraint that the system relies solely on OHLCV data (excluding order-book depth or tick-level delta), the engine must extract institutional intent entirely from the relationship between price spread and volume. This is the foundational Wyckoff Law of Effort vs. Result. Raw volume and raw point spreads are inherently meaningless across different assets or different historical epochs due to changing liquidity and asset prices. Therefore, robust normalization is mandatory.  

The engine relies on three core normalized features calculated at every time step t:

1. **Normalized Spread Ratio:** The raw spread is defined as Hight​−Lowt​. To determine if a spread is structurally significant, it is normalized against a rolling Average True Range (ATR). A standard 20-period ATR provides a stable baseline for local volatility.  

    * _Narrow Spread:_ (Hight​−Lowt​)<0.7×ATR20​

    * _Normal Spread:_ 0.7×ATR20​≤(Hight​−Lowt​)≤1.5×ATR20​

    * _Wide Spread:_ (Hight​−Lowt​)\>1.5×ATR20​

2. **Normalized Volume Ratio:** Volume must be evaluated relative to its recent past to identify climactic institutional activity. A 20-period Simple Moving Average of Volume (SMAVol20​) serves as the baseline.  

    * _Low Volume (Testing):_ Volumet​<0.7×SMAVol20​

    * _High Volume (Active Participation):_ Volumet​\>1.5×SMAVol20​

    * _Climax/Ultra Volume (Capitulation/Absorption):_ Volumet​\>2.0×SMAVol20​

3. **Intraday Close Position:** The relative position of the closing price within the bar's total range indicates intraday control and is a powerful proxy for order-book absorption. It is calculated as ClosePos\=(Closet​−Lowt​)/(Hight​−Lowt​).  

    * _Strong Demand / Bullish Rejection:_ ClosePos\>0.75 (Price closes in the top 25% of the bar, leaving a long lower wick).

    * _Strong Supply / Bearish Rejection:_ ClosePos<0.25 (Price closes in the bottom 25% of the bar, leaving a long upper wick).

    * _Neutral / Equilibrium:_ 0.25≤ClosePos≤0.75.

When applied to 60-minute data, these moving averages must account for intraday seasonality (e.g., the high volume at the open and close of the traditional equity session). For 60m arrays, the engine should utilize session-anchored volume averages or time-of-day specific lookbacks to prevent false climax signals occurring simply because the market opened.  

Event Definitions and Deterministic Thresholds
----------------------------------------------

By combining the normalized features above with structural pivot detection, the engine can deterministically define the major Wyckoff events required to navigate the state machine. The following table outlines the programmatic logic gates for the most critical events.

Wyckoff Event

Structural Context

Primary VSA Condition

Secondary Confirmations

Function in State Machine

**Selling Climax (SC)**

Preceded by a localized downtrend (Price below SMA50​). Forms a new Pivot Low.

Wide Spread (\>1.5ATR) AND Climax Volume (\>2.0SMAVol​).

ClosePos\>0.4 (indicating institutional absorption of public panic).

Halts the Markdown state. Initiates Phase A Accumulation. Sets the provisional TR Support.

**Automatic Rally (AR)**

Immediately follows an SC event. Forms a new Pivot High.

Spread and Volume are generally irrelevant, as it represents a lack of supply rather than aggressive demand.

Must fail to establish a higher high relative to the structure preceding the SC.

Caps Phase A. Establishes the definitive Trading Range (TR) Resistance boundary.

**Secondary Test (ST)**

Price returns to within 5% of the SC low price level.

Low Volume (<0.8SMAVol​) AND Narrow Spread.

Must hold above or slightly below the SC low without accelerating downward.

Confirms Phase B Accumulation. Proves that selling pressure has exhausted.

**Spring (Phase C)**

Occurs after TR boundaries are established and Phase B has aged.

Either: Ultra-Low Volume (<0.5SMAVol​) OR High Volume with massive rejection (ClosePos\>0.8).

Price breaches the TR Support level, but closes back inside the TR on the current or subsequent bar.

Triggers Phase C. Represents the ultimate bear trap and liquidity sweep before Markup.

**Sign of Strength (SOS)**

Price approaches or breaches the TR Resistance level.

Wide Spread (\>1.5ATR) AND High Volume (\>1.5SMAVol​).

ClosePos\>0.7 (strong bullish close demonstrating genuine demand).

Triggers Phase D. Confirms institutional willingness to mark prices higher.

**Upthrust (UTAD)**

Bearish counterpart to the Spring. Occurs late in a distribution TR.

High Volume with bearish rejection (ClosePos<0.2) OR Low Volume false breakout.

Price breaches TR Resistance but closes back inside.

Triggers Phase C Distribution. Ultimate bull trap.

Anti-Noise Filters
------------------

Financial time-series data is notoriously noisy, heavily populated by false breakouts and erratic prints. To maintain state stability, the engine must implement hysteresis and confirmation buffers.  

1. **Pivot Lock-In:** A structural pivot is never identified on the current bar. The engine requires N bars to form the left side of the pivot, and N bars to form the right side. In this engine, a strict 2-left/2-right rule is applied. A pivot low at index i is only acknowledged when the algorithm reaches index i+2, provided the lows at i+1 and i+2 are strictly higher than the low at i.  

2. **Tick Buffers:** When evaluating if a price has breached a Trading Range boundary (e.g., checking for a Spring or SOS), a strict equality (`<` or `>`) will generate severe noise. The engine applies an ATR-scaled tick buffer. A true breakdown requires the price to breach the TR Support by at least 0.1×ATR20​. Minor wicks within this buffer zone are ignored, maintaining the integrity of the existing state.  

3. **Volume Smoothing:** Raw volume spikes can occur due to data feed errors or anomalous block trades. Applying a 3-bar exponential moving average to the volume ratio prior to threshold evaluation smooths out single-bar anomalies and requires sustained effort to trigger state transitions.  

Eradicating Hindsight Leakage and Repaint Risk
----------------------------------------------

The most pervasive and catastrophic failure point in programmatic technical analysis is repainting—the algorithmic phenomenon where historical states are retroactively altered based on data that was not available at the exact moment of execution. If the `wyckoff_history` array repaints, any downstream machine learning model or quantitative backtest utilizing the `ta_context` will exhibit lookahead bias, generating highly optimistic, fictional performance metrics.  

Because the `vibe-investor` pipeline requires the `wyckoff_history` array to be deterministically reliable, the engine enforces strict non-repainting policies at the core algorithmic level.

The Mechanics of Repainting in Time-Series Analysis
---------------------------------------------------

Repainting generally occurs through two vectors. The first is intra-bar leakage, common in streaming environments where an algorithm evaluates conditions while a candlestick is still forming. A condition might evaluate to `True` halfway through an hour, trigger a state change, and then evaluate to `False` by the close of the hour, forcing the algorithm to "erase" the transition. The second vector is structural hindsight, where an algorithm identifies a pattern (like a zigzag or a macro Wyckoff phase) by looking forward in the array (e.g., using `data[i+5]` to determine if `data[i]` is a significant peak).  

Right-Edge-Only Labeling and Confirmation Delays
------------------------------------------------

To guarantee absolute immutability, the engine processes the OHLCV array sequentially, mimicking a live data feed. It enforces a strict "right-edge-only" evaluation policy.

* **Bar State Confirmation:** The engine only executes its logic on fully closed bars. In Python pandas/NumPy pipelines, this means the current index i being evaluated is always assumed to represent a finalized time period.

* **The State Transition Lag:** Because the engine relies on structural pivots, and a pivot requires two confirming bars to the right, the engine operates with an inherent two-bar lag. If a Selling Climax pivot low occurs at timestamp t\=100, the engine cannot mathematically confirm the existence of that pivot until timestamp t\=102.  

* **Historical Mapping vs. Current State Reality:** To accurately populate the `wyckoff_history` array without leaking the future, the algorithm handles labeling distinctly from execution. At t\=100 and t\=101, the engine's `current_wyckoff_phase` remains "Markdown." At t\=102, the pivot is confirmed. The engine transitions the `current_wyckoff_phase` to "Phase A Accumulation." However, when generating the segment for the `wyckoff_history` array, it correctly maps the `start_index` of Phase A to t\=100. This ensures the historical record is perfectly aligned for downstream charting modules, but the state machine itself never acted on information it did not possess.  

By strictly enforcing these delayed state confirmation policies, the `wyckoff_history` array becomes an authentic, backtest-safe ledger. If a quantitative analyst runs the engine over data from 2020 to 2025, the state emitted for March 15, 2023, will be exactly the same as if the engine had been running live on that specific date.

Recommended Architectural Design for `vibe-investor`
----------------------------------------------------

The recommended design for the separate deterministic state module is an explicit, rule-based Finite State Machine (FSM) equipped with continuous scoring functions. This architecture satisfies the constraint of extracting Wyckoff phases from OHLCV data while cleanly decoupling the mathematical logic from the visual chart generation.  

The State Machine Schema
------------------------

The FSM operates across two distinct hierarchical tiers: the Macro Cycle and the Micro Phase.

1. **Macro Cycle (`current_cycle_phase`):** Represents the broader 4-regime classification. The valid states are `ACCUMULATION`, `MARKUP`, `DISTRIBUTION`, and `MARKDOWN`.  

2. **Micro Phase (`current_wyckoff_phase`):** Represents the specific Wyckoff structural progression within the Macro Cycle. Valid states include `PHASE_A`, `PHASE_B`, `PHASE_C`, `PHASE_D`, `PHASE_E`, and `UNKNOWN`.  

State Transition Logic
----------------------

The engine iterates through the OHLCV arrays, evaluating the normalized VSA features and confirmed pivots to trigger state transitions.

* **Initialization:** The engine begins in the `UNKNOWN` state. It requires a significant volume anomaly (Climax) to anchor the first Trading Range.

* **Entering Accumulation:** While in `UNKNOWN` or `MARKDOWN`, the detection of a confirmed Selling Climax (SC) immediately transitions the Macro Cycle to `ACCUMULATION` and the Micro Phase to `PHASE_A`. The engine records the low price of the SC as the provisional `support_price`.

* **Establishing the Range:** Within `PHASE_A`, the detection of an Automatic Rally (AR) pivot high establishes the `resistance_price`. Once a subsequent Secondary Test (ST) pivot low is confirmed on diminished volume, the FSM transitions to `PHASE_B`. The Trading Range (TR) boundaries are now locked in the `trading_range_context`.  

* **The Terminal Test:** The FSM remains in `PHASE_B` while price oscillates between the support and resistance boundaries. A transition to `PHASE_C` is exclusively triggered by a Spring event—a temporary breach of the `support_price` followed by a rapid recovery.  

* **Markup Confirmation:** From `PHASE_C`, a strong upward thrust (Sign of Strength) that breaks the `resistance_price` on high volume transitions the engine to `PHASE_D`. A subsequent higher low (Last Point of Support) confirms the trend, moving the FSM into `PHASE_E` (Markup). The Macro Cycle updates to `MARKUP`.  

Confidence and Maturity Scoring
-------------------------------

A binary state output (e.g., "The market is in Phase C") is insufficient for sophisticated technical analysis pipelines. Downstream models require a measure of signal quality to weight their decisions. The module computes two distinct metrics:  

**Maturity Score (0.0 to 1.0):** This metric represents the structural completeness of the current macro cycle. It measures how far along the timeline the Wyckoff schematic has progressed.

* `PHASE_A`: 0.20 (Initial stop of the trend, high uncertainty).

* `PHASE_B`: 0.40 to 0.60 (Building the cause; scales upward as the duration of Phase B increases relative to the prior trend length).

* `PHASE_C`: 0.75 (The terminal test has occurred).

* `PHASE_D`: 0.90 (Dominance of demand is evident).

* `PHASE_E` (Markup): 1.00 (Trend is fully established).

**Confidence Score (0.0 to 100.0):** This dynamic score evaluates how closely the observed market data adheres to the idealized Wyckoff Laws of Supply/Demand and Effort/Result.  

* The baseline score upon entering a new phase is 50.0.

* _VSA Alignment Bonuses:_ If a Phase C Spring occurs on ultra-low volume (indicating complete exhaustion of supply), the score is augmented by +20.0. If a Sign of Strength (SOS) occurs with a spread ratio \>2.0 and volume ratio \>2.5, the score increases by +15.0.  

* _VSA Divergence Penalties:_ If Secondary Tests (ST) within Phase B consistently exhibit higher volume than the initial Selling Climax, it indicates persistent supply. The confidence score is penalized by −15.0 per high-volume test.  

Invalidation and Failure Handling
---------------------------------

Unlike static chart patterns, deterministic state machines must account for failure. If the market structure aggressively breaks the Wyckoff thesis, the engine must reset.  

* **Breakdown Failure:** If the FSM is in `PHASE_B` or `PHASE_C` Accumulation, and the price breaches the TR `support_price` by more than 1.0×ATR20​ on high volume, and fails to reclaim the support level within 5 bars, the accumulation thesis is irreparably broken.  

* **Action:** The engine immediately transitions the Macro Cycle back to `MARKDOWN`. The current historical segment is closed, and the `invalidation_reason` is explicitly flagged as `"BREAKDOWN_FAILURE"`.

Proposed Output Schema (Module Contract)
----------------------------------------

To satisfy the system constraints, the `wyckoff_state` module functions as an independent calculator. It consumes an OHLCV dataframe and outputs a highly structured, JSON-compatible dictionary. This output is entirely decoupled from any charting library and is designed to be injected directly into the `ta_context.daily_thesis.wyckoff_history` parameter.  

The schema provides immediate state variables for fast algorithmic decision-making, trading range context for risk management (stop-loss/take-profit placement), and an exhaustive historical ledger for downstream visualization and deep-learning ingestion.

JSON

    {
      "current_wyckoff_phase": "PHASE_C",
      "current_cycle_phase": "ACCUMULATION",
      "wyckoff_current_confidence": 85.5,
      "wyckoff_current_maturity": 0.75,
      "trading_range_context": {
        "is_active": true,
        "resistance_price": 45200.50,
        "support_price": 41500.00,
        "established_date": "2026-02-10T00:00:00Z",
        "range_height_atr_multiple": 4.2
      },
      "wyckoff_history":,
          "segment_confidence": 75.0,
          "invalidation_reason": null
        },
        {
          "segment_id": "seg_002",
          "start_index": 1056,
          "end_index": 1120,
          "start_date": "2026-02-11T00:00:00Z",
          "end_date": "2026-03-08T00:00:00Z",
          "phase_label": "PHASE_B",
          "macro_cycle": "ACCUMULATION",
          "trigger_events":,
          "segment_confidence": 60.0,
          "invalidation_reason": null
        },
        {
          "segment_id": "seg_003",
          "start_index": 1121,
          "end_index": null,
          "start_date": "2026-03-09T00:00:00Z",
          "end_date": null,
          "phase_label": "PHASE_C",
          "macro_cycle": "ACCUMULATION",
          "trigger_events":,
          "segment_confidence": 85.5,
          "invalidation_reason": null
        }
      ]
    }

Implementation Pseudocode
-------------------------

The following pseudocode outlines the deterministic logic required to process OHLCV arrays, calculate VSA metrics, detect structural pivots without lookahead bias, and seamlessly advance the finite state machine. The logic is optimized for array-based iteration, making it highly portable to Python environments (utilizing libraries such as pandas and NumPy) while remaining adaptable for Pine Script architectures if required.

Python

    import uuid
    import numpy as np
    
    class WyckoffEngine:
        """
        Deterministic Finite State Machine for Wyckoff Market Structure inference.
        Designed for strict right-edge evaluation to prevent repainting.
        """
        def __init__(self, atr_len=20, vol_len=20, pivot_left=2, pivot_right=2):
            # Configuration Thresholds
            self.atr_len = atr_len
            self.vol_len = vol_len
            self.p_left = pivot_left
            self.p_right = pivot_right
            
            # State Variables
            self.macro_cycle = "UNKNOWN"
            self.micro_phase = "UNKNOWN"
            self.tr_high = None
            self.tr_low = None
            self.confidence = 50.0
            self.maturity = 0.0
            
            # Output Ledgers
            self.history =
            self.current_segment = None
    
        def _calc_vsa(self, data, idx):
            """Calculates Effort vs Result (VSA) metrics for a specific index."""
            spread = data['high'][idx] - data['low'][idx]
            # Assumes pre-calculated ATR and Volume SMA columns exist in the dataframe
            atr = data['atr_20'][idx]
            vol_sma = data['vol_sma_20'][idx]
            
            spread_ratio = spread / atr if atr > 0 else 1.0
            vol_ratio = data['volume'][idx] / vol_sma if vol_sma > 0 else 1.0
            close_pos = (data['close'][idx] - data['low'][idx]) / spread if spread > 0 else 0.5
            
            return {"spread_ratio": spread_ratio, "volume_ratio": vol_ratio, "close_pos": close_pos}
    
        def _is_pivot_low(self, data, current_idx):
            """
            Determines if a confirmed pivot low exists. 
            Evaluated at current_idx, but validates the geometry at current_idx - p_right.
            Ensures zero lookahead bias.
            """
            target_idx = current_idx - self.p_right
            if target_idx - self.p_left < 0:
                return False, None
                
            target_low = data['low'][target_idx]
            
            # Check left structural integrity
            for j in range(1, self.p_left + 1):
                if data['low'][target_idx - j] <= target_low:
                    return False, None
                    
            # Check right structural integrity
            for j in range(1, self.p_right + 1):
                if data['low'][target_idx + j] <= target_low:
                    return False, None
                    
            return True, target_idx
    
        def _is_pivot_high(self, data, current_idx):
            """Mirrors _is_pivot_low for resistance structures."""
            target_idx = current_idx - self.p_right
            if target_idx - self.p_left < 0:
                return False, None
            target_high = data['high'][target_idx]
            for j in range(1, self.p_left + 1):
                if data['high'][target_idx - j] >= target_high: return False, None
            for j in range(1, self.p_right + 1):
                if data['high'][target_idx + j] >= target_high: return False, None
            return True, target_idx
    
        def _transition(self, data, current_idx, new_macro, new_micro, trigger_event, score_delta=0):
            """Manages the closure of historical segments and instantiation of new states."""
            # Adjust confidence based on the transition quality
            self.confidence = min(100.0, max(0.0, 50.0 + score_delta))
            
            if self.current_segment:
                self.current_segment["end_index"] = current_idx
                self.current_segment["end_date"] = str(data['date'][current_idx])
                self.history.append(self.current_segment)
                
            self.macro_cycle = new_macro
            self.micro_phase = new_micro
            
            self.current_segment = {
                "segment_id": f"seg_{str(uuid.uuid4())[:8]}",
                "start_index": trigger_event['index'], # Assign to the actual structural event
                "start_date": str(data['date'][trigger_event['index']]),
                "end_index": None,
                "end_date": None,
                "phase_label": new_micro,
                "macro_cycle": new_macro,
                "trigger_events": [trigger_event],
                "segment_confidence": self.confidence,
                "invalidation_reason": None
            }
    
        def process_data(self, data):
            """Main iteration loop simulating real-time or safe backtest execution."""
            for i in range(max(self.atr_len, self.p_left + self.p_right), len(data)):
                
                vsa_current = self._calc_vsa(data, i)
                is_plow, p_low_idx = self._is_pivot_low(data, i)
                is_phigh, p_high_idx = self._is_pivot_high(data, i)
                
                # ---------------------------------------------------------
                # STATE MACHINE ROUTING: ACCUMULATION SCHEMATIC
                # ---------------------------------------------------------
                if self.macro_cycle in:
                    # Hunt for Phase A: Selling Climax (SC)
                    if is_plow:
                        vsa_pivot = self._calc_vsa(data, p_low_idx)
                        # SC Logic Gate: Wide spread, climax volume, absorption off lows
                        if vsa_pivot['spread_ratio'] > 1.5 and vsa_pivot['volume_ratio'] > 2.0 and vsa_pivot['close_pos'] > 0.4:
                            self.tr_low = data['low'][p_low_idx]
                            trigger = {"event_type": "SC", "index": p_low_idx, "price": self.tr_low, "vsa_metrics": vsa_pivot}
                            self._transition(data, i, "ACCUMULATION", "PHASE_A", trigger, score_delta=10)
                            self.maturity = 0.20
    
                elif self.micro_phase == "PHASE_A":
                    # Hunt for Automatic Rally (AR) to establish TR Resistance
                    if is_phigh and data['high'][p_high_idx] > self.tr_low:
                        self.tr_high = data['high'][p_high_idx]
                        vsa_pivot = self._calc_vsa(data, p_high_idx)
                        trigger = {"event_type": "AR", "index": p_high_idx, "price": self.tr_high, "vsa_metrics": vsa_pivot}
                        # Transition to Phase B once bounds are set
                        self._transition(data, i, "ACCUMULATION", "PHASE_B", trigger, score_delta=5)
                        self.maturity = 0.40
    
                elif self.micro_phase == "PHASE_B":
                    # Invalidation Rule: Hard breakdown without reclaim
                    if data['close'][i] < (self.tr_low - (data['atr_20'][i] * 0.5)) and vsa_current['volume_ratio'] > 1.5:
                        self.current_segment["invalidation_reason"] = "BREAKDOWN_FAILURE"
                        # Reset State
                        self.macro_cycle = "MARKDOWN"
                        self.micro_phase = "UNKNOWN"
                        self.tr_low, self.tr_high = None, None
                        continue
    
                    # Hunt for Phase C: Spring
                    if is_plow and data['low'][p_low_idx] < self.tr_low:
                        # Must close back inside the TR to be a valid Spring
                        if data['close'][p_low_idx] > self.tr_low or data['close'][i] > self.tr_low:
                            vsa_pivot = self._calc_vsa(data, p_low_idx)
                            
                            # Score modifier: Low volume spring = excellent. High volume with strong close = good.
                            score_mod = 20 if vsa_pivot['volume_ratio'] < 0.8 else (10 if vsa_pivot['close_pos'] > 0.75 else -10)
                            
                            trigger = {"event_type": "SPRING", "index": p_low_idx, "price": data['low'][p_low_idx], "vsa_metrics": vsa_pivot}
                            self._transition(data, i, "ACCUMULATION", "PHASE_C", trigger, score_delta=score_mod)
                            self.maturity = 0.75
    
                elif self.micro_phase == "PHASE_C":
                    # Hunt for Phase D: Sign of Strength (SOS)
                    if data['close'][i] > self.tr_high and vsa_current['volume_ratio'] > 1.5 and vsa_current['spread_ratio'] > 1.5:
                        trigger = {"event_type": "SOS", "index": i, "price": data['close'][i], "vsa_metrics": vsa_current}
                        self._transition(data, i, "ACCUMULATION", "PHASE_D", trigger, score_delta=15)
                        self.maturity = 0.90
                        
                # Note: Parallel logic block required for Distribution schematics (PSY, BC, UTAD, SOW)
    
            return self._emit_payload()
    
        def _emit_payload(self):
            """Constructs the final JSON schema payload."""
            # Append the final unclosed segment to the history payload for current context
            full_history = self.history.copy()
            if self.current_segment:
                full_history.append(self.current_segment)
                
            return {
                "current_wyckoff_phase": self.micro_phase,
                "current_cycle_phase": self.macro_cycle,
                "wyckoff_current_confidence": round(self.confidence, 2),
                "wyckoff_current_maturity": self.maturity,
                "trading_range_context": {
                    "is_active": self.tr_high is not None,
                    "resistance_price": self.tr_high,
                    "support_price": self.tr_low,
                    "established_date": self.current_segment['start_date'] if self.current_segment else None
                },
                "wyckoff_history": full_history
            }

Validation and Integrity Strategy
---------------------------------

Given the non-deterministic, probabilistic nature of financial markets and the inherent subjectivity historically associated with discretionary Wyckoff methodologies, validating a deterministic engine requires stringent, quantitative proxy testing. Traditional accuracy metrics (like F1-scores or binary cross-entropy) are insufficient because objective "true labels" for market phases do not exist independently of hindsight bias. The engine must be validated on its behavioral stability and its predictive utility.  

1\. Labeling Integrity and Anti-Repaint Assertions
--------------------------------------------------

The most critical validation step ensures zero hindsight leakage. The engine must undergo strict continuous integration (CI) checks to guarantee that historical states remain immutable.

* **In-Sample vs. Out-of-Sample Mutation Matrix:** Run the engine on a static dataset from index T0​ to T1000​. Store the resulting `wyckoff_history` array as a JSON baseline. Next, run the engine iteratively, simulating a live feed (processing T0​ to T500​, appending the state, then stepping forward to T501​, etc.). Compare the finalized segmented outputs of the iterative run against the static baseline. If any phase label, `segment_id`, or trigger event index mutates retrospectively, a repainting violation has occurred and the CI test fails.  

* **Confirmation Lag Assertions:** Construct unit tests to verify the right-edge labeling rules. Ensure that an event labeled at timestamp t (e.g., a Spring low) was mathematically impossible for the engine to emit until timestamp t+R (where R is the right-hand bar pivot requirement).

2\. Walk-Forward Regime Transition Testing
------------------------------------------

To validate that the engine maintains predictive validity across shifting market conditions and prevents curve-fitting, Walk-Forward Optimization (WFO) testing must be employed.  

* **Rolling Calibration:** Train and calibrate the VSA thresholds (e.g., the multipliers for what constitutes "Climax Volume") on a 2-year rolling window, and test the state machine's output on the subsequent 6-month out-of-sample window.

* **Temporal Coherence and Hysteresis Checks:** Measure the stability of the `current_cycle_phase`. If the engine constantly flickers between `ACCUMULATION` and `DISTRIBUTION` within a tight 10-bar window, the hysteresis filtering (tick buffers) is mathematically too weak. A valid finite state machine should display strong temporal coherence, maintaining its state until a statistically significant structural violation occurs.  

3\. Event Precision and Recall Proxies
--------------------------------------

Because ground-truth labels are absent, the engine's efficacy must be evaluated using forward-looking market outcomes as proxies for correct classification. This measures whether the events detected by the algorithm actually correspond to the theoretical price action expected by the Wyckoff methodology.  

* **Phase C Spring Recall (MAE/MFE Metrics):** When the engine identifies a Phase C Spring, it assumes institutional accumulation is complete and markup is imminent. Measure the Maximum Adverse Excursion (MAE) and Maximum Favorable Excursion (MFE) over the 20 bars immediately following the trigger. A high-quality Spring detection algorithm should yield a distribution highly skewed toward positive MFE, with minimal MAE. If the MAE regularly breaches the low of the Spring, the engine is misidentifying standard downtrend continuations as Springs.  

* **Sign of Strength (SOS) Fake-Out Rate:** If the engine transitions to Phase D via an SOS breakout, calculate the percentage of instances where the price subsequently advances beyond a 1.5×ATR target without breaking back below the midpoint of the Trading Range. If the failure rate (bull traps) exceeds 40%, the VSA volume thresholds for the SOS trigger must be stiffened to demand greater institutional participation.  

* **Sanity State Matrices:** Construct an automated check verifying that mathematically impossible or theoretically invalid transitions do not occur. For example, the engine must never transition directly from `PHASE_C` Accumulation into `PHASE_E` Distribution without passing through a documented invalidation trigger or completing a separate distribution trading range.  

Conclusion
----------

The successful transition of the Wyckoff Method from a discretionary, visually interpretive framework into a deterministic, implementation-grade mathematical engine requires the rigorous synthesis of Volume Spread Analysis (VSA), immutable pivot detection, and strict finite state machine (FSM) architecture. By abandoning the fragile expectation of perfect, textbook market schematics in favor of a hybrid approach—where localized VSA anomalies, such as Springs and volume Climaxes, inform the probability of broader regime shifts—the system achieves high contextual awareness without succumbing to programmatic brittleness.

Crucially, the architecture detailed in this blueprint safeguards the `vibe-investor` technical-analysis pipeline against lookahead bias. By forcing all pivot and event evaluations to adhere to right-edge confirmation delays, and by cleanly separating the mathematical evaluation state from the historical logging state, the resulting `wyckoff_history` array becomes a mathematically honest, backtest-safe representation of market structure. This robust ledger can be confidently integrated into downstream AI analysis, feature engineering pipelines, or systematic trading logic, providing quantitative systems with a deterministic proxy for institutional intent.
