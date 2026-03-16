# Technical Backtest TODO

## Implemented

- Daily-only window replay engine
- Scenario manifest with flat/long initial state
- Deterministic ablation policy
- 5 baseline strategies (buy_and_hold, ma_trend, trend_pullback, breakout_volume, range_reclaim)
- Static execution: next-bar-open entries, stop/target intrabar exits, stale setup expiry, same-bar ambiguity (stop wins), no same-day re-entry
- Per-scenario and batch strategy comparison
- Actual-trade comparison when provided
- Markdown report output

## Not yet implemented

### Execution realism

- ARB/ARA price-limit awareness (constrained execution recording)
- Gap-through-stop recording as constrained execution (currently fills at stop or open, no flag)
- Slippage heuristics
- Limit-constrained fill tracking in trade output

### Replay modes

- Full-vibe mode (LLM policy engine over compact state packet)
- 15m intraday replay inside daily thesis windows
- 15m liquidity gate (bar continuity, activity threshold, auction-distorted bar filtering)
- Session handling (pre-open, lunch break, pre-close, closing auction)
- Bar validity tracking (continuous-session vs auction-distorted vs structurally incomplete)

### Corporate actions

- Dividend-aware replay (ex-date gap not treated as structural break)
- Dividend event window marking in replay log

### Evaluation

- Evaluator with decision-quality metrics (false positive/negative rate, premature/late exits, thesis consistency)
- Threshold framework (minimum viable / acceptable / target bands)
- Per-step LLM reasoning log for full-vibe mode audit

### Data

- 1m OHLCV for better VPVR reconstruction
- Trade count / turnover activity data
- Session and auction metadata

### Integration

- Flow-analysis pairwise integration test
- Parent synthesis validation
- Portfolio-management integrated desk test (scope B)

### Schema

- Concrete field-level state-packet schema (currently implicit in TA context JSON)
