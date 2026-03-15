# Deterministic Wyckoff History Engine From OHLCV

## Context, constraints, and what “deterministic” must mean here

The goal is to implement Wyckoff historical state as a *separate, deterministic state module* that can later be summarized into TA, rather than mixing Wyckoff logic into chart generation or `ta_context` directly. The constraint that `ta_context` and chart generation are separate steps implies the Wyckoff module must produce a portable, chart-agnostic state artifact that can be rendered later, and must not depend on chart-side heuristics or visualization-time sampling.

A deterministic Wyckoff “history engine” in this setting should have three properties that are testable:

- **Input determinism:** given the same OHLCV arrays (daily + optional 60m), the module produces identical `wyckoff_history[]` and `current_*` fields (no randomness, no non-deterministic floating behavior, stable tie-break rules).
- **Right-edge semantics:** at “as-of bar *t*”, the module must not use information from bars > *t* to decide the state at *t*. This is the main anti-hindsight requirement and interacts strongly with swing/pivot logic.
- **Stable backtest labeling:** if an event is derived from a pivot function that needs *k* “right bars” to confirm (a classic *repaint in hindsight* mechanism), the engine must explicitly represent “event-at time” vs “confirmed-at time” (or apply a deliberate delay policy) to keep walk-forward labeling honest. A number of practical implementations explicitly acknowledge “pivots are confirmed” and therefore repaint “minimally” (i.e., with a delay), which is acceptable if you treat the delay as a first-class part of the state machine rather than hiding it. citeturn20search0turn21view0

Wyckoff schematics are originally a discretionary framework attributed to entity["people","Richard D. Wyckoff","technical analyst"] and later formalized in many educational schematics, but implementation-grade systems inevitably simplify/operationalize event definitions and phase transitions (and different implementations disagree on what must be true for a “climax” bar, how to treat volume, and how long confirmations must take). citeturn20search13turn20search8turn10view0turn20search11

## Source table of implementation-grade references

The table below emphasizes sources with **actual code** (Pine/Python/MQL/notebook) and **reproducible logic**, but also includes a few closed-source indicators because they contain unusually explicit event/phase criteria and state-machine notes useful for designing a deterministic module (with clear caveats).

