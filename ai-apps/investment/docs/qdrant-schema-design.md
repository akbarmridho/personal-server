# Qdrant Collection Schema Design for Investment Documents

## Overview

This document defines a unified Qdrant collection schema that can handle multiple types of investment-related documents with flexible querying capabilities and metadata filtering.

## Document Types

1. **Market News** - General market news, sector news, and macroeconomic news
2. **Ticker News** - News specifically about individual tickers
3. **Weekly Summary** - Periodic market analysis and outlook
4. **Analysis** - In-depth research from various sources (algoresearch, websites, PDFs, Instagram, etc.)
5. **Rumour** - Social media threads from Reddit, Twitter, etc.

## Collection Schema

### Payload Structure

```python
{
    # === Core Fields (Required) ===
    "id": str,                    # UUID v4 generated deterministically from content hash
    "type": str,                  # One of: "market_news", "ticker_news", "weekly_summary", "analysis", "rumour"
    "title": str,                 # Document title or headline
    "content": str,               # The actual text content (used for embedding)
    
    # === Temporal Fields (Required) ===
    "document_date": str,         # ISO 8601 format: "2025-10-31" (date only) or "2025-10-31T14:30:00+07:00" (datetime)
                                  # Prefer date-only format. For datetime, always include GMT+7 timezone
                                  # Use published_date if available, otherwise ingestion_date
    
    # === Source Fields (Required) ===
    "source": dict,               # Source metadata as Record<string, string>
                                  # Examples:
                                  # {"platform": "stockbit", "type": "news"}
                                  # {"platform": "reddit", "author": "user123", "subreddit": "JudiSaham", "thread_id": "1p1sikb"}
                                  # {"platform": "twitter", "author": "@handle"}
                                  # {"platform": "algoresearch", "file_path": "dataset/algoresearch/2025-10-21-bbca-earning.md"}
                                  # {"platform": "pdf", "file_path": "reports/analysis.pdf"}
    
    # === URLs (Optional) ===
    "urls": [str],                # Associated URLs (news sources, references, etc.)
    
    # === Ticker/Symbol Fields (Optional) ===
    "primary_tickers": [str],     # Main tickers discussed (e.g., ["BBCA", "TLKM"])
    "mentioned_tickers": [str],   # Tickers mentioned but not primary focus
    
    # === Sector/Industry Fields (Optional) ===
    "sectors": [str],             # Sectors discussed: "banking", "telecom", "mining", etc.
    "subsectors": [str],          # More granular: "digital_banking", "coal_mining", etc.
    "industries": [str],          # Industry classifications: "financial_services", "infrastructure", etc.
    
    # === Market Context Fields (Optional) ===
    "market_indices": [str],      # Relevant indices: "IHSG", "LQ45", "IDX30", etc.
}
```

## Document Type Specific Schemas

### 1. Market News (General, Sector, Macro)

```python
{
    "id": "stockbit:2025-10-31:market_cpo_forecast",
    "type": "market_news",
    "title": "Crude Palm Oil Futures for January 2026 Contract Fall to Lowest Since Early August 2025",
    "content": "The CPO forward price for the January 2026 contract fell by about -1.29%...",
    "document_date": "2025-10-31",
    "source": {
        "platform": "stockbit",
        "type": "market_news"
    },
    "urls": [],
    "sectors": ["palm_oil", "commodities"],
    "market_indices": ["CPO"]
}
```

### 2. Ticker News

```python
{
    "id": "stockbit:2025-10-31:tlkm_earnings",
    "type": "ticker_news",
    "title": "Telkom Indonesia (TLKM) Reports IDR 4.8 Trillion Net Profit in 3Q25",
    "content": "Telkom Indonesia (TLKM) recorded a net profit of 4.8 trillion rupiah in 3Q25...",
    "document_date": "2025-10-31",
    "source": {
        "platform": "stockbit",
        "type": "ticker_news"
    },
    "urls": [
        "https://www.idx.co.id/StaticData/NewsAndAnnouncement/..."
    ],
    "primary_tickers": ["TLKM"],
    "mentioned_tickers": [],
    "sectors": ["telecommunications"]
}
```

