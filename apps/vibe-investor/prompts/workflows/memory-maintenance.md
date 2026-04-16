# Memory Maintenance Workflow

Housekeeping workflow for memory hygiene. Run occasionally to fix drift between prompt contracts and memory state.

Command input may narrow scope to specific areas (e.g., `symbols only`, `theses only`, `cleanup only`).

## Contract

- Purpose: audit memory files for structural correctness and align memory state with current prompt and skill contracts.
- This workflow reads and fixes. It does not run analysis, fetch market data, or produce investment conclusions.
- Do not archive or delete symbol directories, thesis directories, or digest files. Those are retained indefinitely regardless of age or status.
- Only archive content within active symbol `plan.md` files that references removed prompt concepts (composite scores, action tiers, WAIT loops). Artifact files (`technical.md`, `flow.md`, etc.) stay where they are.

## Checks

Run all checks unless command input narrows scope.

### 1. Frontmatter schema compliance

- Load all symbol plans and thesis files from `get_state` output.
- For each symbol plan, verify frontmatter matches the contract in `memory/symbols/README.md`: required fields `id`, `watchlist_status`, `trade_classification`, `thesis_id`, `last_reviewed`. Remove legacy fields (`scope`, `symbol`, `holding_mode`, `leader`, `tags`, `next_review`, or any field not in the current schema). Add missing fields with sensible defaults and flag them in the report.
- For each thesis file, verify frontmatter matches the contract in `memory/theses/README.md`: required fields `id`, `title`, `type`, `parent_thesis_id`, `status`, `symbols`, `last_updated`. Remove legacy fields (`scope`, `tags`, or any field not in the current schema). Same cleanup rules.
- Fix files in place. Report what was changed.

### 2. Orphan and consistency checks

- Symbols referencing a `thesis_id` that doesn't exist as a thesis file → flag.
- Thesis files listing symbols that don't have a corresponding `memory/symbols/{SYMBOL}/plan.md` → flag.
- Symbol plans with `watchlist_status: ACTIVE` but no matching holding in `portfolio_state` → flag.
- Symbols in `portfolio_state` but `watchlist_status` is not `ACTIVE` → flag and fix to `ACTIVE`.

### 3. Content cleanup

For each symbol `plan.md`:

- If body content references removed prompt concepts (composite scores, action tiers, WAIT loops, or any contract that no longer exists), clean those sections in place.

For each active thesis file:

- If body content references removed prompt concepts, clean in place.

### 4. Review staleness and inactive resurfacing

- Use the computed `review_stale` and `days_since_review` fields from `get_state` output.
- Symbols with `review_stale: true` → list with days since last review.
- Thesis files with `review_stale: true` → flag.
- `WATCHING` symbols without a matching holding in `portfolio_state`: do a lightweight check via `list-documents` for recent news or filings mentioning these symbols in the last 30 days. If material documents exist, flag the symbol as worth revisiting with a one-line summary of what was found.
- `SHELVED` and `ARCHIVED` symbols: same lightweight check. If material documents exist, flag as worth promoting to `WATCHING`.
- Symbols with `watchlist_status` values not in `{ARCHIVED, SHELVED, WATCHING, READY, ACTIVE}` (e.g., legacy `EXPLORED`, `REMOVED`) → migrate to `ARCHIVED` or `WATCHING` based on whether the name has an active thesis or trigger.

### 5. Artifact completeness

- For each non-`ARCHIVED` and non-`SHELVED` symbol, check that all required artifacts exist: `plan.md`, `technical.md`, `flow.md`, `narrative.md`, `fundamental.md`, `*_ta_context.json`, `*_flow_context.json`, chart PNGs.
- Any symbol missing artifacts → flag `PM-W12` with the missing files listed.
- Report a summary table of artifact gaps.

### 6. Work folder cleanup

- List all files under `work/`.
- Delete everything in `work/`. This folder is disposable scratch by definition.

## Output

Report findings directly in the chat response. Do not write a maintenance report file to memory.

Cover:

- Files fixed (frontmatter corrections, legacy field removals, stale concept cleanup).
- Orphans and inconsistencies found.
- Review overdue: symbols and theses past their review dates.
- Resurfaced: inactive/dormant symbols with recent interesting documents worth revisiting.
- Work folder: what was deleted.
- Summary: overall memory health assessment in 2-3 sentences.