| URL | type (code/paper/article) | license | method family | event coverage | reproducibility | strengths | risks |
|---|---|---|---|---|---|---|---|
| `https://www.scribd.com/document/955852826/AIO-Wyckoff-VWMA-Liquidity` | code (Pine, embedded in doc) | Wyckoff block claims MPL‑2.0; other blocks include other licenses | hybrid: regime (RSI) + Wyckoff structural events | SC/BC, AR/DAR, ST/DST, spring/utad flags + range boxing | **high** (literal Pine code shown) | Concrete, portable event logic using pivots + RSI thresholds; includes range-box construction and explicit event sequencing (SC→AR, BC→DAR, etc.). citeturn21view0 | Pivot-based detection implies delayed confirmation / lookahead if not modeled; RSI-centric “Wyckoff” differs from volume-spread core Wyckoff; doc reposting provenance may matter despite embedded license note. citeturn21view0turn20search0 |
| `https://id.tradingview.com/script/eKXiwaeS/` | article/indicator page | open-source indicator page; code not visible via this scrape | hybrid: RSI regime + pivot events | SC/AR/ST, BC/DAR/DST; mentions adding SOS/LPS etc “later” | **medium** (logic described; code not directly accessible here) | Summarizes intent: pivots confirmed; “repainting is minimal” due to pivot confirmation framing. citeturn20search0 | Still a pivot-confirmation approach—without explicit “confirmed-at” modeling, backtests can leak. citeturn20search0turn21view0 |
| `https://www.tradingview.com/script/EoRaXtOc-SPP-PRO-Wyckoff-Institutional-Engine-v4-0/` | article/indicator page | closed/protected | full event-driven finite state machine + scoring | Claims phases A–E for both accumulation & distribution; events incl. SC/BC, AR, ST, Spring/UTAD, SOS/SOW, LPS/LPSY, breakouts | **low** (closed code) | Unusually explicit in describing a state machine, phase table, reset logic, and confidence/probability fields (Bayesian probability + composite score). citeturn10view0 | Not auditable; may rely on multi-timeframe requests; definitions diverge from other sources on some bar-close positioning; cannot ensure non-repaint without code. citeturn10view0 |
| `https://www.tradingview.com/script/HzH1gd30-FibAlgo-Wyckoff-Accumulation-Distribution/` | article/indicator page | protected | full event-driven schematic detector | PS/SC/AR/ST/Spring/SOS/LPS and PSY/BC/AR/ST/UT/SOW/LPSY; phases A–E | **low to medium** (closed code; detailed parameterization in description) | Describes sequential event detection, trend pre-filtering, volume/spread confirmations, and explicit “reference level separation” plus “automatic invalidation” concepts. citeturn2view1turn20search11 | Closed; implementation details/edge cases unknown; may still repaint depending on internal pivots. citeturn2view1 |
| `https://raw.githubusercontent.com/neurotrader888/VSAIndicator/main/vsa.py` | code (Python) | MIT (repo indicates MIT) | VSA-style “effort vs result” anomaly detector | not Wyckoff phases; produces per-bar anomaly score | **high** | Clear OHLCV-only “effort vs result” score: ATR-normalize range, normalize volume by rolling median, perform rolling regression of range vs volume, output deviation score. citeturn17view0turn14view1 | More statistical than schematic; needs mapping into events/phase logic; regression window choices affect stability. citeturn17view0 |
| `https://github.com/Arturo-Salcedo/Volume-Spread-Analysis-VSA-indicator-for-Metatrader-5` | code (MQL5 + README) | MIT | VSA event classifier | No Demand / No Supply / climaxes / stopping volume described (Wyckoff-adjacent primitives) | **medium** (code exists; README provides explicit thresholds) | Provides explicit thresholds for ND/NS/climax/stopping volume based on volume vs average and bar range/close location; reinforces “wait for confirmation next candle.” citeturn32view0 | Not a full Wyckoff phase machine; designed for MT5; “accum/distribution” is discussed but not fully implemented per README note. citeturn32view0 |
| `https://raw.githubusercontent.com/BigBitsIO/TradingView/master/Volume%20Effectiveness%20%5BBigBitsIO%5D` | code (Pine) | unspecified in file/repo page scrape | volume-normalized price-change feature | none (feature only) | **high** technically | Simple feature: ((close/open − 1) * 100)/volume with optional absolute value, plus smoothing MA options—useful primitive for “effort → result” style scoring. citeturn14view2 | License unclear; treat as reference, not copy-paste; feature is simplistic (sensitive to splits, gaps, and low volume). citeturn14view2 |
| `https://www.scribd.com/document/545608892/VPA-Analysis-Pinescript-R1` | code (Pine, embedded) | unspecified | VSA rule-set with many labeled signals | Upthrust variants, no demand/supply, tests, effort up/down, buying climax, etc. | **medium** (code fragments visible; provenance unclear) | Rich set of concrete VSA-style bar definitions using volume vs SMA, spread vs average, close-location (top/mid/bottom), and local extrema tests—useful for building event detectors feeding Wyckoff phases. citeturn31view0 | Provenance/license unclear; complexity + many conditions can be fragile; may embed implicit lookahead via `highest()`/`lowest()` windows if not handled carefully. citeturn31view0 |
| `https://raw.githubusercontent.com/HenilMistr/Maket_regime_classifier/main/index.py` | code (Python) | unspecified | pure regime classifier (Bull/Bear/Sideways) | none (regime only) | **high** | Very explicit deterministic regime labeling by MA20−MA50 difference vs threshold proportional to price; includes signal shift to reduce lookahead in strategy application. citeturn30view0 | Not Wyckoff; threshold logic is simplistic and can misclassify long consolidations; license not explicit. citeturn30view0 |
| `https://github.com/LSEG-API-Samples/Article.RD.Python.MarketRegimeDetectionUsingStatisticalAndMLBasedApproaches` | code/notebook + article | unspecified in repo page scrape (developer-article style) | statistical/ML regime inference (HMM, k-means, GMM) | none (regime only) | **medium** (code exists but depends on data access) | Shows multiple regime-detection approaches (Gaussian HMM, clustering, GMM) for “growth vs crash” regime identification and strategy evaluation framing. citeturn24view3 | Not deterministic unless you lock seeds + versions; requires Refinitiv data access; not Wyckoff-specific. citeturn24view3 |

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["Wyckoff accumulation schematic phases A B C D E diagram","Wyckoff distribution schematic phases A B C D E diagram","Wyckoff spring upthrust SOS SOW LPS LPSY schematic chart"]}

