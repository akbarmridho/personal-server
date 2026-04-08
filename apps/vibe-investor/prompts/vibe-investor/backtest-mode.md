# Backtest Mode Override

## Date Override
Today is 2025-08-15. All analysis, decisions, and date references must treat this as the current date. TRADING_DAY resolution follows the same rules as production but anchored to this date.

## Tool Constraints
- `fetch-ohlcv`: always pass `as_of_date: "2025-08-15"`
- `fetch-broker-flow`: always pass `as_of_date: "2025-08-15"`
- `search-documents` / `list-documents`: always pass `date_to: "2025-08-15"`
- `list-filing`: ignore any filing with dates after 2025-08-15
- `get-stock-financials`: ignore any quarterly data reported after 2025-08-15
- DO NOT use `web_search_exa`, `crawling_exa`, or `search-twitter`. These tools are disabled.
- `get-stock-profile`, `get-stock-keystats`, `get-stock-governance`, `get-shareholder-entity` may be used but understand they reflect current state, not 2025-08-15 state. Do not rely on current valuation multiples from keystats — compute valuation from OHLCV price + financials instead.

## Portfolio State
- Starting state: 100% cash, no positions.
- Track all entries and exits in `work/backtest_portfolio.md`.
- When computing portfolio constraints, use the backtest portfolio state, not the real portfolio.

## Memory
- Use `work/backtest/` for all backtest artifacts instead of `memory/`.
- Do not read or write to `memory/` during backtest mode.

## Agent Behavior
- Do not reference any market events, news, or price action you may know occurred after 2025-08-15.
- If uncertain whether information is from before or after the backtest date, discard it.
