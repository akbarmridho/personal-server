# Knowledge Base Backend Architecture

## Metadata Structure

```typescript
{
  type: "ticker" | "market",
  primaryTickers: ["BMRI"],      // main subjects
  mentionedTickers: ["BBCA"],    // secondary mentions
  urls: [...],
  date: "2025-10-27"
}
```

### Classification Rules

- **ticker**: News with `$TICKER` pattern in title/first sentence
- **market**: Macro/sector news (IHSG, foreign flow, MSCI changes)

### Query Examples

```typescript
// Precise: BMRI as main subject
{ primaryTickers: ["BMRI"] }

// Broad: Any BMRI mention
{ mentionedTickers: ["BMRI"] }

// All market news
{ type: "market" }
```

## Hybrid Timeline + RAG Architecture

### Document Types

```
├── Daily news (type: "market" | "ticker")
├── Weekly summaries (subtype: "weekly-summary", period: "2025-W43")
└── Monthly summaries (subtype: "monthly-summary", period: "2025-10")
```

### Retrieval Strategy

**Always fetch:**

- Last 2 monthly summaries
- Last 2 weekly summaries

**RAG search:**

- Past 7 days raw news
- Semantic search in older news

### Summary Generation

**Weekly** (every Monday):

- Input: All market news from past week
- Output: 300-500 words covering IHSG, macro events, sectors, regulations

**Monthly** (1st of month):

- Input: All weekly summaries
- Output: 500-800 words (higher level)