### 3. Weekly Market Summary

```python
{
    "id": "algoresearch:2025-10-13:weekly_summary",
    "type": "weekly_summary",
    "title": "Weekly Market Recap (2025-10-13)",
    "content": "IHSG closed up +1.72% WoW, trading at an overstretched level...",
    "document_date": "2025-10-13",
    "source": {
        "platform": "algoresearch",
        "file_path": "dataset/market-mood/2025-10-13.md",
        "period": "weekly"
    },
    "urls": [],
    "market_indices": ["IHSG", "LQ45", "Sri-Kehati"],
    "sectors": ["transportation", "energy", "infrastructure", "financial"]
}
```

### 4. Analysis

```python
{
    "id": "algoresearch:2025-10-21:bbca_earning",
    "type": "analysis",
    "title": "BBCA: 3Q25 Earnings Growth Slowed, But Plans IDR5tn Buyback",
    "content": "Bank Central Asia (BBCA) recently released its 3Q25 financial performance...",
    "document_date": "2025-10-21",
    "source": {
        "platform": "algoresearch",
        "file_path": "dataset/algoresearch/2025-10-21-bbca-earning.md",
        "type": "fundamental_analysis"
    },
    "urls": [],
    "primary_tickers": ["BBCA"],
    "sectors": ["banking"],
    "subsectors": ["commercial_banking"]
}
```

### 5. Rumour (Reddit)

```python
{
    "id": "reddit:1p1sikb",
    "type": "rumour",
    "title": "Fucking break that 1000 wall already BUVA 😭",
    "content": "Dari kemaren ni buva kerjaannya edging terus ga keluar2...",
    "document_date": "2025-11-01T12:04:52+07:00",  # Use post created time
    "source": {
        "platform": "reddit",
        "author": "GoldAttorney5350",
        "subreddit": "JudiSaham",
        "thread_id": "1p1sikb"
    },
    "urls": [
        "https://reddit.com/r/JudiSaham/comments/1p1sikb/...",
        "https://i.redd.it/kzrx13m3yb2g1.jpeg"
    ],
    "primary_tickers": ["BUVA"]
}
```

### 6. Rumour (Twitter)

```python
{
    "id": "twitter:inet_rumour_20251114",
    "type": "rumour",
    "title": "Rumors and Buzz about $INET Stock",
    "content": "Based on recent X (Twitter) posts... $INET has been a hot topic...",
    "document_date": "2025-11-14",  # Use ingestion/analysis date since multiple posts
    "source": {
        "platform": "twitter",
        "date_range_start": "2025-11-08",
        "date_range_end": "2025-11-15"
    },
    "urls": [
        "https://x.com/i/status/1986718373464698927",
        "https://x.com/i/status/1989234302912196638"
    ],
    "primary_tickers": ["INET"],
    "mentioned_tickers": ["PADA"]
}
```

## Embedding Strategy

### Overview

For documents up to 2k tokens, **long context embeddings** work well without chunking. The key decision is: **what content should you embed?**

**Recommendation**: Embed an **enriched version** that combines structured metadata with raw content for better retrieval quality.

### Unified Embedding Function

Use this single function for all document types:

