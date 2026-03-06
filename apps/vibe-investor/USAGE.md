# Vibe Investor Usage

Use commands in OpenCode TUI with `/command-name`.

## Main Commands

- `/desk-check`
  - Main operating routine.
  - Reviews current holdings, `READY` watchlist names, leader names, and top-down market context.
  - Uses tool-backed portfolio state plus portfolio-management, technical-analysis, and narrative-analysis internally.

- `/news-digest`
  - Reading-oriented market and thesis digest.
  - Gathers new high-signal documents since the last successful digest run.
  - Does not update thesis, watchlist, or session memory by itself.

- `/digest-sync`
  - Applies the latest digest into memory.
  - Updates thesis, watchlist, and session files only when the digest contains evidence-backed changes.

- `/ta {SYMBOL} {INTENT_IN_SENTENCE}`
  - Manual single-symbol technical workflow.
  - Use when one ticker needs focused review outside the broader routine.

Examples:

- `/ta BBCA entry on breakout above 9800, invalidate below 9500`
- `/ta TLKM thesis still intact after recent pullback?`
- `/ta ADRO exited, do postmortem and extract mistakes`

## Default Operating Flow

Regular workflow:

1. Run `/desk-check`
2. Review invalidations, flags, trigger changes, and follow-up actions
3. Run `/ta ...` only when one symbol needs deeper technical work

Research workflow:

1. Run `/news-digest`
2. Read the digest
3. Run `/digest-sync`
4. Run `/ta ...` only for symbols that need deeper chart review after the digest

## `/desk-check`

What it covers:

- current holdings from connector-owned portfolio data
- watchlist names in `READY`
- watchlist names marked as leaders
- IHSG structure/regime
- macro/news tone
- leader breadth deterioration

What it does:

- reads the latest successful `desk-check` run log for continuity
- uses current portfolio state from the portfolio tool
- runs deterministic portfolio checks through the `portfolio-management` skill
- runs technical review in `THESIS_REVIEW` mode
- runs lightweight narrative delta scan
- updates only the required memory files

What to expect:

- concise actionable output
- warnings on thesis breaks, stop-risk, sizing/concentration issues, and top-down weakness
- updated session log and run log when successful

## `/news-digest`

What it covers:

- new high-signal documents since the last successful digest
- market regime
- macro context
- thesis-relevant developments
- reading recommendations

What it does not do:

- it does not directly change thesis, watchlist, or session memory

## `/digest-sync`

What it does:

- reads the latest digest artifact
- updates thesis/watchlist/session memory only for evidence-backed changes
- records `Needs Verification` when evidence is ambiguous

Use it after:

- reading the latest digest
- deciding the digest should be reflected in memory

## `/ta`

`/ta` auto-selects mode:

- no prior saved analysis: `INITIAL`
- prior saved analysis exists: `UPDATE`
- thesis-status intent: `THESIS_REVIEW`
- lesson/mistake review after exit: `POSTMORTEM`

Default lens:

- `UNIFIED`

Use `/ta` for:

- initial chart thesis
- explicit thesis validation
- refresh on one specific symbol
- post-exit review and learning

## Portfolio And Trade Data

Portfolio state is not stored as generated workspace memory files.

Normal usage expectation:

- current holdings come from `portfolio_state`
- trade history comes from `portfolio_trade_history`
- symbol trade lifecycle review comes from `portfolio_symbol_trade_journey`

Implications:

- `/desk-check` fails fast if current normalized portfolio data is missing
- trade review and postmortem rely on normalized trade history, not manually maintained portfolio notes

## Practical Rules

- Use uppercase 4-letter symbols such as `BBCA`, `TLKM`, `ADRO`.
- Prefer `/desk-check` as the default routine instead of ad hoc portfolio review.
- Use `/news-digest` and `/digest-sync` as a pair.
- Use `/ta` only when one symbol needs deeper manual attention.
- All workflows fail fast on required dependency failures.