## Implementation families and anti-leakage patterns

Three implementation families show up repeatedly across the surveyed sources, and each has distinct determinism and leakage implications.

**Full event-driven state machine (schematic A–E).**  
This family explicitly models a finite state machine over Wyckoff events and phases. The *best* references here (for design, not reproducibility) are the closed-source TradingView indicators that describe phase/event progressions and reset policies. The “Wyckoff Institutional Engine v4.0” page is unusually explicit that it maintains persistent state across bars, tracks trading range boundaries, enumerates detection criteria per phase, and includes a reset when price moves too far beyond the range while still in early phases (A–C). citeturn10view0 The FibAlgo indicator description similarly describes sequential event detection, trend assessment via dual SMA crossover, and event confirmations using volume/spread/close-position rules; it also emphasizes keeping “reference levels” for spring/upthrust stable rather than drifting with later range expansion—a key detail for determinism. citeturn2view1turn20search11  
**Tradeoff:** high conceptual alignment to Wyckoff, but implementations tend to be complex, parameter-heavy, and often closed. Your module must therefore treat these as design inspiration and implement a simpler, auditable version.

**Hybrid event + regime classifier (common in open code).**  
A representative pattern is: (a) detect “sideways vs trending” regime, (b) within sideways periods, detect pivot-based events (SC/AR/ST/BC, etc.), (c) label boxes/segments as accumulation/distribution and infer some events like spring/UTAD from oscillators. The `AIO: Wyckoff + VWMA + Liquidity` code block explicitly implements a Wyckoff section sourced from “faytterro” and uses RSI thresholds around 50 ± sensitivity to define `side`, `bull`, `bear`; it constructs a range box by taking max high / min low over the sideways run and emits events off pivot confirmation and RSI-at-pivot thresholds. citeturn21view0turn20search0  
**Tradeoff:** implementable and portable, but these hybrids often redefine Wyckoff primarily as “RSI regime + pivots,” which can be acceptable for deterministic segmentation, but you must be honest about what is and is not “classic Wyckoff.”

**Pure regime classifier (accumulation/markup/distribution/markdown or Bull/Bear/Sideways).**  
This family does not attempt to label SC/AR/ST/Spring/etc. It labels broad regimes using moving averages, volatility, and trend metrics. The `Maket_regime_classifier` script provides a minimal deterministic example: it labels Bull/Bear/Sideways via MA20−MA50 relative to a price-scaled threshold, then (importantly) shifts signal by 1 bar for strategy evaluation to limit lookahead in trading rules. citeturn30view0 More advanced “regime detection” notebooks (e.g., Gaussian HMM / clustering) exist, but they are typically non-deterministic unless seeds and numerical environments are locked, and they aren’t schematic Wyckoff. citeturn24view3  
**Tradeoff:** robust and cheap, but no schematic history; better as a fallback “cycle phase” (accum/markup/dist/markdown) when schematic confidence is low.

### How real implementations avoid hindsight leakage

Across surveyed sources, the recurring anti-hindsight / anti-repaint tactics are:

- **Pivot confirmation delay (explicit or implicit).** The RSI+pivot Wyckoff code uses pivot functions with symmetric left/right lengths and applies an offset so the label appears at the pivot bar, but the signal can only be known after the right-side bars exist. That is “minimal repainting” *only if your engine records detection time and does not pretend it knew earlier.* citeturn21view0turn20search0  
- **Sequence confirmation before signaling.** The invite-only “Wyckoff VSA Day Trader” description (not reproducible) spells out a design principle worth reusing: a climax bar is “an alert, not a trade,” and only a completed sequence (climax → automatic reaction/rally → secondary test) produces an actionable inference. citeturn10view1 A deterministic engine can carry this principle without using that code.
- **“Wait for next candle” confirmation in VSA.** The MT5 VSA README repeatedly insists on confirmation in subsequent candles and defines signals with explicit volume-vs-average thresholds; this is a simple but effective leakage control because the signal is defined on bar close and confirmed with future reaction. citeturn32view0  
- **Phase reset / invalidation policies.** The Wyckoff Institutional Engine page describes resetting if price moves > 3×ATR beyond the trading range while still in phases A–C, which is essentially a deterministic invalidation against stale, hindsight-fitted phases. citeturn10view0 The FibAlgo description similarly mentions automatic invalidation when a schematic fails to progress (e.g., no AR within a window, or inactivity). citeturn2view1turn20search11