```python
def prepare_embedding_text(doc: dict) -> str:
    """
    Prepare enriched content for embedding.
    Works for all document types (market_news, ticker_news, weekly_summary, analysis, rumour).
    
    Combines structured metadata with content to improve:
    - Company/ticker-specific queries
    - Sector/industry thematic queries
    - Temporal queries
    - Source-aware queries
    """
    parts = []
    
    # 1. Document type (helps distinguish news vs analysis vs rumours)
    doc_type = doc['type'].replace('_', ' ').title()
    parts.append(f"{doc_type}: {doc['title']}")
    
    # 2. Ticker context (if available)
    if doc.get('primary_tickers'):
        parts.append(f"Companies: {', '.join(doc['primary_tickers'])}")
    if doc.get('mentioned_tickers'):
        parts.append(f"Also mentioned: {', '.join(doc['mentioned_tickers'])}")
    
    # 3. Sector/industry context (if available)
    if doc.get('sectors'):
        parts.append(f"Sectors: {', '.join(doc['sectors'])}")
    if doc.get('subsectors'):
        parts.append(f"Subsectors: {', '.join(doc['subsectors'])}")
    if doc.get('industries'):
        parts.append(f"Industries: {', '.join(doc['industries'])}")
    
    # 4. Market indices (if available)
    if doc.get('market_indices'):
        parts.append(f"Markets: {', '.join(doc['market_indices'])}")
    
    # 5. Source context (important for rumours)
    if doc['type'] == 'rumour':
        platform = doc['source'].get('platform', 'social media')
        parts.append(f"Source: {platform} discussion")
    
    # 6. Temporal context
    parts.append(f"Date: {doc['document_date']}")
    
    # 7. Main content (most important - gets full weight)
    parts.append('')  # Empty line separator
    parts.append(doc['content'])
    
    return '\n'.join(parts)
```

### Example Outputs

**Ticker News**:

```
Ticker News: Telkom Indonesia (TLKM) Reports IDR 4.8 Trillion Net Profit in 3Q25
Companies: TLKM
Sectors: telecommunications
Date: 2025-10-31

Telkom Indonesia (TLKM) recorded a net profit of 4.8 trillion rupiah in 3Q25...
```

**Analysis**:

```
Analysis: BBCA: 3Q25 Earnings Growth Slowed, But Plans IDR5tn Buyback
Companies: BBCA
Sectors: banking
Subsectors: commercial_banking
Industries: financial_services
Date: 2025-10-21

Bank Central Asia (BBCA) recently released its 3Q25 financial performance...
```

**Rumour**:

```
Rumour: Fucking break that 1000 wall already BUVA 😭
Companies: BUVA
Source: reddit discussion
Date: 2025-11-01T12:04:52+07:00

Dari kemaren ni buva kerjaannya edging terus ga keluar2...
```

**Weekly Summary**:

```
Weekly Summary: Weekly Market Recap (2025-10-13)
Markets: IHSG, LQ45, Sri-Kehati
Sectors: transportation, energy, infrastructure, financial
Date: 2025-10-13

IHSG closed up +1.72% WoW, trading at an overstretched level...
```

### Why This Works

- ✅ **Semantic enrichment**: Metadata provides context that pure content might lack (e.g., ticker symbols are codes, not semantic words)
- ✅ **Query flexibility**: Works for both specific ("BBCA Q3 earnings") and broad ("banking sector performance") queries
- ✅ **Type awareness**: "Ticker News" vs "Analysis" vs "Rumour" prefix helps model distinguish document types
- ✅ **Source credibility**: Rumours are clearly marked with platform context
- ✅ **Temporal context**: Date enables time-aware retrieval
- ✅ **Efficient**: Only includes metadata that exists, stays well under 2k tokens

### Implementation

```python
def index_document(client: QdrantClient, doc: dict, embedding_model, bm25_model):
    """
    Index a document with enriched embeddings.
    """
    # Prepare enriched content for embedding
    embedding_text = prepare_embedding_text(doc)
    
    # Generate vectors from enriched text
    dense_vector = embedding_model.encode(embedding_text)
    sparse_vector = bm25_model.encode(embedding_text)
    
    # Store with ORIGINAL structured document as payload
    client.upsert(
        collection_name="investment_documents",
        points=[
            models.PointStruct(
                id=doc['id'],
                vector={
                    "dense": dense_vector.tolist(),
                    "sparse": sparse_vector
                },
                payload=doc  # Original document, NOT enriched text
            )
        ]
    )
```

**Critical**: Store the **original structured document** in payload, not the enriched embedding text. This keeps your data clean and queryable with filters.

## Indexing Strategy

### Keyword Indexes

Enable keyword indexing for efficient filtering:

