# Technical Analysis Command

Resolve the effective `TRADING_DAY` and review mode in WIB using the parent prompt's trading-day clock, then run `technical-analysis` for the symbol and intent from command input.

Command input contract:

- First token is the symbol.
- Remaining text is the required user intent sentence.
- If the intent sentence is missing, fail and ask the user to provide it.