## Recommended deterministic design for vibe-investor

This blueprint is designed to be *code-portable* (Python/TS/Rust), *OHLCV-only*, and *deterministic*, while still supporting both (1) a schematic-like Wyckoff phase A–E label when evidence is strong and (2) a broader cycle regime when evidence is weak.

### Core design choice: a two-layer model

Layer one is **cycle regime** (always available): `accumulation / markup / distribution / markdown`.  
Layer two is **schematic phase** (optional when range evidence exists): `accum|dist` × `A–E`.

This mirrors what many real implementations do: they explicitly maintain both a trading-range context and a broader “pattern” or “phase” readout, sometimes with probabilities. citeturn10view0turn2view1turn24view3

### Deterministic event detectors from OHLCV

Implement event detectors as pure functions from rolling OHLCV features, then feed them into a finite state machine that emits segments. The key is to pick **auditable definitions** that are compatible with OHLCV and robust to noise.

Recommended feature set (all OHLCV-only, standard, and reproducible):

- **ATR / normalized spread:** ATR(14) and `spread = high−low`, with `norm_spread = spread / ATR`. This is used both in VSA-style logic and in schematic criteria descriptions (wide spread vs narrow spread). citeturn17view0turn10view0turn2view1  
- **Relative volume:** `rel_vol = volume / SMA(volume, 20)` or `/median(volume, N)`; median is more robust (used in VSAIndicator). citeturn17view0turn2view1turn32view0  
- **Close location value (CLV):** `clv = (close−low)/(high−low)` (handle zero spread); used widely in bar-close positioning rules and VSA descriptions. citeturn10view0turn32view0turn31view0  
- **Trend precondition:** simple MA slope/crossover or ADX gate. FibAlgo explicitly uses dual SMA crossover to decide whether to search for accumulation vs distribution. citeturn2view1turn20search11  
- **Effort-vs-result anomaly score:** implement `range_dev` from `VSAIndicator` (rolling regression of normalized range vs normalized volume) as a continuous score you can plug into confidence. citeturn17view0  
- **Break acceptance / rejection:** multi-bar acceptance beyond a boundary (e.g., require `k_accept` closes outside range + no immediate reversal). This matches multiple described anti-noise mechanisms (multi-bar acceptance, retest requirements). citeturn9search3turn10view0turn24view0

### Event definitions and thresholds (defaults)

Below are defaults suitable for daily bars, with a deterministic policy for intraday (60m) use: only use **fully closed** 60m bars up to the last completed daily bar, and only as *confirmation votes*, never as earlier “oracle” knowledge.

**Climax candidates (SC/BC):**  
Use a *composite threshold* that blends: (a) relative volume, (b) normalized spread, (c) location at swing extreme, (d) exhaustion/absorption signature.

- Candidate SC when:
  - prior trend is down (MA slope negative or price below MA), citeturn2view1turn20search13  
  - `rel_vol >= vol_climax_mult` (start with 1.8–2.5), citeturn2view1turn32view0  
  - `norm_spread >= spread_climax_mult` (start ~1.2–1.8), citeturn2view1turn10view0  
  - bar is at/near a rolling swing low (deterministically defined as “lowest low in last L bars” without future bars), citeturn20search13  
  - absorption bias: either (i) close recovers into upper half (`clv >= 0.6`) consistent with “absorption signature” descriptions, or (ii) allow a “capitulation close” variant (`clv <= 0.3`) but with a strong rebound bar soon after; note implementations differ here, so treat this as configurable. citeturn2view1turn10view0turn20search13  

- Candidate BC is symmetric in uptrend:
  - prior trend up, citeturn2view1turn20search13  
  - `rel_vol` and `norm_spread` high, citeturn2view1turn32view0  
  - near rolling swing high, citeturn20search13  
  - distribution bias: weak close (`clv <= 0.4`) is consistent with “supply overcoming demand” signatures. citeturn2view1turn32view0  

