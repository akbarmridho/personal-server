# Token Optimization Analysis

Last updated: 2026-04-03

## Current Token Budget (tiktoken o200k_base)

| Component | SKILL.md | Refs | Total |
|---|---|---|---|
| `main.md` | — | — | 10,019 |
| `technical-analysis` | 9,559 | 0 | 9,559 |
| `flow-analysis` | 2,271 | 0 | 2,271 |
| `narrative-analysis` | 3,455 | 4,538 | 7,993 |
| `portfolio-management` | 6,396 | 2,777 | 9,173 |
| `fundamental-analysis` | 4,559 | 16,720 | 21,279 |
| **Grand total** | | | **60,294** |

Fundamental refs are mode-routed (not all loaded at once). Narrative refs are selectively loaded. Flow and TA have no separate refs.

## Typical desk-check context load

A desk-check loads main.md + all four active skills (TA, flow, narrative, PM) + selected refs. Approximate doctrine cost:

| Layer | Tokens |
|---|---|
| `main.md` | 10,019 |
| `technical-analysis` SKILL.md | 9,559 |
| `flow-analysis` SKILL.md | 2,271 |
| `narrative-analysis` SKILL.md + core ref | ~5,337 |
| `portfolio-management` SKILL.md + both refs | 9,173 |
| **Doctrine subtotal** | **~36,359** |

On top of this: memory files (MEMORY.md, ihsg.md, macro.md, portfolio-monitor.md, watchlist.md, registry JSONs, symbol plans), tool outputs (OHLCV, broker-flow, portfolio state, documents), and analysis artifacts. Estimated 30-50K additional runtime context.

Total desk-check input: ~70-90K tokens, roughly 40-45% of a 200K context window.

## Assessment

Mostly a necessary tradeoff. The system runs a multi-skill agent with structured output contracts, deterministic preprocessing, memory management, and portfolio risk discipline. That requires doctrine, and doctrine costs tokens.

The skill-loading pattern already avoids loading everything for every call. The issue is desk-check genuinely needs all four skills.

## Safe optimizations (~5K tokens, no behavior change)

### 1. Move TA `ta_context` schema to reference-only (~2,500 tokens)

The full field-by-field JSON schema in `technical-analysis/SKILL.md` documents the output contract of the deterministic Python scripts. The LLM reads `ta_context` JSON at runtime — it doesn't generate it. The interpretation rules (state/location/setup/trigger/risk phases) are what the LLM needs; the schema is for skill curation and script development.

Move the `ta_context Schema` section and all sub-schemas (zone, baseline_ma_posture, adaptive_ma, wyckoff_history, wyckoff_event) to a reference file like `references/ta-context-schema.md`. Load it only during skill development or script changes, not during analysis runs.

Risk: Low. Scripts produce the JSON; LLM reads it. If the LLM ever needs to validate a field name, it can check the reference on demand.

### 2. Move TA sub-schemas (~800 tokens, included in above)

The zone, baseline_ma_posture, adaptive_ma, wyckoff_history, and wyckoff_event sub-schemas are part of the same schema documentation. Move them together with the main schema.

### 3. Deduplicate PM health flag table (~400 tokens)

`portfolio-management/SKILL.md` lists health flags twice: once as a bullet list and once as a metadata table with severity and source type. Keep only the table (it's strictly more informative) and remove the bullet list.

### 4. Consolidate shared workflow preamble in main.md (~500-800 tokens)

desk-check, deep-review, and explore-idea defaults repeat shared rules: load portfolio-management, check IHSG cash floor, fail fast if portfolio data missing, top-down context mandatory, evidence-backed memory updates, registry refresh before run log. Extract these into a shared workflow preamble section and reference it from each workflow, keeping only the per-workflow deltas inline.

### 5. Move narrative output template to reference (~600 tokens)

The full structured markdown output template in `narrative-analysis/SKILL.md` Phase 3 is only needed when producing the final artifact. Move it to a reference file loaded during artifact generation, not during every narrative pass in a desk-check.

### Total safe savings

~4,800-5,100 tokens (~8% of grand total). Meaningful for per-run cost but not transformative for context pressure.

## Structural alternatives (larger savings, behavior tradeoffs)

### Tiered prompt modes

A "quick lookup" mode (price check, single ratio, one-off question) doesn't need 37K of doctrine. Could define a lightweight mode that loads only `main.md` core sections + the single relevant skill, skipping workflow contracts, memory rules, and cross-skill synthesis. Requires defining which main.md sections are always-on vs workflow-gated.

Savings: ~15-20K tokens for simple queries.
Risk: Medium. Need clear mode boundaries so the agent doesn't accidentally run a lightweight mode for a desk-check.

### RAG over doctrine

Retrieve relevant doctrine sections instead of loading full skills. Would dramatically cut per-run tokens.

Risk: High for this use case. The agent needs to cross-reference rules (TA setup validity depends on PM regime gate, which depends on IHSG cash overlay). Fragmenting doctrine means the agent might miss rule interactions that prevent bad decisions.

### Skill-level context caching

If the model provider supports prompt caching (e.g., Anthropic prompt caching, OpenAI cached tokens), the doctrine portion is highly cacheable since it's identical across runs. This doesn't reduce the context window usage but cuts cost and latency significantly.

Risk: None. Pure infrastructure optimization. Worth investigating if not already active.

## Recommendation

1. Implement the five safe optimizations (~5K tokens) when convenient. No urgency.
2. Investigate prompt caching at the infrastructure level — highest ROI for cost reduction without any doctrine changes.
3. Consider tiered prompt modes if simple queries become frequent enough to justify the mode-switching complexity.
4. Do not pursue RAG over doctrine — the cross-reference risk is too high for a system that manages real capital.
