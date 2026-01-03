# Knowledge Service Schema & Design

## Overview

This document defines the unified Qdrant collection schema for the Investment Knowledge Service. It handles multiple types of investment-related documents with flexible querying capabilities and metadata filtering.

## Document Types

1. **News** - General market news, sector updates, and ticker-specific news
2. **Filing** - Information directly from the company itself (e.g., annual reports, quarterly statements, official announcements)
3. **Analysis** - In-depth research from various sources (algoresearch, websites, PDFs, Instagram, etc.)
4. **Rumour** - Social media threads from Reddit, Twitter, etc.

## Collection Schema

### Payload Structure

```python
{
    # === Core Fields (Required) ===
    "id": str,                    # UUID v4 generated deterministically from content hash
    "type": str,                  # One of: "news", "filing", "analysis", "rumour"
    "title": str,                 # Document title or headline
    "content": str,               # The actual text content (used for embedding)
    
    # === Temporal Fields (Required) ===
    "document_date": str,         # ISO 8601 format: "2025-10-31" (date only) or "2025-10-31T14:30:00+07:00" (datetime)
                                  # Prefer date-only format. For datetime, always include GMT+7 timezone
    
    # === Source Fields (Required) ===
    "source": dict,               # Source metadata as Record<string, string>
                                  # Examples: {"platform": "stockbit", "type": "news"}
    
    # === URLs (Optional) ===
    "urls": [str],                # Associated URLs
    
    # === Ticker/Symbol Fields (Optional) ===
    "symbols": [str],             # Symbols discussed (e.g., ["BBCA", "TLKM"])
    
    # === Sector/Industry Fields (Optional) ===
    "subsectors": [str],          # Broad subsectors: "financials", "infrastructure", "energy"
    "subindustries": [str],       # Specific subindustries: "banks", "toll_roads", "coal_mining"
    
    # === Market Context Fields (Optional) ===
    "indices": [str],             # Relevant indices: "IHSG", "LQ45", "IDX30"
}
```

## Population Rules

This section defines **how** to populate the metadata fields to ensure consistency across the system.

### 1. Symbols (`symbols`)

* **Source**: Extracted from text or provided by source metadata.
* **Format**: Always Uppercase (e.g., `BBCA`, `GOTO`).
* **Rule**: Include if the document is specifically about the company or mentions it significantly.

### 2. Subsectors & Subindustries (`subsectors`, `subindustries`)

* **Hierarchy**: `Subindustry` (Specific) -> `Subsector` (Broad).
* **Derivation Rule**:
  * **If Symbols are present**: Do **NOT** use LLM to guess. Look up the symbol in the master database.
    * *Example*: Document mentions `BBCA` -> Auto-tag `Subindustry: Banks`, `Subsector: Financials`.
  * **If No Symbols (General News)**: Use LLM to analyze the content.
    * *Example*: "Coal prices are rising" -> LLM detects `Subindustry: Coal Mining` -> Map to `Subsector: Energy`.
* **Consistency**: Always store **both** fields to allow for broad (Subsector) and specific (Subindustry) filtering.

### 3. Indices (`indices`)

* **Purpose**: Strict filtering for macro-level documents (e.g., "Show me IHSG Weekly Recaps").
* **Rule**: Only populate if the document **explicitly tracks** or is **primarily about** the index.
  * *Yes*: "Weekly Market Recap: IHSG drops 1%", "LQ45 Rebalancing Announced".
  * *No*: "BBCA contributes to IHSG gain" (This is news about BBCA, not the index itself).
* **Note**: Do not rely on this field for general search relevance. Use keyword search (sparse vectors) for queries like "news about IHSG".

## Deduplication

The knowledge service includes automatic deduplication to prevent storing similar documents within a configurable time window.

### How It Works

1. When ingesting documents via the `/documents` endpoint, each document is checked against existing documents
2. If a document with the same ID already exists, it will be updated (no deduplication check)
3. For new documents, the system searches for documents within ±7 days (configurable) of the new document's date
4. Documents with a dense vector similarity score >0.87 (configurable) are considered duplicates and skipped
   * Note: The similarity score refers ONLY to the dense vector similarity, not the hybrid score from the full pipeline
   * Deduplication is ONLY performed for documents of type "news". Other types (filing, analysis, rumour) are not deduplicated
5. The response includes information about skipped documents for transparency

### Date Format Support

The system supports multiple date formats for the `document_date` field:

* ISO 8601 formats: `2025-01-15T14:30:00+07:00`, `2025-01-15T14:30:00Z`
* Date only: `2025-01-15`
* Common formats: `15/01/2025`, `01/15/2025`, `15-01-2025`
* With time: `15/01/2025 14:30:00`, `2025/01/15 14:30:00`

### Configuration

Deduplication settings can be configured via environment variables:

* `DEDUPLICATION_SIMILARITY_THRESHOLD`: Minimum similarity score to consider as duplicate (default: 0.87)
* `DEDUPLICATION_DATE_RANGE_DAYS`: Number of days before/after to check for duplicates (default: 7)

### API Response

The ingest endpoint now returns additional information about deduplication:

```json
{
  "status": "success",
  "count": 5,
  "skipped_count": 2,
  "skipped_documents": [
    {
      "id": "doc-123",
      "title": "BBCA Q3 Earnings Report",
      "similar_to": "existing-doc-456",
      "similarity_score": 0.92
    }
  ]
}
```
