# Enums And Glossary

## Objective

Single source of truth for shared statuses and labels used across portfolio-management references and memory file templates.

## Stock Categories

- `CORE`: large-cap blue chip, wealth preservation, dividends
- `VALUE`: mid-cap, consistent growth, moderate risk
- `GROWTH`: high upside, high volatility, limited allocation
- `SPECULATIVE`: high-risk, thesis-driven, max 10% total

## Watchlist Status

- `WATCHING`: thesis interesting but not actionable yet
- `READY`: trigger conditions are close
- `ACTIVE`: triggered and position is open
- `REMOVED`: thesis broken or better option available

## Conviction

- `HIGH`
- `MEDIUM`
- `LOW`

## Fundamental Valuation

- `UNDERVALUED`
- `FAIR`
- `OVERVALUED`

## Correlation Role

- `DIVERSIFIER`: corr < 0.40 with major holdings
- `NEUTRAL`: corr 0.40-0.75
- `CONCENTRATOR`: corr > 0.75

## Timeframe

- `SWING`: days to weeks
- `POSITION`: weeks to months
- `LONG_TERM`: months to years

## Regime Gate

- `PASS`: market structure constructive, leaders intact
- `FAIL`: broad weakness, leader breakdowns clustering

## Portfolio Health Flags

- `PM-W01` Single position exceeds 30% weight — severity: `HIGH`, source: deterministic (tool data)
- `PM-W02` Speculative allocation exceeds 10% — severity: `HIGH`, source: deterministic
- `PM-W03` Less than 50% in MoS >30% positions — severity: `MEDIUM`, source: deterministic
- `PM-W04` Sector limit breached (>2 per sector) — severity: `MEDIUM`, source: deterministic
- `PM-W05` Portfolio heat exceeds 6% — severity: `HIGH`, source: deterministic
- `PM-W06` Correlation clustering (corr >0.75 between large holdings) — severity: `MEDIUM`, source: deterministic
- `PM-W07` Position size exceeds 5% of ADTV — severity: `HIGH`, source: deterministic
- `PM-W08` Portfolio flat/red while IHSG at new highs — severity: `HIGH`, source: agent judgment
- `PM-W09` Multiple leaders invalidated in same review window — severity: `HIGH`, source: agent judgment
- `PM-W10` Thesis stale (no review within cadence) — severity: `MEDIUM`, source: deterministic (date check)
