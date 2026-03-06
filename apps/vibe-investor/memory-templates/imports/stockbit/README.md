# Stockbit Raw Imports

Raw imported Stockbit payloads live here.

Suggested structure:

- `imports/stockbit/portfolio/YYYY-MM-DD/HHMMSS.json`
- `imports/stockbit/history/YYYY-MM-DD/HHMMSS_page-N.json`
- `imports/stockbit/manifests/YYYY-MM-DD/HHMMSS.json`

These files are for audit, replay, and debugging.

Normal workflows should prefer:

- `notes/portfolio_inputs/*.json`
- `portfolio/trade_events/*.jsonl`
- `portfolio/derived/latest.json`
