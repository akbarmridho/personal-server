from fastembed import LateInteractionTextEmbedding, SparseTextEmbedding
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import  Literal
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Initialize models
late_model = LateInteractionTextEmbedding(model_name="answerdotai/answerai-colbert-small-v1")
sparse_model = SparseTextEmbedding(model_name="Qdrant/bm42-all-minilm-l6-v2-attentions")

# Thread pool for CPU-bound operations
executor = ThreadPoolExecutor(max_workers=2)

# Pydantic models for request/response
class EmbeddingRequest(BaseModel):
    contents: list[str]
    type: Literal["query", "document"]

class SparseEmbeddingResponse(BaseModel):
    embeddings: list[dict[str, float]]

class LateEmbeddingResponse(BaseModel):
    embeddings: list[list[list[float]]]

# FastAPI app
app = FastAPI(title="Embedding Service", description="Service for sparse and late interaction embeddings")

def batch_embeddings_late(contents: list[str], embed_type: Literal["query", "document"]) -> list[list[list[float]]]:
    """Generate late interaction embeddings in batches"""
    all_embeddings: list[list[list[float]]] = []
    
    for i in range(0, len(contents), 100):
        batch = contents[i:i+100]
        if embed_type == "query":
            embeddings = list(late_model.query_embed(batch))
        else:  # document
            embeddings = list(late_model.passage_embed(batch))

        all_embeddings.extend([e.tolist() for e in embeddings])
    
    return all_embeddings

def batch_embeddings_sparse(contents: list[str], embed_type: Literal["query", "document"]) -> list[dict[str, float]]:
    """Generate sparse embeddings in batches"""
    all_embeddings: list[dict[int, float]] = []
    
    for i in range(0, len(contents), 100):
        batch = contents[i:i+100]
        if embed_type == "query":
            embeddings = list(sparse_model.query_embed(batch))
        else:  # document
            embeddings = list(sparse_model.passage_embed(batch))
        all_embeddings.extend([e.as_dict() for e in embeddings])
    
    return all_embeddings

@app.post("/embed/sparse", response_model=SparseEmbeddingResponse)
async def embed_sparse(request: EmbeddingRequest):
    """
    Generate sparse embeddings for the given contents
    """
    try:
        loop = asyncio.get_event_loop()
        embeddings = await loop.run_in_executor(executor, batch_embeddings_sparse, request.contents, request.type)
        return SparseEmbeddingResponse(embeddings=embeddings)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating sparse embeddings: {str(e)}")

@app.post("/embed/late", response_model=LateEmbeddingResponse)
async def embed_late(request: EmbeddingRequest):
    """
    Generate late interaction embeddings for the given contents
    """
    try:
        loop = asyncio.get_event_loop()
        embeddings = await loop.run_in_executor(executor, batch_embeddings_late, request.contents, request.type)
        return LateEmbeddingResponse(embeddings=embeddings)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating late interaction embeddings: {str(e)}")

@app.get("/")
async def root():
    return {"message": "Embedding Service API", "endpoints": ["/embed/sparse", "/embed/late"]}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)