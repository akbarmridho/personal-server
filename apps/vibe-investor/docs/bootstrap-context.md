# Vibe Investor — Bootstrap Context Prompt

Use this prompt at the start of any new session that needs full vibe-investor context for implementation work (roadmap tasks, prompt edits, skill changes, contract reviews).

Copy the section you need into the session opener.

---

## Full Bootstrap (roadmap implementation, cross-cutting changes)

```
I'm working on the vibe-investor agent system. Load the following files to get full context before we start:

Architecture and roadmap:
- apps/vibe-investor/AGENTS.md
- apps/vibe-investor/docs/IMPROVEMENT-ROADMAP.md
- apps/vibe-investor/docs/session-analysis/architecture-proposal.md
- apps/vibe-investor/docs/session-analysis/radical-redesign-proposal.md

Main prompt (the agent's system prompt):
- apps/vibe-investor/prompts/vibe-investor/main.md

All skill entrypoints:
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

Read all files, then confirm you have the full picture before we proceed.
```

---

## Task-Scoped Bootstrap (implementing a specific roadmap task)

```
I'm working on vibe-investor roadmap task {TASK_NUMBER}. Load these files:

Task spec:
- apps/vibe-investor/docs/tasks/{TASK_FILE}
- apps/vibe-investor/docs/IMPROVEMENT-ROADMAP.md

{THEN ADD THE RELEVANT SUBSET BELOW}
```

Append the files relevant to the task scope:

### If the task touches main.md (workflow/synthesis changes)

```
- apps/vibe-investor/prompts/vibe-investor/main.md
```

### If the task touches technical-analysis

```
- apps/vibe-investor/.opencode-config/skills/technical-analysis/SKILL.md
```

### If the task touches flow-analysis

```
- apps/vibe-investor/.opencode-config/skills/flow-analysis/SKILL.md
- apps/vibe-investor/.opencode-config/skills/flow-analysis/scripts/build_flow_context.py
```

### If the task touches narrative-analysis

```
- apps/vibe-investor/.opencode-config/skills/narrative-analysis/SKILL.md
- apps/vibe-investor/.opencode-config/skills/narrative-analysis/references/narrative-core-framework.md
```

### If the task touches portfolio-management

```
- apps/vibe-investor/.opencode-config/skills/portfolio-management/SKILL.md
- apps/vibe-investor/.opencode-config/skills/portfolio-management/references/trading-plan-template.md
- apps/vibe-investor/.opencode-config/skills/portfolio-management/references/review-watchlist-and-review-logging.md
```

### If the task touches fundamental-analysis

```
- apps/vibe-investor/.opencode-config/skills/fundamental-analysis/SKILL.md
(add specific refs based on mode — see SKILL.md Reference Routing section)
```

### If the task needs design context

```
- apps/vibe-investor/docs/session-analysis/architecture-proposal.md
- apps/vibe-investor/docs/session-analysis/radical-redesign-proposal.md
```

---

## Iteration 1 Quick Bootstrap

All P1 tasks touch main.md, TA skill, and PM skill. Use this:

```
I'm working on vibe-investor Iteration 1 (fix the "never buys" problem). Load:

- apps/vibe-investor/docs/IMPROVEMENT-ROADMAP.md
- apps/vibe-investor/docs/tasks/1.1-decision-timeline.md
- apps/vibe-investor/docs/tasks/1.2-wait-staleness.md
- apps/vibe-investor/docs/tasks/1.3-retest-observed.md
- apps/vibe-investor/docs/tasks/1.4-pilot-entry.md
- apps/vibe-investor/docs/tasks/1.5-opportunity-cost.md
- apps/vibe-investor/prompts/vibe-investor/main.md
- apps/vibe-investor/.opencode-config/skills/technical-analysis/SKILL.md
- apps/vibe-investor/.opencode-config/skills/portfolio-management/SKILL.md
- apps/vibe-investor/.opencode-config/skills/portfolio-management/references/trading-plan-template.md

Read all files, then confirm which task we're implementing.
```

---

## Iteration 2 Quick Bootstrap

P2 touches all skills and main.md. Use the Full Bootstrap above, plus:

```
Also load the active task:
- apps/vibe-investor/docs/tasks/{TASK_FILE}

And the design docs:
- apps/vibe-investor/docs/session-analysis/architecture-proposal.md
- apps/vibe-investor/docs/session-analysis/radical-redesign-proposal.md
```

---

## Review/Audit Bootstrap (contract review, token audit, hygiene check)

```
I'm auditing the vibe-investor prompt and skill contracts. Load:

- apps/vibe-investor/AGENTS.md
- apps/vibe-investor/docs/token-optimization.md
- apps/vibe-investor/prompts/vibe-investor/main.md
- apps/vibe-investor/.opencode-config/skills/technical-analysis/SKILL.md
- apps/vibe-investor/.opencode-config/skills/flow-analysis/SKILL.md
- apps/vibe-investor/.opencode-config/skills/narrative-analysis/SKILL.md
- apps/vibe-investor/.opencode-config/skills/portfolio-management/SKILL.md
- apps/vibe-investor/.opencode-config/skills/fundamental-analysis/SKILL.md

Read all files. I'll tell you what to check.
```

---

## File Map Reference

```
apps/vibe-investor/
├── AGENTS.md                          # Prompt hygiene rules
├── prompts/vibe-investor/main.md      # Agent system prompt (10K tokens)
├── .opencode-config/
│   ├── skills/
│   │   ├── technical-analysis/
│   │   │   ├── SKILL.md               # TA skill (9.6K tokens)
│   │   │   └── scripts/               # Deterministic TA preprocessing
│   │   ├── flow-analysis/
│   │   │   ├── SKILL.md               # Flow skill (2.3K tokens)
│   │   │   └── scripts/               # Deterministic flow preprocessing
│   │   ├── narrative-analysis/
│   │   │   ├── SKILL.md               # Narrative skill (3.5K tokens)
│   │   │   └── references/            # 5 refs, loaded selectively
│   │   ├── portfolio-management/
│   │   │   ├── SKILL.md               # PM skill (6.4K tokens)
│   │   │   └── references/            # 2 refs (trading-plan, review-watchlist)
│   │   └── fundamental-analysis/
│   │       ├── SKILL.md               # Fundamental skill (4.6K tokens)
│   │       └── references/            # 20 refs, mode-routed (never all at once)
│   └── tools/                         # Custom tool definitions (4 files)
├── docs/
│   ├── IMPROVEMENT-ROADMAP.md         # Task tracker and priority
│   ├── token-optimization.md          # Token budget analysis
│   ├── tasks/                         # Per-task implementation specs
│   ├── session-analysis/              # Design docs and proposals
│   ├── flow-future-improvements.md    # Flow pipeline improvement source
│   └── usage.md                       # Usage guide
├── memory-templates/                  # Memory structure templates
├── scripts/                           # Utility scripts
└── src/                               # Config resolver
```