```python
from qdrant_client import models

# Create payload indexes for fast filtering
indexes = {
    # Document classification
    "type": models.PayloadSchemaType.KEYWORD,
    
    # Ticker filtering
    "primary_tickers": models.PayloadSchemaType.KEYWORD,
    "mentioned_tickers": models.PayloadSchemaType.KEYWORD,
    
    # Sector/market/industry filtering
    "sectors": models.PayloadSchemaType.KEYWORD,
    "subsectors": models.PayloadSchemaType.KEYWORD,
    "industries": models.PayloadSchemaType.KEYWORD,
    "market_indices": models.PayloadSchemaType.KEYWORD,
    
    # Time-based queries
    "document_date": models.PayloadSchemaType.DATETIME,
}

# Apply indexes
for field_name, field_type in indexes.items():
    client.create_payload_index(
        collection_name="investment_documents",
        field_name=field_name,
        field_schema=field_type
    )
```

### Full-Text Search

Enable full-text search on content fields:

```python
text_index_fields = ["title", "content"]
```

## Common Query Patterns

### 1. Time-based Queries

```python
# Documents from last week
filter = models.Filter(
    must=[
        models.FieldCondition(
            key="document_date",
            range=models.DatetimeRange(
                gte="2025-10-25T00:00:00Z",
                lte="2025-11-01T23:59:59Z"
            )
        )
    ]
)

# Weekly summaries for Q4 2025
filter = models.Filter(
    must=[
        models.FieldCondition(
            key="type",
            match=models.MatchValue(value="weekly_summary")
        ),
        models.FieldCondition(
            key="document_date",
            range=models.DatetimeRange(
                gte="2025-10-01T00:00:00Z",
                lte="2025-12-31T23:59:59Z"
            )
        )
    ]
)
```

### 2. Ticker-based Queries

```python
# Documents about BBCA (primary or mentioned)
filter = models.Filter(
    should=[
        models.FieldCondition(
            key="primary_tickers",
            match=models.MatchAny(any=["BBCA"])
        ),
        models.FieldCondition(
            key="mentioned_tickers",
            match=models.MatchAny(any=["BBCA"])
        )
    ]
)

# Analysis about banking sector
filter = models.Filter(
    must=[
        models.FieldCondition(
            key="type",
            match=models.MatchValue(value="analysis")
        ),
        models.FieldCondition(
            key="sectors",
            match=models.MatchAny(any=["banking"])
        )
    ]
)
```

### 3. Source-based Queries

```python
# Rumours from Reddit about specific ticker
filter = models.Filter(
    must=[
        models.FieldCondition(
            key="type",
            match=models.MatchValue(value="rumour")
        ),
        models.FieldCondition(
            key="source.platform",
            match=models.MatchValue(value="reddit")
        ),
        models.FieldCondition(
            key="primary_tickers",
            match=models.MatchAny(any=["INET"])
        )
    ]
)

# Analysis from algoresearch
filter = models.Filter(
    must=[
        models.FieldCondition(
            key="type",
            match=models.MatchValue(value="analysis")
        ),
        models.FieldCondition(
            key="source.platform",
            match=models.MatchValue(value="algoresearch")
        )
    ]
)
```

### 4. Complex Multi-filter Queries

```python
# Recent analysis on banking stocks
filter = models.Filter(
    must=[
        models.FieldCondition(
            key="type",
            match=models.MatchAny(any=["analysis", "ticker_news"])
        ),
        models.FieldCondition(
            key="sectors",
            match=models.MatchAny(any=["banking"])
        ),
        models.FieldCondition(
            key="document_date",
            range=models.DatetimeRange(
                gte="2025-10-01T00:00:00Z"
            )
        )
    ]
)

# Exclude rumours when doing analysis
filter = models.Filter(
    must_not=[
        models.FieldCondition(
            key="type",
            match=models.MatchValue(value="rumour")
        )
    ]
)
```

### 5. Semantic Search with Filters