**Automatic Rally/Reaction (AR):**  
Once SC/BC candidate is set, look for the first strong counter-move within a bounded window, echoing the “within 3–15 bars” criterion described in one state-machine reference. citeturn10view0

- AR after SC: within `ar_window=[3,15]` bars, find a bar (or short run) that:
  - makes a meaningful bounce from the SC area (e.g., close above `SC_close + ar_atr_mult*ATR`), and
  - has bullish close (`clv >= 0.6`) and improving spread/volume profile. citeturn10view0turn2view1turn20search13  
- AR after BC (automatic reaction): symmetric bearish move.

Set **trading range boundaries** deterministically as:

- `range_low = min(SC_low, ST_low_candidate_low)` for accumulation, and
- `range_high = AR_high` (or a smoothed high), consistent with foundational descriptions that define the accumulation TR between SC low and AR high. citeturn20search13turn10view0

**Secondary Test (ST):**  
Define ST as a revisit near the SC/BC zone with reduced effort and less spread. FibAlgo explicitly compares volume and spread to the climax bar; the v4 engine also describes “return to SC area on reduced volume,” with wick/body clues. citeturn2view1turn10view0

- ST near SC: price revisits within `st_proximity = max(0.5*ATR, 0.02*range_height)` of `SC_low`, with:
  - `rel_vol` lower than at SC (e.g., `rel_vol <= rel_vol_sc * 0.8`), and
  - `norm_spread` smaller than SC spread (e.g., `<= 0.8 * norm_spread_sc`), and
  - evidence of rejection (long lower wick or close recovers in bar; use CLV and wick ratios). citeturn2view1turn10view0turn31view0

**Spring / UTAD:**  
A Spring is a false breakdown below support followed by rapid reclaim; UTAD is the mirror above resistance followed by failure back into range. Both Binance’s educational definition and indicator descriptions converge on the “break then close back inside” shape. citeturn20search13turn10view0turn2view1

- Spring candidate: low breaks below `range_low − spring_buffer` but close returns inside (`close >= range_low`), with moderate volume (often not highest) and improving CLV. citeturn10view0turn20search13  
- UTAD candidate: symmetric above `range_high + buffer` then close back below `range_high`. citeturn10view0turn20search13  

**SOS/SOW and LPS/LPSY:**  
Educational sources and schematic descriptions treat SOS/SOW as decisive moves away from the range and LPS/LPSY as subsequent pullbacks that hold (often on reduced volume). citeturn20search8turn10view0turn2view1

Implement (deterministically) as:

- SOS: close outside range high with acceptance (e.g., `k_accept=2` closes outside) plus strong bar (CLV high) and elevated `rel_vol`. citeturn10view0turn2view1  
- LPS: after SOS, a pullback that stays above a “creek” / breakout level, with declining `rel_vol` and reduced spread. citeturn20search8turn2view1  
- SOW/LPSY symmetric to downside.

### State machine: explicit transitions and invalidations

Implement a finite state machine where each “active schematic” holds an internal context:

- `mode`: `accumulation` or `distribution`
- anchor events and levels: `climax_bar`, `AR_bar`, `range_low`, `range_high`
- phase: A–E
- `event_log` with timestamps (and optionally `confirmed_at`)

Transitions (accumulation skeleton):

- `SEARCH` → `A` when SC+AR confirmed
- `A` → `B` when ST confirmed (or multiple ST-like revisits)
- `B` → `C` when Spring confirmed (or “test” variant)
- `C` → `D` when SOS confirmed
- `D` → `E` when LPS confirmed and trend continuation persists (or breakout “JAC” style criterion)
- `E` terminates the schematic once markup is established (or transitions into re-accumulation detection as a new schematic context)

Distribution skeleton mirrors it with BC/AR/ST/UTAD/SOW/LPSY. citeturn10view0turn2view1turn20search13turn20search8

Invalidation (hard deterministic rules):

- **Early-phase range failure:** if in phases A–C and price closes beyond range by more than `invalidate_atr_mult * ATR` for `k_inval` bars (e.g., 3×ATR logic is explicitly described in one engine), reset/close schematic as invalid. citeturn10view0  
- **Timeout:** if AR not found within `ar_window_max`, invalidate the prospective schematic (FibAlgo mentions invalidation for lack of progression). citeturn2view1turn20search11  
- **Contradictory event:** e.g., in accumulation mode, if a UTAD-like failure above range becomes dominant before SOS, mark as “distribution takeover” and either abort or branch into distribution detection, but do so via explicit deterministic tie-break rules (e.g., pick the mode with higher evidence score over last M bars).

