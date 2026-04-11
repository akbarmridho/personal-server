# Symbol Memory Contract

Use `memory/symbols/{SYMBOL}/plan.md` for durable per-symbol operating plans.

New symbol plans should start with YAML frontmatter:

```yaml
---
id: {SYMBOL}
watchlist_status: {WATCHING | READY | ACTIVE}
trade_classification: {THESIS | TACTICAL | SPECULATION}
holding_mode: {TACTICAL | THESIS | HYBRID | no-position | hold | exit-review}
thesis_id: {thesis-id or null}
last_reviewed: {YYYY-MM-DD}
next_review: {YYYY-MM-DD or null}
leader: {true | false}
tags: [{tag}, ...]
---
```

Rules:

- Keep the schema small and strict. `id` doubles as the symbol ticker. `scope` is implicit from file location.
- When an older symbol plan is edited, remove legacy `scope` and `symbol` frontmatter fields and add any missing fields from the current schema.
- `watchlist_status` is the durable watchlist label for the symbol. Valid values: `WATCHING`, `READY`, `ACTIVE`.
- When a position is exited, set `watchlist_status` to `WATCHING` and `holding_mode` to `no-position`. The symbol stays on the watchlist for future monitoring — exiting a position does not mean removing the name.
- Use `leader: true` only for active leadership names that matter to breadth/regime checks.
- Body content owns narrative explanation, levels, invalidation, and execution details.
- Body content may include `Active Scenarios` when multiple forward paths materially change add/trim/exit decisions.
- Do not store live fills, current P/L, or temporary execution state here.
