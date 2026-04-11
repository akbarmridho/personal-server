# Vibe Investor

## Prompt And Contract Hygiene

- Present the current valid contract directly. Do not describe current behavior by negating removed behavior when a direct positive statement is possible.
- If the old contract was `A` and the new contract is `B`, write `B`. Do not write `B (not A)` or `B (A was removed)`.
- Avoid migration residue in prompts/docs such as `does not exist`, `no longer`, `removed`, `instead of old flow`, or `what it does not do` when the same idea can be stated as the current behavior/output.
- When a behavior is read-only or write-limited, describe the exact artifact or surface it does write/read. Do not primarily document it as a list of things it does not mutate.
- Keep one owner per contract. Do not duplicate the same workflow rules across base prompt, command templates, skill entrypoints, references, and docs unless there is a strong reason.
- Base prompt should own global agent behavior: identity, worldview, shared memory model, shared tool model, skill preflight, shared synthesis rules, and subagent behavior.
- Command markdown files may own the full workflow contract for their command, including execution order, continuity, mutation scope, artifact paths, and required outputs.
- Command templates should stay thin. They should load the command markdown file and pass minimal command-specific input.
- Skill entrypoints should own domain-specific method, dependencies, and output expectations. They should not own global workflow routing unless the workflow is truly local to that skill.
- Deep reference files should contain doctrine, rubrics, checklists, and templates. They should not own orchestration, persistence timing, or other cross-cutting execution rules.
- Output templates should define output shape only. Do not hardcode runtime storage locations, temporary-path policy, or workflow-specific persistence rules into templates.
- If a contract changes, consolidate toward fewer authoritative locations rather than updating every layer with near-duplicate wording.
