# Vibe Investor — Design Notes

## 1. Platform: OpenCode vs OpenClaw

### Current: OpenCode

- Code-focused IDE/agent framework
- Single-agent active at a time (switch between agents manually)
- Strong filesystem + MCP tool integration
- Prompt templating with `<%- include() %>`
- No native inter-agent communication
- No messaging channel integration

### Candidate: OpenClaw

OpenClaw (formerly Clawdbot/Moltbot) is an open-source, self-hosted AI agent framework. Port 8025 already allocated.

**Advantages for vibe-investor:**

- Multiple agents can run simultaneously (not just switch between them)
- Native messaging integration (Telegram, Discord, WhatsApp) — could push alerts
- Persistent memory built-in (cross-conversation context)
- AgentSkills system (100+ preconfigured, extensible) — similar to our knowledge catalog idea
- Model-agnostic (bring your own API key, supports local models)
- Gateway-centric architecture with clean separation of concerns
- Browser automation built-in (could scrape Stockbit directly?)

**Concerns:**

- How mature is MCP tool integration? (our stock analysis depends heavily on MCP)
- Prompt templating — does it support modular prompts like opencode's `<%- include() %>`?
- Agent-to-agent communication — can the orchestrator read specialist outputs?
- How does it handle long, structured analysis workflows (our 3-phase patterns)?
- Migration effort — how much of our existing prompts/modules can be reused?

### Decision Factors

| Factor | OpenCode | OpenClaw |
|--------|----------|----------|
| Multi-agent simultaneous | No (switch) | Yes |
| MCP tools | Native | Needs verification |
| Prompt modularity | `<%- include() %>` | AgentSkills? |
| Messaging alerts | No | Native (Discord, Telegram) |
| Inter-agent communication | Via filesystem | Possibly native |
| Memory system | Manual (filesystem) | Built-in persistent |
| Maturity for our use case | Proven | Needs evaluation |

### Action Items

- [ ] Deploy OpenClaw on port 8025 and experiment
- [ ] Test MCP tool connectivity (can it call our stock MCP server?)
- [ ] Test multi-agent workflow (can orchestrator read specialist outputs?)
- [ ] Evaluate prompt/skill system (can we port our modular prompts?)
- [ ] Compare memory system with our current filesystem approach
- [ ] Decide: migrate fully, hybrid (OpenClaw for orchestration + OpenCode for deep analysis), or stay on OpenCode

---

## 2. Shared Knowledge Catalog

### Current State: "Skills" in kb-backend

Skills are TypeScript files in `kb-backend/src/stock/skills/catalog/` accessed via MCP:

- `list-skills` — list all available skills
- `get-skill` — retrieve a specific skill by name

**Problems:**

- No categorization (flat list)
- No search (exact name match only)
- Mixed concerns (some are sector knowledge, some are analysis frameworks, some are checklists)
- Agents embed essential knowledge in prompts AND can fetch skills at runtime — but the boundary isn't clear
- Skill content is duplicated across agent prompts (fundamental-analyst modules are extracted from skills)

### Proposed: Knowledge Catalog

Rename "skills" to "knowledge catalog" and restructure with proper categorization and tiered access.

#### Categorization

```
knowledge-catalog/
├── fundamental/
│   ├── financial-statement-healthcheck    # Balance sheet, income, cash flow checklists
│   ├── valuation-methodology              # 8 valuation methods
│   ├── economic-moat                      # Competitive advantage framework
│   ├── fundamental-analysis-narrative     # Qualitative checklist
│   ├── value-trap-identification          # Value trap detection
│   └── risk-analysis                      # IDX 2.0 risk framework
├── technical/
│   ├── wyckoff-methodology                # Market structure, phases
│   ├── support-resistance                 # S/R identification methods
│   ├── price-volume-analysis              # Price-volume relationship
│   └── entry-exit-strategies              # Trade execution frameworks
├── sector/
│   ├── banking                            # CASA, NIM, LDR, CAR, NPL
│   ├── coal                               # Strip ratio, pricing, DMO
│   ├── property                           # PSAK 72, NAV, adjusted DER
│   ├── consumer-retail                    # (to create)
│   ├── telco                              # (to create)
│   └── ...
├── flow/
│   ├── bandarmology-framework             # (to create)
│   ├── foreign-flow-analysis              # (to create)
│   └── frequency-analysis                 # (to create)
└── narrative/
    ├── catalyst-mapping                   # (to create)
    ├── narrative-assessment               # (to create)
    └── halu-ation-framework               # (to create)
```

