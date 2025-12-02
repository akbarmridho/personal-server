# Knowledge Service

A FastAPI-based knowledge retrieval service implementing hybrid search using multiple embedding strategies:

- **Dense Embeddings**: Voyage AI finance model
- **Late Interaction (ColBERT)**: Pylate with mixedbread-ai/mxbai-edge-colbert-v0-32m
- **Smart Sparse (BM42)**: FastEmbed BM42 model

## Features

- Hybrid search combining dense, sparse, and late interaction embeddings
- Custom chunking with Chonkie for handling long documents
- Qdrant vector database integration
- FastAPI REST API with async support
- Collection management and document ingestion

## Architecture

```
apps/knowledge-service/
├── app/
│   ├── api/
│   │   └── routes.py          # API endpoints
│   ├── core/
│   │   └── config.py          # Configuration
│   ├── models/
│   │   └── api.py             # Pydantic models
│   ├── services/
│   │   ├── embeddings.py      # Multi-model embedding service
│   │   ├── qdrant.py          # Vector DB operations
│   │   └── text_processing.py # Text chunking
│   └── main.py                # FastAPI application
├── Dockerfile
├── docker-compose.yaml
└── requirements.txt
```

## Setup

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_COLLECTION_NAME=news
VOYAGE_API_KEY=your_api_key_here
```

### Installation

#### With Docker Compose

```bash
docker-compose up -d
```

This will start:

- Knowledge Service on port 8016
- Qdrant on ports 6333 (HTTP) and 6334 (gRPC)

#### Manual Installation

```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

### Health Check

```bash
GET /health
```

### Ingest Documents

```bash
POST /api/v1/ingest
Content-Type: application/json

{
  "documents": [
    {
      "text": "Your document text here",
      "metadata": {
        "title": "Document Title",
        "source": "example"
      },
      "id": "optional-custom-id"
    }
  ]
}
```

### Search Documents

```bash
POST /api/v1/search
Content-Type: application/json

{
  "query": "Your search query",
  "limit": 10
}
```

### List Documents

```bash
GET /api/v1/documents?limit=10&offset=<next_page_offset>
```

## How It Works

### Document Ingestion

1. **Chunking**: Long documents (>512 tokens) are chunked with overlap
2. **Embedding Generation**:
   - Dense vectors via Voyage AI
   - ColBERT multi-vectors via Pylate
   - BM42 sparse vectors via FastEmbed (with chunking and max aggregation)
3. **Storage**: All vectors stored in Qdrant with metadata

### Search

1. Query is embedded using all models
2. Qdrant performs hybrid search:
   - Prefetch candidates from dense and sparse_smart
   - Rerank using ColBERT late interaction
3. Results returned with scores and payloads

## Development

### Project Structure

- `app/api/`: API route handlers
- `app/core/`: Configuration and settings
- `app/models/`: Request/response models
- `app/services/`: Business logic and model integrations

### Adding New Models

1. Add model initialization in `app/services/embeddings.py`
2. Update `app/services/qdrant.py` collection config if adding new vector types
3. Update API models in `app/models/api.py` if needed

## References

Based on implementation patterns from:

- `ai-apps/investment/playgrounds/ingest.ipynb`
- `ai-apps/investment/playgrounds/query.ipynb`
