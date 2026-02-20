# KB Backend - Investment Knowledge Base Backend

Backend service for Indonesian stock market analysis with AI/LLM integrations, document ingestion pipelines, and comprehensive market data APIs.

## Architecture Overview

Main server and internal services run via PM2 (see `ecosystem.config.cjs`):

### 1. Main KB Backend Server (`src/index.ts`)
Port: `HTTP_SERVER_PORT` (default: 3010)

Multi-layer architecture using Express as a proxy router:

```
┌─────────────────────────────────────────────────────────┐
│              Express Proxy (Main Entry Point)            │
│                    Port: HTTP_SERVER_PORT                │
├─────────────────────────────────────────────────────────┤
│  /mcps/stock         → Stock MCP Server (httpStream)     │
│  /api/inngest        → Inngest (durable execution)       │
│  /*                  → Elysia HTTP API Server            │
└─────────────────────────────────────────────────────────┘
```

### Components

1. **Express Proxy Server** (`src/index.ts`)
   - Main entry point that routes requests to specialized servers
   - Handles graceful shutdown and error handling

2. **Stock MCP Server** (`src/stock/mcp.ts`)
   - FastMCP server with httpStream transport (stateless)
   - Provides MCP tools for stock analysis and knowledge base access
   - Returns YAML-formatted responses (better for nested data in LLMs)

3. **Elysia HTTP API Server** (`src/server.ts`)
   - REST API with Swagger documentation (Scalar UI)
   - Provides HTTP endpoints for stock market data
   - Graceful shutdown support with `graceful-server-elysia`

4. **Inngest Durable Execution** (`src/infrastructure/inngest.ts`)
   - Background job orchestration with checkpointing
   - Event-driven data ingestion pipelines
   - Automatic failure notifications via Discord

## Technology Stack

- **Runtime**: Node.js >=24
- **Language**: TypeScript (ESM modules)
- **Web Frameworks**:
  - Express (proxy layer)
  - Elysia.js with Node adapter (HTTP API)
  - FastMCP (MCP server)
- **Database**: PostgreSQL with Kysely query builder
- **Background Jobs**: Inngest (durable execution with retry/checkpointing)
- **Process Manager**: PM2

## Data Ingestion Pipeline (`src/data-modules/`)

Inngest-powered pipelines for ingesting investment documents from multiple sources:

### Sources

1. **AlgoResearch** (`algoresearch/`)
   - Research articles and analysis scraping
   - Event: `data/algoresearch-crawl`, `data/algoresearch-scrape`, `data/algoresearch-ingest`

2. **Brokerage Research Reports**
   - **Samuel Sekuritas** (`samuel-sekuritas/`)
     - Company reports: `data/samuel-company-report-ingest`
     - Morning briefs (PDF): `data/samuel-morning-brief-ingest`
   - **Kiwoom Sekuritas** (`kiwoom-sekuritas/`)
     - Daily news: `data/kiwoom-daily-news-ingest`
     - International news: `data/kiwoom-international-news-ingest`
     - Equity reports: `data/kiwoom-equity-report-ingest`
   - **HP Sekuritas** (`hp-sekuritas/`)
     - Stock updates: `data/hp-stock-update-ingest`
     - Market updates: `data/hp-market-update-ingest`
   - **KISI Sekuritas** (`kisi-sekuritas/`)
     - Monthly research: `data/kisi-monthly-research-ingest`

3. **Corporate Filings** (`stockbit-filing/`)
   - Stockbit official company announcements and regulatory filings
   - **Three Report Types**:
     - RUPS (Rapat Umum Pemegang Saham) - Annual General Meetings
     - CORPORATE_ACTION - M&A, JVs, divestitures, acquisitions
     - OTHER - Various regulatory announcements
   - **Smart Filtering**: Keyword-based with AND/OR logic, excludes financial reports and dividends
   - **LLM Processing**: OpenRouter Google Gemini 2.5 Flash for PDF summarization
   - **Events**: `data/stockbit-filing-crawl`, `data/stockbit-announcement-ingest`
   - **Document Type**: "filing"
   - **Features**: Incremental crawl with state management, configurable concurrency

