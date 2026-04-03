# Vibe Investor — Token Budget & Session Context

Last updated: 2026-04-03

## Session Context

To start a new session with full vibe-investor context, load these files:

```
Main prompt:
- apps/vibe-investor/prompts/vibe-investor/main.md

Skills:
- apps/vibe-investor/.opencode-config/skills/technical-analysis/SKILL.md
- apps/vibe-investor/.opencode-config/skills/flow-analysis/SKILL.md
- apps/vibe-investor/.opencode-config/skills/narrative-analysis/SKILL.md
- apps/vibe-investor/.opencode-config/skills/portfolio-management/SKILL.md
- apps/vibe-investor/.opencode-config/skills/fundamental-analysis/SKILL.md

PM references (always relevant for portfolio/sizing/plan changes):
- apps/vibe-investor/.opencode-config/skills/portfolio-management/references/trading-plan-template.md
- apps/vibe-investor/.opencode-config/skills/portfolio-management/references/review-watchlist-and-review-logging.md

Custom tools (for understanding tool contracts):
- apps/vibe-investor/.opencode-config/tools/fetch-ohlcv.ts
- apps/vibe-investor/.opencode-config/tools/fetch-broker-flow.ts
- apps/vibe-investor/.opencode-config/tools/portfolio.ts
- apps/vibe-investor/.opencode-config/tools/deep-doc-extract.ts

Deterministic scripts (for pipeline changes):
- apps/vibe-investor/.opencode-config/skills/flow-analysis/scripts/build_flow_context.py
- apps/vibe-investor/.opencode-config/skills/technical-analysis/scripts/build_ta_context.py
- apps/vibe-investor/.opencode-config/skills/technical-analysis/scripts/wyckoff_state.py

Roadmap and triage (for status/history):
- apps/vibe-investor/docs/IMPROVEMENT-ROADMAP.md
- apps/vibe-investor/docs/iteration-3-triage.md

Human-facing reference:
- apps/vibe-investor/docs/idx-investing-reference-guide.md

Prompt hygiene rules:
- apps/vibe-investor/AGENTS.md
```

For quick work (single skill edit, one-off fix), load only main.md + the relevant skill + its references.

## File Map

```
apps/vibe-investor/
├── AGENTS.md                          # Prompt hygiene rules
├── prompts/vibe-investor/main.md      # Agent system prompt
├── .opencode-config/
│   ├── skills/
│   │   ├── technical-analysis/
│   │   │   ├── SKILL.md               # TA skill
│   │   │   └── scripts/               # Deterministic TA preprocessing + Wyckoff
│   │   ├── flow-analysis/
│   │   │   ├── SKILL.md               # Flow skill
│   │   │   └── scripts/               # Deterministic flow preprocessing
│   │   ├── narrative-analysis/
│   │   │   ├── SKILL.md               # Narrative skill
│   │   │   └── references/            # 5 refs, loaded selectively
│   │   ├── portfolio-management/
│   │   │   ├── SKILL.md               # PM skill
│   │   │   └── references/            # trading-plan-template, review-watchlist
│   │   └── fundamental-analysis/
│   │       ├── SKILL.md               # Fundamental skill
│   │       └── references/            # 20 refs, mode-routed (never all at once)
│   └── tools/                         # Custom tool definitions (4 files)
├── docs/
│   ├── IMPROVEMENT-ROADMAP.md         # Task tracker (all iterations complete)
│   ├── iteration-3-triage.md          # Iteration 3 triage reasoning
│   ├── idx-investing-reference-guide.md # Human-facing investing handbook
│   ├── token-optimization.md          # This file
│   ├── tasks/                         # Per-task specs (historical)
│   └── usage.md                       # Usage guide
├── memory-templates/                  # Memory structure templates
├── scripts/                           # Utility scripts
└── src/                               # Config resolver
```

## Token Budget (tiktoken o200k_base)

| Component | SKILL.md | Refs | Total |
|---|---|---|---|
| `main.md` | — | — | ~10K |
| `technical-analysis` | ~9.5K | 0 | ~9.5K |
| `flow-analysis` | ~3K | 0 | ~3K |
| `narrative-analysis` | ~3.5K | ~4.5K | ~8K |
| `portfolio-management` | ~6.5K | ~2.8K | ~9.3K |
| `fundamental-analysis` | ~4.5K | ~16.7K | ~21K |

Fundamental refs are mode-routed (not all loaded at once). Narrative refs are selectively loaded.

## Typical Desk-Check Context Load

| Layer | Tokens |
|---|---|
| `main.md` | ~10K |
| `technical-analysis` SKILL.md | ~9.5K |
| `flow-analysis` SKILL.md | ~3K |
| `narrative-analysis` SKILL.md + core ref | ~5.3K |
| `portfolio-management` SKILL.md + both refs | ~9.3K |
| **Doctrine subtotal** | **~37K** |

Plus runtime context (memory files, tool outputs, analysis artifacts): ~30-50K. Total desk-check input: ~70-90K tokens, roughly 40-45% of a 200K context window.

## Safe Optimizations (~5K tokens, no behavior change)

1. Move TA `ta_context` schema to reference-only (~2.5K) — LLM reads the JSON at runtime, doesn't generate it. Schema is for skill curation, not analysis runs.
2. Deduplicate PM health flag table (~400) — listed as both bullets and table. Keep table only.
3. Consolidate shared workflow preamble in main.md (~500-800) — desk-check, deep-review, explore-idea repeat shared rules.
4. Move narrative output template to reference (~600) — only needed during artifact generation.

## Recommendation

1. Implement safe optimizations when convenient. No urgency.
2. Investigate prompt caching at infrastructure level — highest ROI for cost reduction.
3. Consider tiered prompt modes if simple queries become frequent.
4. Do not pursue RAG over doctrine — cross-reference risk is too high for a system managing real capital.
