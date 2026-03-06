# Vibe Investor Usage (Minimal)

Use commands in OpenCode TUI with `/command-name`.

Single source of truth: `opencode-config.json`.

## Active Commands

- `/desk-check`
  - Main operator routine for holdings, `READY` watchlist names, leaders, and top-down market context.
- `/news-digest`
  - Generate a reading-oriented digest from memory plus new high-signal documents since the last successful digest.
- `/digest-sync`
  - Apply the latest digest into thesis/watchlist/session memory.
- `/ta {SYMBOL} {INTENT_IN_SENTENCE}`
  - Single technical analysis command.
  - Examples:
    - `/ta BBCA entry on breakout above 9800, invalidate below 9500`
    - `/ta TLKM thesis still intact after recent pullback?`
    - `/ta ADRO exited, do postmortem and extract mistakes`

## Technical Command Behavior

`/ta` auto-selects mode:

- Reads prior analysis for the symbol from memory automatically
- If no prior analysis in memory: INITIAL
- If prior analysis exists: UPDATE
- If intent asks thesis-status check: THESIS_REVIEW
- If intent asks lesson/mistake review after exit: POSTMORTEM

Default lens: `UNIFIED`.

## Desk Check Flow

1. Keep your latest portfolio snapshot in `memory/notes/portfolio_inputs/{DATE}.json`
2. Run `/desk-check`
3. Read the session output and act on invalidations, trigger changes, and `Needs Manual Fundamental Review` flags

## Digest Flow

1. `/news-digest`
2. Read digest
3. `/digest-sync`
4. Run `/ta ...` only when a symbol needs a manual deep dive

## Portfolio Snapshot Contract

- Until external automation exists, the canonical holdings source is the latest file in `memory/notes/portfolio_inputs/`.
- Minimal schema: `as_of`, `cash`, `positions[]` with `symbol`, `lots`, `avg`, `last`.
- If no snapshot exists, `/desk-check` fails fast.
- If the latest snapshot is stale, `/desk-check` warns but still uses it.

## Notes

- Symbols should be 4-letter uppercase (`BBCA`, `TLKM`, `ADRO`).
- Workflows should fail fast on required dependency failures.
