# Thesis Memory Contract

Use flat storage under `memory/state/theses/`.

- Top-level thesis path: `memory/state/theses/{THESIS_ID}/thesis.md`
- Subthesis path: `memory/state/theses/{SUBTHESIS_ID}/thesis.md`
- Parent-child relationships are expressed in file metadata, not by nested thesis folders.

Use:

- `type: THESIS` for umbrella views
- `type: SUBTHESIS` for narrower expressions of a parent thesis
- `parent_thesis_id:` only for `SUBTHESIS`

Prefer `SUBTHESIS` when the new idea is mostly:

- a mechanism inside a larger thesis
- a comparison inside a larger thesis
- a sector slice inside a larger thesis
- an execution expression of a larger thesis

Use a separate top-level `THESIS` only when the idea has its own durable driver set, invalidation, and lifecycle independent of an existing parent.

When an older thesis file is edited, add the frontmatter during that write instead of leaving mixed formats behind.

Suggested thesis-file structure:

```markdown
---
id: {thesis-id}
scope: thesis
title: {Title}
type: {THESIS | SUBTHESIS}
parent_thesis_id: {parent-thesis-id or blank}
status: {ACTIVE | INACTIVE}
symbols: [{SYMBOL}, ...]
last_updated: {YYYY-MM-DD}
tags: [{tag}, ...]
---

# {Title}

- scope: {umbrella | mechanism | comparison | sector-slice | other}

## Summary

## Core Drivers

## Why This Exists

## Invalidation

## Linked Symbols

## Timeline
- {YYYY-MM-DD}: {what changed and why}
```
