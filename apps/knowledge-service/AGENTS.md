# Knowledge Service - Investment Document Knowledge Base

Python-based service for managing investment-related documents using Qdrant vector database with hybrid search (dense + sparse vectors).

## Overview

Unified knowledge service for storing and querying investment documents with flexible metadata filtering and semantic search.

## Document Types

1. **News** - Market news, sector updates, ticker-specific news
2. **Filing** - Official company documents (annual reports, quarterly statements, announcements)
3. **Analysis** - In-depth research from various sources
4. **Rumour** - Social media threads from Reddit, Twitter, etc.

## Technology Stack

- **Language**: Python
- **Framework**: FastAPI (likely, based on typical Python service structure)
- **Vector Database**: Qdrant (for hybrid search with dense + sparse vectors)
- **Deployment**: Docker + Docker Compose

## Key Features

### Hybrid Search

- Dense vectors for semantic similarity
- Sparse vectors for keyword matching
- Configurable fusion algorithms

### Metadata Filtering

- **Symbols**: Stock ticker filtering (e.g., BBCA, TLKM)
- **Subsectors**: Broad categories (financials, infrastructure, energy)
- **Subindustries**: Specific industries (banks, toll_roads, coal_mining)
- **Indices**: Market index tracking (IHSG, LQ45, IDX30)
- **Temporal**: Date range filtering with ISO 8601 support

### Deduplication

- Automatic deduplication within configurable time windows (default: ±7 days)
- Similarity threshold for duplicate detection (default: 0.87)
- Only applies to "news" type documents
- Transparent reporting of skipped duplicates

## Configuration

Environment variables:

- `DEDUPLICATION_SIMILARITY_THRESHOLD` - Minimum similarity score (default: 0.87)
- `DEDUPLICATION_DATE_RANGE_DAYS` - Days to check for duplicates (default: 7)

## API Endpoints

### Core Endpoints

1. **POST `/documents`** - Ingest documents with automatic deduplication
   - **Request**: `{ documents: InvestmentDocument[] }`
   - **Response**: `{ status: "success", count: number, skipped_count: number, skipped_documents?: [...] }`
   - Supports upsert: If document ID exists, updates without dedup check
   - Deduplication: Only for "news" type, within ±7 days, similarity >0.87

2. **GET `/documents/{document_id}`** - Retrieve single document by ID
   - **Response**: Document payload with id and full metadata
   - Returns 404 if not found

3. **GET `/documents`** - List/scroll documents with filtering
   - **Query params**: `limit`, `offset`, `symbols`, `subsectors`, `subindustries`, `types`, `date_from`, `date_to`, `pure_sector`
   - **Response**: `{ items: [...], next_page_offset?: number }`
   - Ordered by document_date DESC

4. **POST `/documents/search`** - Semantic search with metadata filtering
   - **Request**: `{ query: string, limit?, symbols?, subsectors?, types?, date_from?, date_to?, pure_sector? }`
   - **Response**: `[{ id, score, payload }]`
   - Hybrid search (dense + sparse + ColBERT vectors)

5. **DELETE `/documents/{document_id}`** - Delete document by ID
   - **Response**: `{ status: "success", message: "Document {id} deleted" }`
   - Returns 404 if document not found
   - Permanent deletion (cannot be undone)

6. **POST `/admin/enable-indexing`** - Enable HNSW indexing for collection
   - Used after backfilling to improve query performance
   - Creates payload indexes for metadata fields

## Document Schema

See @README.md for complete payload structure and population rules.

### Core Fields (Required)

- `id` - UUID v4 from content hash
- `type` - Document type (news/filing/analysis/rumour)
- `title` - Document title
- `content` - Text content for embedding
- `document_date` - ISO 8601 date/datetime (GMT+7)
- `source` - Source metadata dict

### Optional Fields

- `urls` - Associated URLs
- `symbols` - Stock tickers
- `subsectors` - Broad categories
- `subindustries` - Specific industries
- `indices` - Market indices

## Date Format Support

Multiple formats supported:

- ISO 8601: `2025-01-15T14:30:00+07:00`, `2025-01-15T14:30:00Z`
- Date only: `2025-01-15`
- Common: `15/01/2025`, `01/15/2025`, `15-01-2025`
- With time: `15/01/2025 14:30:00`

## Population Rules

1. **Symbols**: Always uppercase, extracted from text or metadata
2. **Subsectors/Subindustries**:
   - If symbols present: Look up from master database
   - If no symbols: LLM analysis of content
3. **Indices**: Only for documents explicitly about the index

## Deduplication Strategy

1. Check if document ID exists (update if yes)
2. For new documents, search within ±7 days
3. Compare dense vector similarity (not hybrid score)
4. Skip if similarity > 0.87
5. Only applies to "news" type

See @README.md for detailed schema and design documentation.
