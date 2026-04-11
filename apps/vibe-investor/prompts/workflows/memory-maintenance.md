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
- For each symbol plan, verify frontmatter matches the contract in `memory/symbols/README.md`: required fields `id`, `watchlist_status`, `trade_classification`, `holding_mode`, `thesis_id`, `last_reviewed`, `next_review`, `leader`, `tags`. Remove legacy fields (`scope`, `symbol`, or any field not in the current schema). Add missing fields with sensible defaults and flag them in the report.
- For each thesis file, verify frontmatter matches the contract in `memory/theses/README.md`: required fields `id`, `scope: thesis`, `title`, `type`, `parent_thesis_id`, `status`, `symbols`, `last_updated`, `tags`. Same cleanup rules.
- Fix files in place. Report what was changed.

### 2. Orphan and consistency checks

- Symbols referencing a `thesis_id` that doesn't exist as a thesis file → flag.
- Thesis files listing symbols that don't have a corresponding `memory/symbols/{SYMBOL}/plan.md` → flag.
- Symbol plans with `watchlist_status: ACTIVE` but no matching holding in `portfolio_state` → flag.

### 3. Content cleanup

For each symbol `plan.md`:

- If body content references removed prompt concepts (composite scores, action tiers, WAIT loops, or any contract that no longer exists), clean those sections in place.

For each active thesis file:

- If body content references removed prompt concepts, clean in place.

### 4. Review overdue and inactive resurfacing

- Use the computed `review_overdue`, `days_overdue`, and `days_since_review` fields from `get_state` output.
- Symbols with `review_overdue: true` → list with days overdue.
- Symbols with `days_since_review > 30` → flag as stale.
- Thesis files with `review_stale: true` → flag.
- Inactive or WATCHING symbols with `holding_mode: no-position`: do a lightweight check via `list-documents` for recent news or filings mentioning these symbols in the last 30 days. If material documents exist, flag the symbol as worth revisiting with a one-line summary of what was found.

### 5. Work folder cleanup

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