### Confidence and maturity scoring

Reproducible implementations often expose a single “confidence” or probability score for the current schematic read. citeturn10view0turn2view1turn24view3 Your engine can do this deterministically with a transparent weighted score:

- **Event completeness component (0–1):** fraction of expected phase events observed in-order (e.g., A requires SC+AR; B adds ST; C adds Spring/UTAD; D adds SOS/SOW+LPS/LPSY; E confirms breakout/markdown). citeturn10view0turn2view1turn20search13  
- **Range quality component:** number of touches near boundaries, average rejection strength (wick ratio), low volatility/BBW during B, and acceptance width. citeturn2view1turn24view0  
- **Effort-vs-result component:** aggregate of VSA anomaly scores around key events (e.g., SC should look like “high effort, diminishing downside progress” / absorption). citeturn17view0turn32view0turn31view0  
- **Noise penalty:** penalize high ADX/volatility during the supposed “range building” phases; penalize frequent boundary violations without follow-through (chop). citeturn24view0turn24view3  

Define:

- `wyckoff_current_confidence`: normalized 0–1 (or 0–100%), derived from weighted sum.
- `wyckoff_current_maturity`: how far the *current* phase has progressed toward its next transition, e.g., in phase B maturity increases with each confirmed ST/test that stays within the TR and shows decreasing volume/spread; in phase D maturity increases with successful LPS and higher highs/lows. This “phase progress” concept is explicitly surfaced by some engines as a progress bar. citeturn10view0

## Proposed output schema

This schema is intentionally separate from `ta_context` and should be emitted by a standalone `wyckoff_state` module. The fields match your required deliverables, with one recommended (optional) addition to preserve non-repainting integrity.

**Top-level output**

- `current_wyckoff_phase`: string, e.g., `"accumulation:A"`, `"distribution:C"`, or `"none"`.
- `current_cycle_phase`: one of `accumulation | markup | distribution | markdown | unknown`.
- `wyckoff_current_confidence`: float in `[0,1]`.
- `wyckoff_current_maturity`: float in `[0,1]`.
- `wyckoff_history[]`: list of segment objects.

**Segment object (`wyckoff_history[]`)**

- `start_index`, `end_index`: integer bar indices in the analyzed timeframe.
- `start_date`, `end_date`: ISO date/time strings aligned to bar closes.
- `phase_label`: string (e.g., `"accumulation:B"`, `"markdown"`).
- `trigger_events`: array of event objects or compact strings; minimally include event name + index/date.
- `confidence`: float `[0,1]` representing confidence *for that segment* (can be “snapshot at end” or mean).
- `invalidation_reason`: nullable string; set when a segment/schematic is terminated by explicit invalidation rules (ATR escape, timeout, contradictory takeover, missing confirmations).

**Strongly recommended optional field (for non-repainting policy)**

- `trigger_events[].confirmed_at_index` (and/or `confirmed_at_date`): the bar index/date when the engine first became allowed to know this event (e.g., pivot-based detections). This preserves honest walk-forward labeling while still letting you annotate the event at its “event time.” This pattern is directly motivated by pivot-confirmation approaches and “minimal repaint” claims. citeturn20search0turn21view0

## Validation strategy and end-to-end pseudocode

### Validation strategy

**Consistency tests (determinism & prefix invariance).**  
Run the engine on `data[:t]` for many t and ensure:

- `wyckoff_history` for bars ≤ t is identical when re-running on `data[:t+Δ]`, except for the “open” last segment whose `end_index` extends.
- Confidence/maturity at time t match between incremental and full-batch runs. This is the key guardrail against hidden lookahead.

**Event precision/recall proxy tests (without human labels).**  
Since Wyckoff has no canonical ground truth, use *proxy* event definitions to test that your detectors behave sensibly:

- For Spring proxy: “break below range_low by buffer then close back above within N bars” and check whether your Spring detector fires within allowed confirmation delays. This mirrors educational definitions and indicator criteria. citeturn20search13turn10view0  
- For Climax proxy: large `rel_vol` + large `norm_spread` at local extreme; verify your SC/BC detectors rank these higher than median bars. This aligns with several VSA and schematic descriptions. citeturn32view0turn2view1turn10view0  

