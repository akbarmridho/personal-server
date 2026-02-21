# Vibe Investor Skill Setup Preferences

This file documents how `SKILL.md` files should be structured in `apps/vibe-investor` based on current working conventions.

## Goal

Keep skills easy to trigger, fast to load, and predictable to maintain.

## Directory Convention

Each skill lives at:

- `.opencode-config/skills/<skill-name>/SKILL.md` (required)
- `.opencode-config/skills/<skill-name>/references/*.md` (optional, preferred for depth)

Use this model for all skills in this repo.

## Frontmatter Rules

`SKILL.md` must begin with YAML frontmatter.

Required fields:

- `name`
- `description`

Rules:

- `name` must match the folder name exactly.
- Use lowercase + hyphen format only.
- `description` should describe both:
  - what the skill does
  - when to use it

## Core SKILL.md Shape (Default)

For most skills (`portfolio-management`, `narrative-analysis`, `fundamental-analysis`):

1. How to use this skill (entrypoint behavior)
2. Data sources
3. Reference index (modular)
4. Execution defaults

Keep `SKILL.md` concise. Put depth into references.

## Modularity Preferences

Split by reasoning domain, not by tiny headings.

Good split examples:

- workflow
- framework (identification/scoring/risk)
- output template
- sector/mechanism routing

Avoid over-splitting into too many tiny files.

## Technical Analysis Special Preference

For `technical-analysis`:

- Keep **workflow + data prep** in main `SKILL.md`.
- Do **not** create separate workflow reference file.
- Keep reference code in the same markdown where the theory is explained.
  - Example: S/R theory + S/R code in one file.
- Avoid standalone “code-only” references unless absolutely necessary.

## Reference Linking Rules

Use skill-root-relative links:

- `references/<file>.md`

Apply this consistently in `SKILL.md` and cross-reference docs.

## Content Style Rules

- Keep instructions direct and operational.
- Prefer checklist/decision formats over long narrative prose.
- Use explicit statuses when needed (for example divergence status).
- Keep stop-loss/invalidation explicit in actionable outputs.

## Fail-Fast Behavior

If required data/tool fetch fails, fail the analysis and report the missing dependency.

Do not silently continue with guessed substitutes.

## Update Checklist (When Editing Any Skill)

1. Frontmatter valid and name matches folder.
2. `SKILL.md` stays concise and acts as entrypoint.
3. Deep content moved to references (except technical workflow rule above).
4. Reference links resolve.
5. No orphaned/deprecated reference files remain.
6. Output template and execution defaults stay aligned with the skill logic.
