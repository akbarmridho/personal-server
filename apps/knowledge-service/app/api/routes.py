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
async def ingest_documents(request: IngestRequest, background_tasks: BackgroundTasks):
    """
    Ingest documents into the knowledge base.
    """
    emb_svc, qdrant_svc = get_services()
    
    # Process in background or foreground? 
    # For large batches, background is better, but user might want confirmation.
    # We'll do it in foreground for now to ensure errors are caught, 
    # or maybe chunk processing.
    
    processed_docs = []
    
    for doc in request.documents:
        # Generate embeddings
        vectors = await emb_svc.embed_document(doc.text)
        
        doc_id = doc.id if doc.id else str(uuid.uuid4())
        
        processed_docs.append({
            "id": doc_id,
            "payload": {
                "text": doc.text,
                **doc.metadata
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