**Regime transition sanity checks.**  

- Enforce that phases progress in order (A→B→C→D→E) within a schematic unless invalidated; never jump A→D without intermediate confirmations.
- Enforce mutual exclusivity between accumulation schematic and distribution schematic within one active context unless an explicit “mode switch” is triggered with recorded reason.

**Walk-forward/backtest labeling integrity checks.**  

- If you use pivot-based logic at all, assert that any event timestamp < confirmed_at_timestamp, and that the engine does not emit a state transition dependent on that event before confirmed_at. This is the “no hindsight leakage” contract. citeturn21view0turn20search0  
- Snapshot `current_*` for each bar in a walk-forward loop; ensure the time series of states is reproducible and does not change retroactively beyond your explicit confirmation delay.

### End-to-end pseudocode

```text
CONFIG DEFAULTS (daily)
  atr_len = 14
  vol_ma_len = 20
  trend_ma_fast = 20
  trend_ma_slow = 50

  vol_climax_mult = 2.0
  spread_climax_mult = 1.5
  ar_window_min = 3
  ar_window_max = 15
  st_vol_frac_max = 0.8
  st_spread_frac_max = 0.8

  range_buffer_atr = 0.3
  accept_k = 2
  invalidate_atr_mult = 3.0
  invalidate_k = 2
  timeout_bars = 120   # how long we allow a schematic to stall

DATA STRUCTURES
  Event:
    name
    event_index
    event_time
    confirmed_at_index   # optional but recommended
    meta {score, levels...}

  Segment:
    start_index, end_index
    start_time, end_time
    phase_label
    trigger_events[]
    confidence
    invalidation_reason

  WyckoffContext (one active schematic or none):
    mode: "accumulation" | "distribution" | "none"
    phase: "A".."E" | "none"
    start_index
    last_update_index
    sc_index, bc_index
    ar_index
    st_indices[]
    range_low, range_high
    event_log[]
    bars_since_last_event

ALGORITHM OVERVIEW
  inputs: ohlcv_daily, ohlcv_60m (optional), asof_index
  outputs: current_wyckoff_phase, current_cycle_phase, confidence, maturity, history segments

STEP 1: PRECOMPUTE FEATURES (up to asof_index)
  atr[i] = ATR(ohlcv, atr_len)
  rel_vol[i] = volume[i] / SMA(volume, vol_ma_len) or / rolling_median(volume, vol_ma_len)
  spread[i] = high[i] - low[i]
  norm_spread[i] = spread[i] / atr[i]
  clv[i] = (close[i]-low[i]) / max(spread[i], epsilon)

  trend_fast[i] = SMA(close, trend_ma_fast)
  trend_slow[i] = SMA(close, trend_ma_slow)
  trend_dir[i] = sign(trend_fast[i] - trend_slow[i])   # +1 up, -1 down, 0 flat

  effort_result_score[i] = VSAIndicator_like_score(ohlcv, window=N)  # optional enhancement

STEP 2: RANGE DETECTION (deterministic, no pivots required)
  If no active schematic:
    detect candidate trend termination zone using:
      - trend_dir negative (seek accumulation) or positive (seek distribution)
      - large rel_vol and large norm_spread at local extreme within last L bars
    if found:
      open a new context with mode based on trend_dir and event type (SC/BC candidate)
      store sc_index or bc_index
      phase = "A"
      start_index = i

  If active schematic and phase in A/B/C:
    maintain range_low/range_high from detected anchors:
      - for accumulation: range_low starts at SC low; range_high set when AR found
      - for distribution: range_high starts at BC high; range_low set when AR/DAR found
    apply a buffer:
      buffered_low = range_low - range_buffer_atr * atr[i]
      buffered_high = range_high + range_buffer_atr * atr[i]

STEP 3: EVENT DETECTION (bar-by-bar, uses ONLY bars <= i)
  Define helper predicates:

  is_climax_down(i):
    return trend_dir[i-1] < 0 AND rel_vol[i] >= vol_climax_mult AND norm_spread[i] >= spread_climax_mult
           AND low[i] == min(low[i-L+1 .. i])  # local extreme
           AND clv[i] >= 0.6   # absorption variant; make configurable

  is_climax_up(i):
    symmetric for BC (trend_dir>0, high is max, clv <= 0.4)

  is_AR_after_SC(i):
    return context.sc_index exists AND i - sc_index in [ar_window_min, ar_window_max]
           AND close[i] >= close[sc_index] + 1.0*atr[i]  # threshold configurable
           AND clv[i] >= 0.6

  is_ST_near_SC(i):
    return context.sc_index exists AND abs(low[i] - low[sc_index]) <= st_proximity(i)
           AND rel_vol[i] <= rel_vol[sc_index] * st_vol_frac_max
           AND norm_spread[i] <= norm_spread[sc_index] * st_spread_frac_max
           AND clv[i] >= 0.5  # shows recovery

  is_spring(i):
    return context.phase in {"B","C"} AND low[i] < buffered_low
           AND close[i] >= context.range_low
           AND accept_reclaim_within_N_bars(i)  # deterministic: check i and next N bars only if asof allows

  is_utad(i):
    symmetric above buffered_high then close back in range

  is_SOS(i):
    return context.phase in {"C","D"} AND close[i] > buffered_high
           AND close[i-1] > buffered_high  # accept_k = 2
           AND rel_vol[i] >= 1.2

  is_LPS(i):
    return context.phase == "D" AND pullback_detected(i) AND low[i] > context.range_high - buffer
           AND rel_vol[i] < SMA(rel_vol, M)  # diminishing volume

  Similar predicates for distribution: BC, AR (reaction), ST, UTAD, SOW, LPSY.

  On each bar i:
    if no context:
      maybe start context with SC/BC.
    else:
      update bars_since_last_event
      if phase A and AR detected: set range boundary, log event, phase = "A" (still) then allow transition to B once ST appears.
      if phase A and ST detected: log ST, phase = "B"
      if phase B and spring/utad detected: log, phase = "C"
      if phase C and SOS/SOW detected: log, phase = "D"
      if phase D and LPS/LPSY detected: log, phase = "E" (trend established)

STEP 4: PHASE TRANSITION + INVALIDATION
  Invalidation checks each bar:
    if phase in A/B/C:
      if close[i] > range_high + invalidate_atr_mult*atr[i] OR close[i] < range_low - invalidate_atr_mult*atr[i]
         for invalidate_k consecutive closes:
           close schematic as invalid, emit segment with invalidation_reason="atr_escape"
           reset context to none
    if bars_since_last_event > timeout_bars:
      invalidate with reason="timeout_no_progress"

STEP 5: CONFIDENCE + MATURITY SCORING
  confidence = weighted_sum(
     event_completeness,
     range_quality,
     effort_result_alignment,
     noise_penalty (subtract)
  ) clamped to [0,1]

  maturity:
    if phase in A: maturity grows after AR is found and range boundaries stabilize
    if phase in B: grows with each ST/test that respects boundaries and shows declining rel_vol/norm_spread
    if phase in C: grows after spring/utad and successful reclaim/acceptance
    if phase in D: grows after SOS/SOW and successful LPS/LPSY
    if phase in E: grows with trend persistence (e.g., MA slope and higher highs/lower lows)

STEP 6: HISTORY SEGMENT EMISSION
  Maintain current segment = (phase_label, start_index)
  When phase_label changes OR schematic invalidates:
     finalize previous segment with end_index = i-1
     attach trigger_events that occurred within this segment
     store segment.confidence as last computed (or average)
     open a new segment at i with new phase_label

  current_wyckoff_phase is context.mode + ":" + context.phase (or "none")
  current_cycle_phase:
     if context.mode=="accumulation" and phase in A/B/C -> "accumulation"
     if context.mode=="accumulation" and phase in D/E -> "markup"
     if context.mode=="distribution" and phase in A/B/C -> "distribution"
     if context.mode=="distribution" and phase in D/E -> "markdown"
     else fallback to pure regime classifier if no context
```

This pseudocode intentionally makes all “future knowledge” explicit. If you introduce pivot-based detection (like the RSI+pivot implementations), the deterministic way to do it is:

- detect pivot at bar `i` only when `i + pivot_right <= asof_index`,
- record `event_index = i` but `confirmed_at_index = i + pivot_right`,
- forbid state transitions that would require that pivot before `confirmed_at_index`. citeturn21view0turn20search0
