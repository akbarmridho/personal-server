# Technical Analysis Implementation State

## Snapshot

- Date: `2026-03-15`
- Scope: `apps/vibe-investor/.opencode-config/skills/technical-analysis`
- Status: live TA pipeline is in place; remaining work is backtest realism and replay implementation

## Remaining Work

### 1. Lock baseline execution semantics

Still needed:

- exact entry timing
- exact stop and target execution assumptions
- stale-expiry behavior
- whether each baseline is daily-only or may use `15m` timing

### 2. Define corporate-action-aware backtest behavior

Still needed:

- required `corp_actions[]` handling for backtests
- replay behavior around splits and ex-dividend windows
- return and invalidation treatment across event windows

### 3. Start the backtest engine

Still needed:

- rule replay engine
- execution assumptions tied to IDX mechanics
- baseline comparison harness
- doctrine audit metrics

## Constraints

- do not re-expand the live TA doctrine stack while backtest prerequisites remain open
- keep replay and execution realism in the backtest layer, not in prompt bloat
- treat raw `1m` plus derived `15m` as the current intraday contract
- treat corporate-action handling as mandatory before long-window evaluation

## Active Next Step

Lock the baseline rule semantics and corporate-action replay behavior before backtest work proceeds.
