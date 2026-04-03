# Symbol Memory Contract

Use `memory/state/symbols/{SYMBOL}.md` for durable per-symbol operating plans.

New symbol plans should start with YAML frontmatter:

```yaml
---
id: {SYMBOL}
watchlist_status: {WATCHING | READY | ACTIVE | REMOVED}
trade_classification: {THESIS | TACTICAL | SPECULATION}
holding_mode: {TACTICAL | THESIS | HYBRID}
thesis_id: {thesis-id}
last_reviewed: {YYYY-MM-DD}
next_review: {YYYY-MM-DD}
leader: {true | false}
tags: [{tag}, ...]
---
```

Rules:

- Keep the schema small and strict. `id` doubles as the symbol ticker. `scope` is implicit from file location (`memory/state/symbols/`).
- When an older symbol plan is edited, migrate the frontmatter: remove `scope` and `symbol` fields, add any missing fields from the current schema, and add exit-review fields to the Open Position Monitoring section if the position is active.
- `watchlist_status` is the durable watchlist label for the symbol.
- Use `leader: true` only for active leadership names that matter to breadth/regime checks.
- Body content still owns narrative explanation, levels, invalidation, and execution details.
- Body content may include optional `Active Scenarios` when multiple forward paths materially change add/trim/exit decisions. Keep the active scenario set small and promote only branches that matter operationally.
- Do not store live fills, current P/L, or temporary execution state here.

Suggested optional scenario structure:

```markdown
## Active Scenarios

- Active scenario: {scenario name or single-path setup}
- {Scenario name}
  - Trigger/evidence: {what would confirm this branch}
  - Implication: {hold / add / trim / exit consequence}
  - Likelihood: {optional rough estimate}
- {Scenario name}
  - Trigger/evidence: {what would confirm this branch}
  - Implication: {hold / add / trim / exit consequence}
  - Likelihood: {optional rough estimate}
- Switch conditions: {what would move the active scenario}
```
