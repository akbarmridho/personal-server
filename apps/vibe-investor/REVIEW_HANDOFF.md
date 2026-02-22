# Vibe Investor Review Handoff

Date: 2026-02-22

## Scope Completed

This summarizes all completed work so far for the `apps/vibe-investor` migration to command-first operations and portfolio automation v1.

## 1) Command-First Workflow (OpenCode `command` config)

Updated `opencode-config.json` to make command execution the primary usage path.

File:
- `apps/vibe-investor/opencode-config.json`

Commands currently configured:
- Technical: `ta-initial`, `ta-update`, `ta-thesis`, `ta-postmortem`, `ta-lens`
- Portfolio: `pm-daily`, `pm-weekly`, `pm-entry`, `pm-add`, `pm-exit`, `pm-rebalance`, `pm-watchlist`, `pm-validate`, `pm-sync`
- Analysis: `fund`, `narrative`, `triage`
- Weekly intelligence: `weekly-intel` (renamed from `week-dump`)

Additional PM command behavior:
- `pm-daily`, `pm-weekly`, `pm-rebalance`, `pm-validate` now instruct deterministic baseline execution via:
  - `python memory/scripts/portfolio_ops.py ...`

## 2) Usage Docs Consolidation

Removed split usage docs and replaced with command-first usage guide.

Files:
- Updated: `apps/vibe-investor/USAGE.md`
- Deleted: `apps/vibe-investor/USAGE_PORTFOLIO.md`

`USAGE.md` now includes:
- command catalog
- daily/weekly/new-position/post-trade flows
- unified "How Vibe Investor Thinks (Concepts + School Of Thought)"
- weekly intelligence command usage (`/weekly-intel`)

## 3) Skill Docs Mindset Sections (Consolidated Content)

All skill files now use one integrated section:
- `## Concepts And School Of Thought`

Files:
- `apps/vibe-investor/.opencode-config/skills/technical-analysis/SKILL.md`
- `apps/vibe-investor/.opencode-config/skills/fundamental-analysis/SKILL.md`
- `apps/vibe-investor/.opencode-config/skills/narrative-analysis/SKILL.md`
- `apps/vibe-investor/.opencode-config/skills/portfolio-management/SKILL.md`

Important:
- Content is now unified (not two separate concept/mindset bullet groups).
- Focus is on operational reasoning style, not only taxonomy.

## 4) Portfolio Automation v1 Implemented (Highest ROI first)

Implemented deterministic portfolio operations script:
- Added: `apps/vibe-investor/memory-templates/scripts/portfolio_ops.py`

Subcommands:
- `daily-check`
- `weekly-review`
- `validate-sizing`
- `rebalance-check`

Deterministic checks implemented:
- `PM-W01` single position > 30%
- `PM-W02` speculative weight > 10%
- `PM-W03` MoS>30% weight < 50%
- `PM-W04` sector count > 2
- `PM-W05` portfolio heat > 6%
- `PM-W06` correlation clustering > 0.75 for large holdings
- `PM-W07` position size > 5% ADTV

Additional outputs:
- Stop trigger detection from `stop` vs `last`
- Optional write/update:
  - `memory/notes/portfolio.md`
  - `memory/sessions/{DATE}.md`

## 5) Memory Init Wiring

Ensured the new script gets installed into workspace memory.

File:
- Updated: `apps/vibe-investor/scripts/init-memory.sh`

Change:
- Added `scripts/portfolio_ops.py` to template copy list.

## 6) Weekly Intelligence Command Added

Added command for weekly intelligence dump using documents + Exa + social rumour scan and watchlist/user notes context.

Command:
- `/weekly-intel {OPTIONAL_FOCUS}`

Behavior in template:
- Reads:
  - `memory/notes/watchlist.md`
  - `memory/notes/theses_active.md`
  - `memory/MEMORY.md`
- Uses sources:
  - documents MCP (`list-documents`/`search-documents`/`get-document`)
  - rumour scan (`search-twitter`)
  - Exa (`web_search_exa`/`crawling_exa`)
- Persists:
  - `memory/analysis/market/IDX/{TODAY}/weekly_dump.md`
  - appends actions to `memory/sessions/{TODAY}.md`

## 7) Handoff Doc Updated

Updated automation roadmap references to align with command-first approach.

File:
- Updated: `apps/vibe-investor/AUTOMATION_HANDOFF.md`

## Validation Performed

- `opencode-config.json` parsed successfully via `jq`.
- `portfolio_ops.py` passed `python3 -m py_compile`.
- Smoke tests passed for all four `portfolio_ops.py` subcommands using synthetic snapshot data.

## Current Changed Files (Working Tree)

- `apps/vibe-investor/.opencode-config/skills/fundamental-analysis/SKILL.md` (modified)
- `apps/vibe-investor/.opencode-config/skills/narrative-analysis/SKILL.md` (modified)
- `apps/vibe-investor/.opencode-config/skills/portfolio-management/SKILL.md` (modified)
- `apps/vibe-investor/.opencode-config/skills/technical-analysis/SKILL.md` (modified)
- `apps/vibe-investor/USAGE.md` (modified)
- `apps/vibe-investor/USAGE_PORTFOLIO.md` (deleted)
- `apps/vibe-investor/memory-templates/scripts/portfolio_ops.py` (added)
- `apps/vibe-investor/opencode-config.json` (modified)
- `apps/vibe-investor/scripts/init-memory.sh` (modified)
- `apps/vibe-investor/AUTOMATION_HANDOFF.md` (untracked/added)
- `apps/vibe-investor/REVIEW_HANDOFF.md` (this file, added)

## Notes For Reviewer Agent

- Review `portfolio_ops.py` data contract assumptions for snapshots:
  - optional fields used: `stop`, `category`, `sector`, `mos`, `target_weight`, `adtv_value`, `correlations`
- Confirm command templates in `opencode-config.json` align with your preferred prompting style.
- If desired, next iteration can add:
  - stricter schema validation for snapshot input
  - optional markdown output mode per subcommand
  - explicit integration between `/pm-sync` and `portfolio_ops.py`
