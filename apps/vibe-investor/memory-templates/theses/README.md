# Thesis Memory Contract

- Top-level thesis path: `memory/theses/{THESIS_ID}/thesis.md`
- Subthesis path: `memory/theses/{THESIS_ID}/subtheses/{SUBTHESIS_ID}.md`

Use:

- `type: THESIS` for umbrella views
- `type: SUBTHESIS` for narrower expressions of a parent thesis
- `parent_thesis_id:` only for `SUBTHESIS`
- `status: ACTIVE` — thesis is live, driving decisions
- `status: DORMANT` — thesis is valid but no catalyst or urgency right now. Check occasionally.
- `status: INACTIVE` — thesis is dead, invalidated, or retired.

When an older thesis file is edited, remove legacy fields (`scope`, `tags`, or any field not in the current schema) and add any missing fields.

```yaml
---
id: {thesis-id}
title: {Title}
type: {THESIS | SUBTHESIS}
parent_thesis_id: {parent-thesis-id or null}
status: {ACTIVE | DORMANT | INACTIVE}
symbols: [{SYMBOL}, ...]
last_updated: {YYYY-MM-DD}
---
```

Suggested thesis-file structure:

```markdown
# {Title}

## Summary

## Core Drivers

## Scenarios

## Invalidation

## Linked Symbols

## Timeline
```
