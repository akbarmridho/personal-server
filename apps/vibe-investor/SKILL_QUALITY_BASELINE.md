# Skill Quality Baseline

Patterns extracted from the technical-analysis skill audit that apply to all skills regardless of domain.

## 1. Single Enum Source of Truth

One file (`enums-and-glossary.md`) owns every shared status, verdict, and label used across references and output. Other reference docs use these values but don't redefine them.

Audit: grep every enum value in the glossary against all reference files and the output template. No value should appear that isn't listed in the glossary. No glossary value should be unreachable from the skill's workflow.

## 2. Every Reference File Is Reachable

SKILL.md has a topic ownership map and a reference index. Every file in `references/` must appear in at least one of these. No orphan files.

Audit: list all files in `references/`, verify each is linked from SKILL.md or from an index file.

## 3. Implementation Notes Link Docs to Behavior

Every reference file that describes behavior the agent must follow includes an "Implementation Note" at the bottom. For skills without scripts, this section states where the behavior is enforced — whether it's the agent workflow, a specific SKILL.md section, or a tool call pattern.

This creates traceability: if someone reads a rule, they know where it's applied.

## 4. Deterministic vs Agent-Judgment Boundary

Clearly document what is mechanical (tool output, precomputed data, threshold checks) vs what requires agent judgment (qualitative assessment, cross-referencing, narrative interpretation).

For technical-analysis this meant scripts vs agent. For other skills it means: which verdicts come directly from tool data, and which require the agent to synthesize across sources? Document this boundary explicitly so the agent knows when it's computing vs interpreting.

## 5. Fail-Fast on Missing Dependencies

If a required data source fails or returns empty, stop and report — don't guess or produce partial results. This applies to any skill that calls MCP tools.

Each SKILL.md should list required data sources and what happens when they're unavailable.

## 6. Consistent Reference Doc Structure

Every reference file follows the same skeleton:

1. Title and Objective (what this reference is for)
2. Rules or Framework (the actual content, with unique rule IDs where applicable)
3. Trace Requirements (what evidence the output must include when this reference is used)
4. Implementation Note (where/how this is enforced)

Consistency makes it easy to navigate any reference file without learning a new layout each time.

## 7. Output Template as Contract

The output report template defines the exact structure of the final analysis. Every section maps to a checkpoint or domain. Every verdict/status value matches the glossary.

The template is the contract between the skill and the consumer. If the template says a section exists, the skill must be able to produce it.

## 8. Checkpoint Coverage

A checkpoint list (like `G1`–`G18` in TA) ensures report completeness. Each checkpoint maps to a specific output template section.

For non-numerical skills, checkpoints might be: "narrative source cited", "catalyst timeline present", "risk scoring included", "invalidation conditions stated". The point is: a finite list of things the output must contain, each traceable to a template section.

## 9. Risk/Warning Taxonomy

A standardized set of warning flags with IDs, severity levels, and trace requirements. Each flag is either produced by a deterministic check (tool data meets threshold) or explicitly documented as agent-assigned (qualitative judgment).

This prevents ad-hoc risk language and ensures consistent severity communication across analyses.

## 10. Cross-Reference Integrity

Index files (like `analysis-checklists-and-red-flags.md` or `price-action-patterns-and-breakouts.md`) correctly link to their sub-modules. No broken links, no circular references, no files that reference non-existent siblings.

## 11. Topic Ownership (No Overlap)

Each domain topic is owned by exactly one reference file. SKILL.md's topic ownership section makes this explicit. If two reference files could answer the same question, one of them shouldn't exist or the boundary needs to be redrawn.

## Applying This

For each skill:

1. Check if `enums-and-glossary.md` exists and covers all verdicts/statuses used in references and output template. If not, create it.
2. Verify every `references/` file is reachable from SKILL.md. Remove or link orphans.
3. Add Implementation Notes to reference files that lack them.
4. Document the deterministic-vs-judgment boundary in SKILL.md or a dedicated section.
5. Verify fail-fast behavior is documented for required data sources.
6. Standardize reference doc structure across all files in the skill.
7. Verify the output template matches the glossary enums and checkpoint list.
8. Create or verify a checkpoint list with mappings to output template sections.
9. Create or verify a risk/warning taxonomy with clear deterministic-vs-agent-assigned boundaries.
10. Run a cross-reference audit: no orphan files, no broken links, no overlapping topic ownership.
