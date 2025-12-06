from fastapi import APIRouter, HTTPException, Query
from app.models.investment import (
    InvestmentIngestRequest, 
    InvestmentSearchRequest, 
    SearchResult,
    DocumentType
)
from app.services.embeddings import EmbeddingService
from app.services.qdrant import QdrantService
from app.services.document_processing import prepare_embedding_text, validate_document_schema
from typing import List, Dict, Any, Optional

router = APIRouter()

# Initialize services (lazy load or startup event preferred, but global for simplicity here)
# In a real app, use dependency injection or lifespan events.
embedding_service = None
qdrant_service = None

def get_services():
    global embedding_service, qdrant_service
    if not embedding_service:
        embedding_service = EmbeddingService()
    if not qdrant_service:
        qdrant_service = QdrantService()
    return embedding_service, qdrant_service

@router.post("/documents", response_model=Dict[str, str])
async def ingest_documents(request: InvestmentIngestRequest):
    """
    Ingest investment documents into the knowledge base.
    
    Documents must include:
    - id: Document ID (provided by caller)
    - type: One of news, weekly_summary, analysis, rumour
    - content, document_date, source (required)
    - Optional metadata: title, tickers, sectors, industries, etc.
    
    Uses enriched embeddings combining metadata with content for better retrieval.
    """
    emb_svc, qdrant_svc = get_services()
    
    # Convert Pydantic models to dicts for processing
    documents = [doc.model_dump() for doc in request.documents]
    
    # Validate each document
    for doc in documents:
        try:
            validate_document_schema(doc)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    # Prepare enriched texts for embedding
    enriched_texts = [prepare_embedding_text(doc) for doc in documents]
    
    # Generate embeddings in batch (with batch size of 50 for optimal performance)
    batch_embeddings = await emb_svc.embed_documents(enriched_texts, batch_size=50)
    
    # Combine embeddings with original document payloads
    processed_docs = []
    for doc, vectors in zip(documents, batch_embeddings):
        processed_docs.append({
            "id": doc["id"],
            "payload": doc,  # Store original structured document
            "vectors": vectors
        })
        
    # Upsert to Qdrant
    await qdrant_svc.upsert_documents(processed_docs)
    
    return {"status": "success", "count": len(processed_docs)}

@router.post("/documents/search", response_model=List[SearchResult])
async def search_documents(request: InvestmentSearchRequest):
    """
    Search for documents using hybrid retrieval with metadata filtering.
    
    Supports filtering by:
    - tickers: List of ticker symbols
    - sectors: List of sectors
    - industries: List of industries
    - types: List of document types
    - date_from/date_to: Date range filtering (ISO format)
    """
    emb_svc, qdrant_svc = get_services()
    
    # Embed query
    query_vectors = await emb_svc.embed_query(request.query)
    
    # Build filter from request parameters
    filters = {}
    if request.tickers:
        filters['tickers'] = request.tickers
    if request.sectors:
        filters['sectors'] = request.sectors
    if request.industries:
        filters['industries'] = request.industries
    if request.types:
        filters['types'] = request.types
    if request.date_from:
        filters['date_from'] = request.date_from
    if request.date_to:
        filters['date_to'] = request.date_to
    
    query_filter = qdrant_svc.build_filter(filters) if filters else None
    
    # Search with filter
    results = await qdrant_svc.search(
        query_vectors, 
        limit=request.limit,
        query_filter=query_filter
    )
    
    return [
        SearchResult(
            id=str(point["id"]),
            score=point["score"],
            payload=point["payload"]
        )
        for point in results
    ]

@router.get("/documents", response_model=Dict[str, Any])
async def list_documents(
    limit: int = Query(default=10, ge=1, le=100),
    offset: Optional[str] = Query(default=None),
    tickers: Optional[List[str]] = Query(default=None),
    sectors: Optional[List[str]] = Query(default=None),
    industries: Optional[List[str]] = Query(default=None),
    types: Optional[List[DocumentType]] = Query(default=None),
    date_from: Optional[str] = Query(default=None),
    date_to: Optional[str] = Query(default=None)
):
    """
    List/scroll through documents with optional metadata filtering.
    
    Supports filtering by:
    - tickers: List of ticker symbols
    - sectors: List of sectors
    - industries: List of industries
    - types: List of document types
    - date_from/date_to: Date range filtering (ISO format)
    
    Pagination:
    - limit: Number of results per page (1-100)
    - offset: Pagination offset from previous response's next_page_offset
    """
    _, qdrant_svc = get_services()
    
    # Build filter from query parameters
    filters = {}
    if tickers:
        filters['tickers'] = tickers
    if sectors:
        filters['sectors'] = sectors
    if industries:
        filters['industries'] = industries
    if types:
        filters['types'] = types
    if date_from:
        filters['date_from'] = date_from
    if date_to:
        filters['date_to'] = date_to
    
    scroll_filter = qdrant_svc.build_filter(filters) if filters else None
    
    # Scroll with filter
    result = await qdrant_svc.scroll(
        limit=limit, 
        offset=offset,
        scroll_filter=scroll_filter
    )
    
    return result