4. **Social Media & Newsletters**
   - **Twitter/X** (`twitter/`)
     - Rumour scraping: `data/twitter-rumour-scrape`
   - **Snips Newsletter** (`snips-newsletter/`)
     - Newsletter scraping: `data/snips-scrape`
     - Part ingestion: `data/snips-part`
   - **YouTube** (`youtube/`)
     - Channel crawling: `data/youtube-crawl`
     - Video ingestion: `data/youtube-ingest`
     - Tips ingestion: `data/youtube-ingest-tips`

5. **Manual Ingestion**
   - **API Endpoint** (`manual/`)
     - HTTP endpoint for manual document submission
     - Event: `data/document-manual-ingest`
   - **Discord Bot** (`discord-manual/`)
     - Discord slash commands for user-friendly document submission
     - **PDF Ingestion** (`/ingest-pdf [url|file]`):
       - URL mode: Direct PDF URLs or Google Drive links
       - File mode: Upload PDF files (max 10MB)
       - LLM extraction with Google Gemini for content structuring
       - Event: `data/pdf-manual-ingest`
     - **Text Ingestion** (`/ingest-text [input|file]`):
       - Input mode: Manual text entry (max 4000 chars)
       - File mode: Upload .txt/.md/.markdown files (max 5MB)
       - Types: "news" or "analysis"
       - Event: `data/document-manual-ingest`
     - **Features**: Modal-based interactions, file validation, deterministic IDs (UUID v5)
     - **Files**: `discord-commands.ts`, `pdf-processor.ts`

6. **Company Profiles** (`profiles/`)
   - Company master data updates
   - Sector/subsector/industry mapping

### Ingestion Flow

```
Crawl → Scrape → Parse → Tag → Ingest to Knowledge Service → Discord Notification
```

- **Crawl**: Discover new content (scheduled via Inngest cron)
- **Scrape**: Extract raw content from sources
- **Parse**: Process PDFs, HTML, images, videos
- **Tag**: Auto-tag with symbols, sectors, subsectors (LLM or DB lookup)
- **Ingest**: Send to knowledge-service for vector embedding
- **Notify**: Post to Discord channels (analysis/rumour channel)

### Notifications

- **Discord Integration** (`src/infrastructure/discord.ts`)
  - **Ingestion Notifications**: `notify/discord-kb-ingest`
    - Automatic notifications for completed document ingestion
  - **Failure Notifications**: Inngest function failure handler
    - Rate-limited (2 per 6h for failures)
    - Skips backfill data (>30 days old)
  - **Manual Ingestion Bot** (`src/data-modules/discord-manual/`)
    - Discord slash commands for user-driven document submission
    - Supports PDF and text ingestion via `/ingest-pdf` and `/ingest-text`
    - Interactive modals for metadata input
    - Real-time feedback on ingestion status

## Stock Market API (`src/stock/`)

Dual-interface design: Same functionality exposed as both **HTTP REST endpoints** and **MCP tools**.

### Available as Both HTTP & MCP

1. **Sector/Company Lookup**
   - `GET /stock-market-id/sectors` | `get-sectors`
   - `GET /stock-market-id/sectors/report` | (MCP: commented out)
   - `GET /stock-market-id/stock` | `get-companies`

2. **Stock Analysis**
   - `GET /stock-market-id/stock/:symbol/fundamental` | `get-stock-fundamental`
   - `GET /stock-market-id/stock/:symbol/bandarmology` | `get-stock-bandarmology`
   - `GET /stock-market-id/stock/:symbol/financials` | `get-stock-financials`
   - `GET /stock-market-id/stock/:symbol/management` | `get-stock-governance` (MCP combines management + ownership)
   - `GET /stock-market-id/stock/:symbol/ownership` | (included in `get-stock-governance`)
   - `GET /stock-market-id/stock/:symbol/technical` | `get-stock-technical`

