from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.models.api import IngestRequest, SearchRequest, SearchResult
from app.services.embeddings import EmbeddingService
from app.services.qdrant import QdrantService
from typing import List, Dict, Any
import uuid

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

@router.post("/ingest", response_model=Dict[str, str])
async def ingest_documents(request: IngestRequest):
    """
    Ingest documents into the knowledge base using batch processing.
    """
    emb_svc, qdrant_svc = get_services()
    
    # Extract texts and prepare document metadata
    texts = [doc.text for doc in request.documents]
    doc_metadata = [
        {
            "id": doc.id if doc.id else str(uuid.uuid4()),
            "text": doc.text,
            "metadata": doc.metadata
        }
        for doc in request.documents
    ]
    
    # Generate embeddings in batch (with batch size of 50 for optimal performance)
    batch_embeddings = await emb_svc.embed_documents(texts, batch_size=50)
    
    # Combine embeddings with document metadata
    processed_docs = []
    for i, (doc_meta, vectors) in enumerate(zip(doc_metadata, batch_embeddings)):
        processed_docs.append({
            "id": doc_meta["id"],
            "payload": {
                "text": doc_meta["text"],
                **doc_meta["metadata"]
            },
            "vectors": vectors
        })
        
    # Upsert to Qdrant
    await qdrant_svc.upsert_documents(processed_docs)
    
    return {"status": "success", "count": len(processed_docs)}

@router.post("/search", response_model=List[SearchResult])
async def search_documents(request: SearchRequest):
    """
    Search for documents using hybrid retrieval.
    """
    emb_svc, qdrant_svc = get_services()
    
    # Embed query
    query_vectors = await emb_svc.embed_query(request.query)
    
    # Search
    results = await qdrant_svc.search(query_vectors, limit=request.limit)
    
    return [
        SearchResult(
            id=str(point["id"]),
            score=point["score"],
            payload=point["payload"]
        )
        for point in results
    ]

@router.get("/documents", response_model=Dict[str, Any])
async def list_documents(limit: int = 10, offset: str = None):
    """
    List documents (scroll).
    """
    _, qdrant_svc = get_services()
    
    result = await qdrant_svc.scroll(limit=limit, offset=offset)
    
    return result