```python
# Hybrid search: semantic + filters
results = client.search(
    collection_name="investment_documents",
    query_vector=embedding_vector,
    query_filter=models.Filter(
        must=[
            models.FieldCondition(
                key="primary_tickers",
                match=models.MatchAny(any=["BBCA", "BMRI", "BBRI"])
            ),
            models.FieldCondition(
                key="document_date",
                range=models.DatetimeRange(
                    gte="2025-10-01T00:00:00Z"
                )
            )
        ]
    ),
    limit=10
)
```

## Best Practices

### 1. Data Normalization

- **Tickers**: Always uppercase (e.g., `"BBCA"`, not `"bbca"`)
- **Dates**:
  - Prefer date-only format: `"2025-10-31"`
  - For datetime: always include GMT+7 timezone: `"2025-10-31T14:30:00+07:00"`
  - Server/storage must preserve timezone information
- **Sectors/Industries**: Use lowercase with underscores (e.g., `"commercial_banking"`, `"financial_services"`)
- **Source platform**: Lowercase identifiers (e.g., `"reddit"`, `"twitter"`, `"stockbit"`)

### 2. Document ID Strategy

Use **deterministic UUID v4** generated from content hash:

```python
import uuid
import hashlib

def generate_document_id(source_identifier: str) -> str:
    """
    Generate deterministic UUID v4 from source identifier.
    Same input always produces same UUID.
    """
    # Create hash from source identifier
    hash_bytes = hashlib.sha256(source_identifier.encode()).digest()
    # Generate UUID v4 from first 16 bytes
    return str(uuid.UUID(bytes=hash_bytes[:16], version=4))

# Examples:
id = generate_document_id("reddit:1p1sikb")  
# -> "a3f2b8c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c"

id = generate_document_id("stockbit:2025-10-31:tlkm_earnings")
# -> "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d"

id = generate_document_id(f"algoresearch:{file_path}")
# -> "9d8e7f6a-5b4c-43d2-a1b0-c9d8e7f6a5b4"
```

### 3. Source Metadata Patterns

Common `source` field patterns:

```python
# Stockbit news
{"platform": "stockbit", "type": "ticker_news"}

# Reddit post
{"platform": "reddit", "subreddit": "JudiSaham", "author": "username", "thread_id": "abc123"}

# Twitter aggregated
{"platform": "twitter", "date_range_start": "2025-11-08", "date_range_end": "2025-11-15"}

# Algoresearch analysis
{"platform": "algoresearch", "file_path": "dataset/algoresearch/2025-10-21-bbca-earning.md"}

# PDF document
{"platform": "pdf", "file_path": "reports/q3-2025-analysis.pdf", "author": "analyst_name"}
```

## Example Implementation

### Collection Setup

Based on the knowledge-service implementation:

```python
from qdrant_client import QdrantClient, models
from datetime import datetime

client = QdrantClient(host="localhost", port=6333)

# Create collection with hybrid vectors matching knowledge-service
client.create_collection(
    collection_name="investment_documents",
    vectors_config={
        # Dense embeddings: Qwen 8B via OpenRouter (2048 dimensions)
        "dense": models.VectorParams(
            size=2048,  # Qwen embedding dimension
            distance=models.Distance.COSINE,
            hnsw_config=models.HnswConfigDiff(
                on_disk=True  # Store on disk for large collections
            )
        ),
        # Late interaction: ColBERT multi-vectors (64 dimensions)
        "late": models.VectorParams(
            size=64,  # ColBERT token embedding dimension
            distance=models.Distance.COSINE,
            multivector_config=models.MultiVectorConfig(
                comparator=models.MultiVectorComparator.MAX_SIM
            ),
            hnsw_config=models.HnswConfigDiff(m=0)  # Disable HNSW for late interaction
        ),
    },
    sparse_vectors_config={
        # Sparse embeddings: BM42 (SPLADE-like with IDF modifier)
        "splade": models.SparseVectorParams(
            modifier=models.Modifier.IDF,  # Required for BM42 models
            index=models.SparseIndexParams(
                on_disk=True
            )
        ),
    }
)
```

### Create Payload Indexes

