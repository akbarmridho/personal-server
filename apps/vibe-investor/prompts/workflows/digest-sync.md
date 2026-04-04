# Digest Sync Workflow

Resolve the effective `TRADING_DAY` and review mode in WIB using the parent prompt's trading-day clock, then run `digest-sync`.

Command input may narrow the thesis/watchlist sync scope or add output emphasis if that remains compatible with this contract.

## Contract

- Purpose: update thesis/watchlist memory from the latest digest.
- Always consume the latest `memory/digests/*_news_digest.md`. Stop and report if the digest artifact is missing.
- Read the latest successful `news-digest` run log and inherit its `window_from` and `window_to`.
- Update `memory/theses/{THESIS_ID}/thesis.md` only for evidence-backed timeline changes and scenario-branch updates.
- Update `memory/symbols/{SYMBOL}/plan.md` only for explicit evidence-backed status or trigger changes.
- If evidence is ambiguous, stop and report `Needs Verification`; do not change thesis/watchlist state.
- Link memory changes to the digest path and supporting document URLs.
