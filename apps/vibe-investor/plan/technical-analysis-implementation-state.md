# Technical Analysis Implementation State

## Snapshot

- Date: `2026-03-15`
- Scope: `apps/vibe-investor/.opencode-config/skills/technical-analysis`
- Status: live TA pipeline is in place; remaining work is daily-only replay implementation first, then intraday replay realism

## Remaining Work

### 1. Start the backtest engine

Still needed:

- scenario-window replay engine
- execution assumptions tied to IDX mechanics
- baseline comparison harness
- doctrine audit metrics
- daily-only state path for replay windows anchored to the user's real trades
- comparison output versus actual user trade behavior when present

Deferred for later:

- `1m -> 15m` replay integration inside trigger windows
- intraday liquidity-gate enforcement inside replay
- dividend-aware replay behavior around ex-date windows
- return and invalidation treatment across dividend event windows
- other corporate-action classes unless they become relevant to the trading universe

## Constraints

- do not re-expand the live TA doctrine stack while backtest prerequisites remain open
- keep replay and execution realism in the backtest layer, not in prompt bloat
- keep the live TA skill contract unchanged while adding an internal daily-only replay path
- if needed, add an internal script flag to skip intraday calculation during daily-only backtests
- treat raw `1m` plus derived `15m` as the current live intraday contract
- treat corporate-action handling as deferred for the first daily-only backtest pass

## Active Next Step

Start the backtest engine with scenario-window input, daily OHLCV replay, optional initial `flat` or `long` state, and no corporate-action replay layer.