3. **Market Data**
   - `GET /stock-market-id/ihsg/technical` | (MCP: commented out)
   - `GET /stock-market-id/forex` | (MCP: commented out)
   - `GET /stock-market-id/commodity` | (MCP: commented out)

4. **Trading Playbooks** (`src/stock/skills/catalog/`)
   - `GET /stock-market-id/playbook/gc-oversold/:symbol` | `get-gc-stoch-psar-signal`
     - Golden Cross + Stochastic Oversold + PSAR swing trading setup
     - Phases: FORMING, READY, TRIGGERED, ACTIVE
   - `GET /stock-market-id/playbook/bottom-fishing/:symbol` | `get-bottom-fishing-signal`
     - Bottom fishing during market crashes
     - Weekly RSI, Volume Spikes, Heikin Ashi patterns
     - Phases: WATCHING, MINOR_OPPORTUNITY, MAJOR_ALERT, CAPITULATION_DETECTED, REVERSAL_CONFIRMED

5. **Authentication**
   - `POST /stock-market-id/stockbit-auth/set` - Set captured Stockbit client profile (proxy URL + captured request headers)

6. **Stock Universe Management**
   - `POST /stock-market-id/stock-universe/add` - Add symbols to stock universe and trigger initial crawl
   - `POST /stock-market-id/stock-universe/sync-all` - Sync all symbols in stock universe
   - `POST /stock-market-id/stock-universe/sync/:symbol` - Sync specific symbol (validates symbol exists in universe first)
   - `GET /stock-market-id/stock-universe/list` - List all symbols in stock universe

### Knowledge Base HTTP Endpoints

Document management endpoints that proxy to knowledge-service (`src/knowledge/http.ts`):

1. **List Documents**: `GET /knowledge/documents`
   - Query params: `limit`, `offset`, `symbols`, `subsectors`, `types`, `date_from`, `date_to`, `pure_sector`
   - Returns paginated document list with 100-token content previews
   - Used by ai-frontend timeline view

2. **Search Documents**: `POST /knowledge/documents/search`
   - Body: `{ query, limit?, symbols?, subsectors?, types?, date_from?, date_to?, pure_sector? }`
   - Semantic search with hybrid retrieval (dense + sparse vectors)
   - Returns documents with similarity scores

3. **Get Document**: `GET /knowledge/documents/:documentId`
   - Returns single document with full payload
   - Used by ai-frontend document detail page
   - Returns 404 if not found

4. **Update Document**: `PUT /knowledge/documents/:documentId`
   - Body: Full `InvestmentDocument` payload (type, content, document_date, source, optional metadata)
   - Updates document by re-ingesting with same ID via `updateDocument()` method
   - Performs full replacement of document content and metadata
   - Returns ingest response with count and skipped_count

5. **Delete Document**: `DELETE /knowledge/documents/:documentId`
   - Permanently removes document from knowledge base
   - Returns 404 if document not found
   - Calls `deleteDocument()` method which proxies to knowledge-service

**KnowledgeService Class Methods** (`src/infrastructure/knowledge-service.ts`):

- `ingestDocuments(request)` - Ingest/update documents with deduplication
- `listDocuments(params)` - List with filters and pagination
- `listDocumentsPreview(params)` - List with 100-token content previews
- `searchDocuments(request)` - Semantic search
- `getDocument(documentId)` - Retrieve single document
- `deleteDocument(documentId)` - Delete document (calls knowledge-service DELETE endpoint)
- `updateDocument(documentId, payload)` - Update document (reuses ingest endpoint with same ID)

### MCP-Only Features

Available only through Stock MCP Server:

1. **Knowledge Service Integration** (`src/infrastructure/knowledge-service.ts`)
   - `get-document` - Retrieve full document by ID
   - `list-documents` - List with filters (returns snapshots with 100 token preview)
   - `search-documents` - Semantic search with similarity scores

2. **Skills Catalog** (`src/stock/skills/`)
   - `list-skills` - List all available modular knowledge
   - `get-skill` - Retrieve specific skill (broker info, calculation methods, etc.)

