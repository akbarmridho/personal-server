from qdrant_client import QdrantClient, models
from app.core.config import settings
from app.services.embeddings import EmbeddingService
from typing import List, Dict, Any
import uuid

class QdrantService:
    def __init__(self):
        self.client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
        self.collection_name = settings.QDRANT_COLLECTION_NAME
        self._ensure_collection()

    def _ensure_collection(self):
        if not self.client.collection_exists(self.collection_name):
            print(f"Creating collection {self.collection_name}...")
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config={
                    "dense": models.VectorParams(
                        size=EmbeddingService.DENSE_DIMENSION,
                        distance=models.Distance.COSINE,
                        hnsw_config=models.HnswConfigDiff(
                            on_disk=True
                        )
                    ),
                    "late": models.VectorParams(
                        size=EmbeddingService.COLBERT_DIMENSION,
                        distance=models.Distance.COSINE,
                        multivector_config=models.MultiVectorConfig(
                            comparator=models.MultiVectorComparator.MAX_SIM,
                        ),
                        hnsw_config=models.HnswConfigDiff(m=0)
                    ),
                },
                sparse_vectors_config={
                    "splade": models.SparseVectorParams(
                        modifier=models.Modifier.IDF, # this modifier is required for BM42 models only. other sparse embedding/true splade doesn't need this
                        index=models.SparseIndexParams(
                            on_disk=True,
                        )
                    ),
                }
            )
            print("Collection created.")

    async def upsert_documents(self, documents: List[Dict[str, Any]]):
        """
        Upsert processed documents (with embeddings) to Qdrant.
        documents: List of dicts with 'id', 'payload', 'vectors'
        """
        points = []
        for doc in documents:
            points.append(models.PointStruct(
                id=doc.get("id", str(uuid.uuid4())),
                payload=doc.get("payload", {}),
                vector=doc["vectors"]
            ))
            
        self.client.upsert(
            collection_name=self.collection_name,
            points=points,
            wait=True
        )

    # todo metadata filter
    async def search(self, query_vectors: Dict[str, Any], limit: int = 10) -> List[Dict[str, Any]]:
        """
        Search using hybrid retrieval (Fusion).
        """

        max_limit = min(limit * 3, 100)

        # Prefetch from all sources
        results = self.client.query_points(
            collection_name=self.collection_name,
            prefetch=[
                models.Prefetch(
                    query=query_vectors["dense"],
                    using="dense",
                    limit=max_limit
                ),
                models.Prefetch(
                    query=models.SparseVector(**query_vectors["splade"]),
                    using="splade",
                    limit=max_limit
                ),
            ],
            query=query_vectors["late"],
            using="late",
            limit=limit,
            with_payload=True
        )
        
        return [point.model_dump() for point in results.points]

    # todo update this?
    async def scroll(self, limit: int = 10, offset: str = None) -> Dict[str, Any]:
        """
        Scroll through documents.
        """
        results, next_page_offset = self.client.scroll(
            collection_name=self.collection_name,
            limit=limit,
            offset=offset,
            with_payload=True,
            with_vectors=False
        )
        
        return {
            "items": [point.model_dump() for point in results],
            "next_page_offset": next_page_offset
        }
