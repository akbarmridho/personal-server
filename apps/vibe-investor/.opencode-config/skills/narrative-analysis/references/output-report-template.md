# Output Report Template

Use this structure for narrative outputs.

```markdown
## Narrative Analysis: {SYMBOL}

**Verdict:** {STRONG / MODERATE / WEAK / BROKEN}
**Narrative Score:** {X}/15
**Confidence:** {HIGH / MEDIUM / LOW}

### Current Narrative
- Type: {thematic play / turnaround / corporate action / etc.}
- Story: {1-2 sentence summary}
- Business excitement: {high / moderate / low}

### Owner And Ownership
- Owner character: {aligned / neutral / extractive}
- Key shareholders: {major holders and recent shifts}

### Catalyst Calendar
| Catalyst | Expected date | Impact | Probability |
|----------|---------------|--------|-------------|
| ... | ... | ... | ... |

### Narrative Strength
- Freshness: {new / developing / aging / stale}
- Market awareness: {unknown / niche / broad / consensus}
- Priced in: {no / partial / full}

### Failure Risks
- Primary failure trigger: {explicit invalidation}
- Failure risk score: {0-3}
- Binary dependency: {yes/no}

### Haluasi / Premium
- Current premium vs sector: {Xx}
- Premium potential: {low / moderate / high}
- Downside if break: {estimated drawdown range}
```

## Implementation Note

Enforcement: agent workflow during Phase 3 (see SKILL.md). This template is the contract for the final output. Every section must be filled when producing a full narrative analysis. All verdict, score, and label values must match `enums-and-glossary.md`.