```python
# Create indexes for metadata filtering
indexes = {
    "type": models.PayloadSchemaType.KEYWORD,
    "primary_tickers": models.PayloadSchemaType.KEYWORD,
    "mentioned_tickers": models.PayloadSchemaType.KEYWORD,
    "sectors": models.PayloadSchemaType.KEYWORD,
    "subsectors": models.PayloadSchemaType.KEYWORD,
    "industries": models.PayloadSchemaType.KEYWORD,
    "market_indices": models.PayloadSchemaType.KEYWORD,
    "document_date": models.PayloadSchemaType.DATETIME,
}

for field_name, field_type in indexes.items():
    client.create_payload_index(
        collection_name="investment_documents",
        field_name=field_name,
        field_schema=field_type
    )
```

### Document Ingestion

```python
import uuid
import hashlib
from typing import Dict, Any

def generate_document_id(source_identifier: str) -> str:
    """Generate deterministic UUID v4 from source identifier."""
    hash_bytes = hashlib.sha256(source_identifier.encode()).digest()
    return str(uuid.UUID(bytes=hash_bytes[:16], version=4))

def prepare_embedding_text(doc: dict) -> str:
    """Prepare enriched content for embedding (see Embedding Strategy section)."""
    parts = []
    doc_type = doc['type'].replace('_', ' ').title()
    parts.append(f"{doc_type}: {doc['title']}")
    
    if doc.get('primary_tickers'):
        parts.append(f"Companies: {', '.join(doc['primary_tickers'])}")
    if doc.get('sectors'):
        parts.append(f"Sectors: {', '.join(doc['sectors'])}")
    if doc.get('industries'):
        parts.append(f"Industries: {', '.join(doc['industries'])}")
    if doc.get('market_indices'):
        parts.append(f"Markets: {', '.join(doc['market_indices'])}")
    
    if doc['type'] == 'rumour':
        platform = doc['source'].get('platform', 'social media')
        parts.append(f"Source: {platform} discussion")
    
    parts.append(f"Date: {doc['document_date']}")
    parts.append('')
    parts.append(doc['content'])
    
    return '\n'.join(parts)

async def index_document(
    embedding_service,  # Your EmbeddingService instance
    qdrant_service,     # Your QdrantService instance
    doc: Dict[str, Any]
):
    """
    Index a document with all three vector types.
    """
    # Generate document ID
    source_id = f"{doc['source']['platform']}:{doc.get('original_id', doc['title'][:50])}"
    doc_id = generate_document_id(source_id)
    
    # Prepare enriched text for embedding
    embedding_text = prepare_embedding_text(doc)
    
    # Generate all embeddings (dense, late, splade)
    embeddings = await embedding_service.embed_documents([embedding_text])
    vectors = embeddings[0]
    
    # Prepare point for Qdrant
    point = {
        "id": doc_id,
        "payload": doc,  # Store original structured document
        "vectors": {
            "dense": vectors["dense"],      # 2048-dim Qwen embedding
            "late": vectors["late"],        # ColBERT multi-vectors (N x 64)
            "splade": vectors["splade"]     # BM42 sparse vector {idx: weight}
        }
    }
    
    # Upsert to Qdrant
    await qdrant_service.upsert_documents([point])

# Example document
document = {
    "id": generate_document_id("algoresearch:2025-10-21:bbca_earning"),
    "type": "analysis",
    "title": "BBCA: 3Q25 Earnings Growth Slowed, But Plans IDR5tn Buyback",
    "content": "Bank Central Asia (BBCA) recently released...",
    "document_date": "2025-10-21",  # Date-only format
    "source": {
        "platform": "algoresearch",
        "file_path": "dataset/algoresearch/2025-10-21-bbca-earning.md"
    },
    "urls": [],
    "primary_tickers": ["BBCA"],
    "sectors": ["banking"],
    "subsectors": ["commercial_banking"],
    "industries": ["financial_services"]
}

# await index_document(embedding_service, qdrant_service, document)
```

### Hybrid Search