3. **Twitter Search** (`src/stock/twitter-search.ts`)
   - `search-twitter` - Search X/Twitter for Indonesian stock discussions
   - Supports multiple queries, date ranges, trusted accounts prioritization
   - Extracts insights from posts and images (charts, screeners, flow data)

### Data Sources

- **Stockbit** - Primary data source for Indonesian stocks
- **Yahoo Finance** (`yahoo-finance2`) - International data
- **TradingView** - Technical indicators
- **Custom aggregators** - Sector reports, company profiles

## AI/LLM Integration

### Supported Providers

- **Google AI**: `@ai-sdk/google`, `@google/genai`
- **OpenAI**: `@ai-sdk/openai`, `openai`
- **xAI**: `@ai-sdk/xai`
- **OpenRouter**: `@openrouter/ai-sdk-provider`
- **Vercel AI SDK**: `ai` (unified interface)
- **Voyage AI**: `voyageai` (embeddings)

### Use Cases

- Document content tagging (symbols, sectors, subsectors)
- Sentiment analysis
- Twitter content extraction from images
- Summary generation

## Document Processing

Comprehensive document processing pipeline:

- **PDF**: `pdf-lib`, `pdfjs-dist`
- **Web Scraping**: `playwright`, `cheerio`, `jsdom`
- **HTML to Markdown**: `dom-to-semantic-markdown`, `turndown`
- **Markdown**: `remark-parse`, `unified`, `gray-matter`
- **Text Splitting**: `@langchain/textsplitters`
- **Image Processing**: `sharp`
- **Token Counting**: `js-tiktoken`

## Technical Analysis

- **Indicators**: `@thuantan2060/technicalindicators`, `trading-signals`
- **Market Data**: `yahoo-finance2`
- **Holidays**: `date-holidays`

## Scripts

- `pnpm build` - Compile TypeScript
- `pnpm start` - Run compiled JavaScript
- `pnpm ts-run` - Run TypeScript with SWC (fast compilation)
- `pnpm run` - Start with PM2 (production)
- `pnpm migrate` - Run database migrations with dbmate
- `pnpm kysely:gen` - Generate Kysely types from database schema
- `pnpm playwright` - Install Playwright browsers
- `pnpm mcp-inspector` - Launch MCP inspector for debugging

## Database

PostgreSQL with Kysely query builder for type-safe queries.

**Migrations**: `./src/infrastructure/db/migrations/`

```bash
# Run migrations
pnpm migrate

# Generate types from schema
pnpm kysely:gen
```

## Configuration

Environment variables managed via:

- `@dotenvx/dotenvx` - Encrypted .env support
- `@t3-oss/env-core` - Zod validation
- File: `./src/infrastructure/env.ts`

### Key Variables

- `HTTP_SERVER_PORT` - Main proxy server port (default: 3010)
- `API_SERVER_PORT` - Elysia HTTP server port (default: 10001)
- `STOCK_MCP_PORT` - Stock MCP server port (default: 10004)
- `INNGEST_BASE_URL` - Inngest server URL
- `INNGEST_EVENT_KEY` - Inngest event key
- `INNGEST_SIGNING_KEY` - Inngest signing key
- `DISCORD_CHANNEL_*` - Discord webhook channels

## API Documentation

Swagger UI available at:

- HTTP endpoint: `http://localhost:{HTTP_SERVER_PORT}/docs`
- Provider: Scalar (modern Swagger UI)

## MCP Server Access

Stock MCP server accessible at:

- Endpoint: `http://localhost:{HTTP_SERVER_PORT}/mcps/stock`
- Transport: `httpStream` (SSE-based, stateless)
- Format: YAML responses (optimized for LLMs)

To test with MCP Inspector:

```bash
pnpm mcp-inspector
```

## Logging

Structured logging with Pino:

- Pretty printing in development (`pino-pretty`)
- JSON logging in production
- Request/response logging via `@bogeychan/elysia-logger`

## Error Handling

- Elysia global error handler
- Inngest automatic retries with checkpointing
- Discord notifications for Inngest failures
- Graceful shutdown on SIGINT/SIGTERM

See @../../README.md for port allocation and deployment info.
