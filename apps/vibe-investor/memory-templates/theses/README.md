# Thesis Memory Contract

- Top-level thesis path: `memory/theses/{THESIS_ID}/thesis.md`
- Subthesis path: `memory/theses/{THESIS_ID}/subtheses/{SUBTHESIS_ID}.md`

Use:

- `type: THESIS` for umbrella views
- `type: SUBTHESIS` for narrower expressions of a parent thesis
- `parent_thesis_id:` only for `SUBTHESIS`

When an older thesis file is edited, add the frontmatter during that write.

Suggested thesis-file structure:

```markdown
---
id: {thesis-id}
scope: thesis
title: {Title}
type: {THESIS | SUBTHESIS}
parent_thesis_id: {parent-thesis-id or null}
status: {ACTIVE | INACTIVE}
symbols: [{SYMBOL}, ...]
last_updated: {YYYY-MM-DD}
tags: [{tag}, ...]
---

# {Title}

## Summary

## Core Drivers

## Scenarios

## Invalidation

## Linked Symbols

## Timeline
```