#### Tiered Access: Essential vs Additional

**Essential (embedded in agent prompts):**

- Core frameworks the agent needs for EVERY analysis
- Embedded via `<%- include() %>` or equivalent in the platform
- Available immediately without tool calls
- Example: fundamental-analyst embeds financial-statement-healthcheck, valuation-methodology

**Additional (fetched on demand via knowledge catalog):**

- Deep reference material needed for specific situations
- Fetched via `list-knowledge` / `search-knowledge` / `get-knowledge` tools
- Reduces prompt size — only loaded when relevant
- Example: sector-specific frameworks (banking metrics only needed when analyzing a bank)

#### Boundary Rule

> If the agent needs it for >80% of analyses → Essential (embed in prompt)
> If the agent needs it for <80% of analyses → Additional (fetch on demand)

#### API Changes

Replace current skills API:

```
# Current
list-skills                    → flat list, no categories
get-skill(name)                → exact match only

# Proposed
list-knowledge(category?)      → list by category, or all
search-knowledge(query)        → fuzzy search across names + descriptions
get-knowledge(id)              → retrieve full content
```

#### Benefits

- Agents can discover relevant knowledge they weren't explicitly programmed to use
- Search enables finding knowledge by topic, not just exact name
- Categories make it clear which agent "owns" which knowledge
- Essential/additional split keeps prompts focused but allows deep dives
- New knowledge can be added without modifying agent prompts
- Single source of truth (no duplication between skills and prompt modules)

### Single Source of Truth Problem

Currently, fundamental-analyst prompt modules are **copies** of skill content (extracted and adapted). This means:

- Updates to skills don't propagate to prompts
- Content can drift over time

**Options:**

1. **Accept duplication** — Essential modules are curated/adapted versions, not exact copies. They're tailored to the agent's workflow. Maintain separately.
2. **Generate prompts from catalog** — Build step that compiles knowledge catalog entries into prompt modules. Single source, but adds build complexity.
3. **Runtime-only** — Don't embed anything. All knowledge fetched at runtime. Simpler but slower (more tool calls per analysis) and uses more context.

**Recommendation:** Option 1 for now. Essential modules are intentionally adapted — different structure, agent-specific framing, workflow integration. Accept that they diverge from the catalog. The catalog serves as the "reference library" while prompt modules are the "field manual."

---

## 3. Platform + Knowledge Catalog Interaction

### If staying on OpenCode

- Knowledge catalog lives in kb-backend (current location)
- Update MCP tools: `list-skills` → `list-knowledge`, add `search-knowledge`
- Add category field to skill type definitions
- Agent prompts continue using `<%- include() %>` for essential knowledge
- Additional knowledge fetched via MCP tools

### If migrating to OpenClaw

- Knowledge catalog could map to OpenClaw's AgentSkills system
- Investigate if AgentSkills supports categorization and search
- Essential knowledge might map to agent "personality" or "system prompt"
- Additional knowledge maps to callable skills
- Potential benefit: AgentSkills might already have list/search built-in

### Either way, the knowledge catalog restructure is platform-independent

The categorization, essential/additional split, and content organization work regardless of whether we use OpenCode or OpenClaw. Start with the content restructure, then adapt the API layer to whichever platform we choose.

---

## 4. Open Questions

- [ ] How does OpenClaw handle structured multi-step analysis workflows?
- [ ] Can OpenClaw agents share a filesystem-based memory system like ours?
- [ ] Does OpenClaw support MCP servers natively or need an adapter?
- [ ] Should the knowledge catalog live in kb-backend or become its own service?
- [ ] Should we build a simple build step to generate prompt modules from catalog entries?
- [ ] How to handle versioning of knowledge (e.g., regulatory changes, new sector frameworks)?