```python
async def search_documents(
    embedding_service,
    qdrant_service,
    query: str,
    filters: Dict[str, Any] = None,
    limit: int = 10
):
    """
    Search with hybrid retrieval: dense + splade prefetch, late rerank.
    """
    # Generate query embeddings
    query_vectors = await embedding_service.embed_query(query)
    
    # Build Qdrant query filters
    query_filter = None
    if filters:
        conditions = []
        
        # Example: Filter by ticker
        if filters.get('tickers'):
            conditions.append(
                models.FieldCondition(
                    key="primary_tickers",
                    match=models.MatchAny(any=filters['tickers'])
                )
            )
        
        # Example: Filter by date range
        if filters.get('date_from') or filters.get('date_to'):
            conditions.append(
                models.FieldCondition(
                    key="document_date",
                    range=models.DatetimeRange(
                        gte=filters.get('date_from'),
                        lte=filters.get('date_to')
                    )
                )
            )
        
        # Example: Filter by type
        if filters.get('types'):
            conditions.append(
                models.FieldCondition(
                    key="type",
                    match=models.MatchAny(any=filters['types'])
                )
            )
        
        if conditions:
            query_filter = models.Filter(must=conditions)
    
    # Hybrid search with late interaction reranking
    max_limit = min(limit * 3, 100)  # Prefetch more candidates
    
    results = qdrant_service.client.query_points(
        collection_name="investment_documents",
        prefetch=[
            # Prefetch from dense embeddings
            models.Prefetch(
                query=query_vectors["dense"],
                using="dense",
                limit=max_limit,
                filter=query_filter
            ),
            # Prefetch from sparse embeddings
            models.Prefetch(
                query=models.SparseVector(**query_vectors["splade"]),
                using="splade",
                limit=max_limit,
                filter=query_filter
            ),
        ],
        # Final reranking with ColBERT late interaction
        query=query_vectors["late"],
        using="late",
        limit=limit,
        query_filter=query_filter,
        with_payload=True
    )
    
    return [point.model_dump() for point in results.points]

# Example usage
results = await search_documents(
    embedding_service,
    qdrant_service,
    query="BBCA quarterly earnings",
    filters={
        "tickers": ["BBCA"],
        "types": ["ticker_news", "analysis"],
        "date_from": "2025-10-01T00:00:00Z"
    },
    limit=10
)
```

### Integration with Knowledge Service

Your existing knowledge-service already has the embedding infrastructure. To integrate the investment document schema:

1. **Update the ingestion endpoint** (`app/api/routes.py`):

```python
@router.post("/api/v1/ingest/investment")
async def ingest_investment_documents(request: InvestmentIngestRequest):
    """Ingest investment documents with proper schema."""
    for doc in request.documents:
        # Validate schema
        assert doc['type'] in ['market_news', 'ticker_news', 'weekly_summary', 'analysis', 'rumour']
        
        # Generate enriched embedding text
        embedding_text = prepare_embedding_text(doc)
        
        # Use existing embedding service
        embeddings = await embedding_service.embed_documents([embedding_text])
        
        # Upsert with proper ID and payload
        await qdrant_service.upsert_documents([{
            "id": doc['id'],
            "payload": doc,
            "vectors": embeddings[0]
        }])
```

2. **Add metadata filtering** to search endpoint:

```python
@router.post("/api/v1/search")
async def search(request: SearchRequest):
    # Build filters from request
    filters = {}
    if request.tickers:
        filters['tickers'] = request.tickers
    if request.date_from:
        filters['date_from'] = request.date_from
    # ... etc
    
    return await search_documents(
        embedding_service,
        qdrant_service,
        query=request.query,
        filters=filters,
        limit=request.limit
    )
```

## Notes

- This schema supports **hybrid search** with dense and sparse vectors
- Temporal queries use **indexed datetime fields** for performance
- The schema is **extensible** - add new fields without breaking existing queries
- **Source metadata** is flexible - add platform-specific fields as needed
- **Document types** clearly separate use cases for different query patterns
