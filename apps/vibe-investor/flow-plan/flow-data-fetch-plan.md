# Flow Data Fetch And Tooling Plan

## Purpose

This document defines the raw data contract and implementation direction for the future `flow-analysis` skill.

It is intentionally narrower than the doctrine files. The goal here is to lock:

- what raw data gets fetched
- where caching lives
- where rate limiting lives
- how the backend endpoint should behave
- how `vibe-investor` should fetch the data through a custom tool

## Decisions

### 1. Canonical Raw Source

Use daily broker-summary snapshots from Stockbit `marketdetectors`:

- one request per symbol per trading day
- `transaction_type=TRANSACTION_TYPE_GROSS`
- `market_board=MARKET_BOARD_REGULER`
- `investor_type=INVESTOR_TYPE_ALL`
- `limit=25`

This is the canonical raw source for flow analysis v1.

Reason:

- `gross` is required to preserve two-way activity
- `regular` is the best proxy for normal price discovery
- `all investor` is the default whole-tape read
- one-day snapshots preserve persistence and lead-lag behavior across time

### 2. Trading Days Come From OHLCV, Not Weekday Math

Do not infer trading days from weekdays.

Use daily OHLCV to determine the actual last `N` trading sessions for a symbol.

Reason:

- weekends alone are insufficient
- IDX holidays and non-trading sessions break weekday logic
- OHLCV already gives the correct observed trading calendar per symbol

### 3. Keep The Legacy Endpoint, Add A New Raw-Series Endpoint

Keep the existing legacy `bandarmology` endpoint as-is.

Add a new orchestration endpoint for the normalized daily broker-summary series, similar in role to `chartbit/raw`.

The underlying Stockbit market-detector fetcher should be parameterized and reused by both:

- the legacy endpoint
- the new raw-series endpoint

This keeps transport logic reusable while giving flow-analysis a purpose-built raw input contract.

### 4. Default Window Policy

The source material still points to a tactical flow window of about `30 trading days`.

Use:

- default primary window: `30` trading days
- configurable fetch window: allow up to `60` trading days when explicitly requested

Reason:

- `30` trading days matches the original dashboard guidance and keeps the read current
- `60` trading days is useful as a wider context fetch when persistence or regime comparison needs more history
- do not default to a longer window unless testing shows `30` is consistently too noisy

## Backend Architecture

### Endpoint Responsibility

The HTTP endpoint should orchestrate:

1. validate symbol
2. resolve analysis window
3. fetch cached OHLCV
4. derive actual trading dates
5. fetch cached daily broker snapshots for those dates
6. return a normalized daily series

The endpoint should not own:

- Stockbit rate-limit compliance
- transport retry policy
- per-day cache mechanics

Those belong in the fetch layer.

### Fetcher Responsibility

Introduce dedicated fetchers with clear ownership:

- `getBandarDailySnapshot(...)`
- `getBandarDailySeries(...)`
- `getTradingDatesFromDailyOhlcv(...)`
- parameterized `getMarketDetector(...)`

The market-detector fetcher should own:

- Stockbit URL construction
- request normalization
- rate-limit compliance
- per-day snapshot cache lookup/fill

## Caching

### 1. Daily Broker Snapshot Cache

Use the existing `KV` abstraction in `kb-backend`.

Cache grain:

- one symbol
- one trading date
- one filter tuple

Recommended cache key dimensions:

- symbol
- date
- transaction type
- market board
- investor type
- limit
- schema version

Recommended TTL:

- longer-lived than OHLCV date-discovery cache
- safe to treat daily historical snapshots as reusable

### 2. OHLCV Cache

Also add KV caching around the daily OHLCV fetch used for trading-date discovery.

Recommended TTL:

- 30 minutes

Reason:

- the flow endpoint will hit OHLCV repeatedly
- one call determines trading days
- another existing caller may also fetch chart data
- this is cheap reuse and removes unnecessary upstream load

## Rate Limiting

### Shared Limiter

Add a shared limiter for Stockbit `marketdetectors/*` requests.

Use a conservative effective budget:

- about `80%` of the upstream allowance

Given the observed header:

- `x-rate-limit-limit: 10`

the practical target should stay below that ceiling and preserve reserve capacity.

### Placement

Place the limiter in the Stockbit market-detector fetch layer, not in the endpoint handler.

Reason:

- multiple callers should share the same compliance logic
- the endpoint should remain orchestration-only
- transport ownership stays in one place

### Behavior

Use:

- a shared in-process limiter
- conservative throughput
- explicit handling/logging for `429`

Do not make scheduling depend on `x-rate-limit-reset` alone. Treat it as advisory, not authoritative.

## Raw Response Shape

The backend should return a normalized daily series, not the original Stockbit payload.

Recommended response shape:

```json
{
  "symbol": "ANTM",
  "window": {
    "requested_trading_days": 30,
    "actual_trading_days": 30,
    "from": "2026-02-03",
    "to": "2026-03-17"
  },
  "filters": {
    "transaction_type": "gross",
    "market_board": "regular",
    "investor_type": "all",
    "limit": 25
  },
  "series": [
    {
      "date": "2026-03-17",
      "buy_rows": [
        { "broker": "CC", "value": 70300000000, "lots": 185000, "avg_price": 3801 }
      ],
      "sell_rows": [
        { "broker": "AK", "value": 111100000000, "lots": 292900, "avg_price": 3793 }
      ]
    }
  ]
}
```

Notes:

- normalize all currency values to integer rupiah
- normalize lots to integers
- preserve buy and sell sides separately
- do not collapse the raw response into net-only form

## Flow Skill Input Contract

The future `flow-analysis` skill should consume:

- normalized daily broker-summary series
- daily OHLCV

The skill should not consume:

- raw UI HTML
- broker summary tables as rendered text
- broker distribution views as first-class LLM input

Reason:

- those views are useful for human inspection
- they are not high-value prompt payloads for the model
- the model should receive distilled deterministic metrics instead

## Tooling In `vibe-investor`

Add a custom tool in `.opencode-config/tools/` similar in shape to `fetch-ohlcv`.

Recommended name:

- `fetch-broker-flow`

Recommended behavior:

- validate symbol
- validate output path
- optionally accept `as_of_date`
- optionally accept `trading_days` with default `30`
- call the new `kb-backend` endpoint
- write the normalized JSON payload to disk
- return a concise summary including date range and number of trading days

Recommended args:

- `symbol`
- `output_path`
- `as_of_date` optional
- `trading_days` optional

The tool should mirror the design of `fetch-ohlcv`:

- JSON-only output
- writes to file to avoid prompt bloat
- strict argument validation
- concise save summary

## Suggested Build Sequence

1. parameterize `kb-backend` market-detector fetcher
2. add a new raw broker-flow series endpoint
3. add OHLCV-based trading-date discovery
4. add per-day broker snapshot KV cache
5. add shared market-detector limiter
6. add short-lived OHLCV cache for the raw chart fetch path
7. add `fetch-broker-flow` tool in `vibe-investor`
8. then build deterministic flow-state extraction on top

## Non-Goals For This Slice

Do not add yet:

- foreign/domestic split as the canonical fetch
- non-regular market as the canonical fetch
- broker-summary table rendering for LLM consumption
- broker-distribution panel rendering for LLM consumption
- tick-level broker tape
- full order-book modeling

Those can remain secondary or future work.
