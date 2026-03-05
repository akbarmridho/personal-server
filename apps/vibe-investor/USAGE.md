# Vibe Investor Usage (Minimal)

Use commands in OpenCode TUI with `/command-name`.

Single source of truth: `opencode-config.json`.

## Active Commands

- `/weekly-narrative-digest`
  - Generate weekly digest from memory + new documents.
- `/weekly-narrative-sync`
  - Apply latest digest into thesis/watchlist/session memory.
- `/ta {SYMBOL} {INTENT_IN_SENTENCE}`
  - Single technical analysis command.
  - Examples:
    - `/ta BBCA entry on breakout above 9800, invalidate below 9500`
    - `/ta TLKM thesis still intact after recent pullback?`
    - `/ta ADRO exited, do postmortem and extract mistakes`

## Portfolio Management Commands

- `/pm-daily`
- `/pm-weekly`
- `/pm-entry {SYMBOL}`
- `/pm-add {SYMBOL} {CONTEXT}`
- `/pm-exit {SYMBOL} {REASON}`
- `/pm-rebalance`
- `/pm-watchlist {INSTRUCTIONS}`
- `/pm-validate {SYMBOL} {ENTRY} {STOP} {CAPITAL}`
- `/pm-sync {PORTFOLIO_INPUT}`

## Technical Command Behavior

`/ta` auto-selects mode:

- Reads prior analysis for the symbol from memory automatically
- If no prior analysis in memory: INITIAL
- If prior analysis exists: UPDATE
- If intent asks thesis-status check: THESIS_REVIEW
- If intent asks lesson/mistake review after exit: POSTMORTEM

Default lens: `UNIFIED`.

## Weekly Flow

1. `/weekly-narrative-digest`
2. Read digest
3. `/weekly-narrative-sync`
4. Run `/ta ...` only when chart/position decision needs refresh

## Notes

- Symbols should be 4-letter uppercase (`BBCA`, `TLKM`, `ADRO`).
- Workflows should fail fast on required dependency failures.
