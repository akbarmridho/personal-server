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
from app.core.config import settings
from typing import List, Dict, Any, Optional

router = APIRouter()

# Services initialized at startup
embedding_service = None
qdrant_service = None

async def initialize_services():
    global embedding_service, qdrant_service
    embedding_service = EmbeddingService()
    qdrant_service = QdrantService()
    await qdrant_service._ensure_collection()

def get_services():
    return embedding_service, qdrant_service

@router.post("/documents", response_model=Dict[str, Any])
async def ingest_documents(request: InvestmentIngestRequest):
    """
    Ingest investment documents into the knowledge base.
    
    Documents must include:
    - id: Document ID (provided by caller)
    - type: One of news, filing, analysis, rumour
    - content, document_date, source (required)
    - Optional metadata: title, symbols, subsectors, subindustries, etc.
    
    Uses enriched embeddings combining metadata with content for better retrieval.
    Includes deduplication check to avoid storing similar documents within a date range.
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
    
    # Check for duplicates
    non_duplicate_docs = []
    non_duplicate_embeddings = []
    skipped_count = 0
    skipped_docs = []
    
    for doc, vectors in zip(documents, batch_embeddings):
        # Check if document with same ID already exists
        existing_doc = await qdrant_svc.retrieve(doc["id"])
        
        if existing_doc:
            # Document with same ID exists, allow update (no deduplication check)
            non_duplicate_docs.append(doc)
            non_duplicate_embeddings.append(vectors)
        else:
            # New document, check for duplicates (only for news type)
            similar_docs = await qdrant_svc.find_similar_documents(
                query_vectors=vectors,
                document_date=doc["document_date"],
                document_type=doc["type"],
                similarity_threshold=settings.DEDUPLICATION_SIMILARITY_THRESHOLD,
                date_range_days=settings.DEDUPLICATION_DATE_RANGE_DAYS
            )
            
            if similar_docs:
                # Skip this document as it's too similar to existing ones
                skipped_count += 1
                skipped_docs.append({
                    "id": doc["id"],
                    "title": doc.get("title", "No title"),
                    "similar_to": similar_docs[0]["id"],
                    "similarity_score": similar_docs[0]["score"]
                })
            else:
                # No similar documents found, include this one
                non_duplicate_docs.append(doc)
                non_duplicate_embeddings.append(vectors)
    
    # Combine embeddings with original document payloads
    processed_docs = []
    for doc, vectors in zip(non_duplicate_docs, non_duplicate_embeddings):
        processed_docs.append({
            "id": doc["id"],
            "payload": doc,  # Store original structured document
            "vectors": vectors
        })
        
    # Upsert non-duplicate documents to Qdrant
    if processed_docs:
        await qdrant_svc.upsert_documents(processed_docs)
    
    response = {
        "status": "success",
        "count": len(processed_docs),
        "skipped_count": skipped_count
    }
    
    # Include details about skipped documents if any
    if skipped_docs:
        response["skipped_documents"] = skipped_docs
    
    return response

@router.post("/documents/search", response_model=List[SearchResult])
async def search_documents(request: InvestmentSearchRequest):
    """
    Search for documents using hybrid retrieval with metadata filtering.
    
    Supports filtering by:
    - symbols: List of symbols
    - subsectors: List of subsectors
    - subindustries: List of subindustries
    - types: List of document types
    - date_from/date_to: Date range filtering (ISO format)
    - pure_sector: Filter for documents without symbols (pure sector/market news)
    """
    emb_svc, qdrant_svc = get_services()
    
    # Embed query
    query_vectors = await emb_svc.embed_query(request.query)
    
    # Build filter from request parameters
    filters = {}
    if request.symbols:
        filters['symbols'] = request.symbols
    if request.subsectors:
        filters['subsectors'] = request.subsectors
    if request.subindustries:
        filters['subindustries'] = request.subindustries
    if request.types:
        filters['types'] = request.types
    if request.date_from:
        filters['date_from'] = request.date_from
    if request.date_to:
        filters['date_to'] = request.date_to
    if request.pure_sector is not None:
        filters['pure_sector'] = request.pure_sector
    
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

@router.get("/documents/{document_id}", response_model=Dict[str, Any])
async def get_document(document_id: str):
    """
    Retrieve a document by its ID.
    """
    _, qdrant_svc = get_services()

    document = await qdrant_svc.retrieve(document_id)

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return document

@router.delete("/documents/{document_id}", response_model=Dict[str, Any])
async def delete_document(document_id: str):
    """
    Delete a document by its ID.
    """
    _, qdrant_svc = get_services()

    deleted = await qdrant_svc.delete_document(document_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")

    return {"status": "success", "message": f"Document {document_id} deleted"}

@router.get("/documents", response_model=Dict[str, Any])
async def list_documents(
    limit: int = Query(default=10, ge=1, le=100),
    offset: Optional[int] = Query(default=None, ge=0),
    symbols: Optional[List[str]] = Query(default=None),
    subsectors: Optional[List[str]] = Query(default=None),
    subindustries: Optional[List[str]] = Query(default=None),
    types: Optional[List[DocumentType]] = Query(default=None),
    date_from: Optional[str] = Query(default=None),
    date_to: Optional[str] = Query(default=None),
    pure_sector: Optional[bool] = Query(default=None)
):
    """
    List/scroll through documents with optional metadata filtering.

    Supports filtering by:
    - symbols: List of symbols
    - subsectors: List of subsectors
    - subindustries: List of subindustries
    - types: List of document types
    - date_from/date_to: Date range filtering (ISO format)
    - pure_sector: Filter for documents without symbols (pure sector/market news)

    Pagination:
    - limit: Number of results per page (1-100)
    - offset: Numeric pagination offset from previous response's next_page_offset (default: 0)
    """
    _, qdrant_svc = get_services()
    
    # Build filter from query parameters
    filters = {}
    if symbols:
        filters['symbols'] = symbols
    if subsectors:
        filters['subsectors'] = subsectors
    if subindustries:
        filters['subindustries'] = subindustries
    if types:
        filters['types'] = types
    if date_from:
        filters['date_from'] = date_from
    if date_to:
        filters['date_to'] = date_to
    if pure_sector is not None:
        filters['pure_sector'] = pure_sector
    
    scroll_filter = qdrant_svc.build_filter(filters) if filters else None
    
    # Scroll with filter
    result = await qdrant_svc.scroll(
        limit=limit,
        offset=offset,
        scroll_filter=scroll_filter
    )
    
    return result

@router.post("/admin/enable-indexing")
async def enable_indexing():
    """
    Enable indexing for the existing collection.
    This will create payload indexes and update HNSW configuration.
    """
    _, qdrant_svc = get_services()
    
    try:
        await qdrant_svc.enable_indexing()
        return {
            "status": "success",
            "message": "Indexing enabled for collection"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

