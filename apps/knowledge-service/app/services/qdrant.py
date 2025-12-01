from qdrant_client import QdrantClient, models
from app.core.config import settings
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
                    "dense": models.VectorParams(size=1024, distance=models.Distance.COSINE),
                    "late": models.VectorParams(
                        size=128, # mxbai-edge-colbert-v0-32m is 128 dim
                        distance=models.Distance.COSINE,
                        multivector_config=models.MultiVectorConfig(
                            comparator=models.MultiVectorComparator.MAX_SIM,
                        ),
                        hnsw_config=models.HnswConfigDiff(m=0)
                    ),
                },
                sparse_vectors_config={
                    "sparse_smart": models.SparseVectorParams(modifier=models.Modifier.IDF),
                    "sparse_exact": models.SparseVectorParams(
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

    async def search(self, query_vectors: Dict[str, Any], limit: int = 10) -> List[Dict[str, Any]]:
        """
        Search using hybrid retrieval (Fusion).
        """
        # Prefetch from all sources
        prefetch = [
            models.Prefetch(
                query=query_vectors["dense"],
                using="dense",
                limit=limit * 2
            ),
            models.Prefetch(
                query=models.SparseVector(**query_vectors["sparse_smart"]),
                using="sparse_smart",
                limit=limit * 2
            ),
            models.Prefetch(
                query=models.SparseVector(**query_vectors["sparse_exact"]),
                using="sparse_exact",
                limit=limit * 2
            ),
            # Late interaction usually used as rescorer or main query?
            # In ingest.ipynb/query.ipynb, late is used as the main query with prefetch from others?
            # "query=batch_embeddings_late([query])[0], using='late', prefetch=[...]"
            # Yes, Late Interaction is the most expensive/accurate, so we use it to rerank/search 
            # on candidates from others, or just use it as main search if index supports it.
            # Qdrant supports Multivector search.
        ]
        
        # If we use Late as the main query, it will rescore the prefetched results?
        # Or we can use Fusion.
        # The user's query.ipynb uses Late as main query and Dense/Sparse as prefetch.
        # I will follow that pattern.
        
        results = self.client.query_points(
            collection_name=self.collection_name,
            prefetch=prefetch,
            query=query_vectors["late"],
            using="late",
            limit=limit,
            with_payload=True
        )
        
        return [point.model_dump() for point in results.points]

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
