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
            self._create_payload_indexes()
    
    def _create_payload_indexes(self):
        """Create payload indexes for efficient filtering on metadata fields."""
        print("Creating payload indexes...")
        
        indexes = {
            # Document classification
            "type": models.PayloadSchemaType.KEYWORD,
            
            # Ticker filtering
            "primary_tickers": models.PayloadSchemaType.KEYWORD,
            "mentioned_tickers": models.PayloadSchemaType.KEYWORD,
            
            # Sector/market/industry filtering
            "sectors": models.PayloadSchemaType.KEYWORD,
            "subsectors": models.PayloadSchemaType.KEYWORD,
            "industries": models.PayloadSchemaType.KEYWORD,
            "market_indices": models.PayloadSchemaType.KEYWORD,
            
            # Time-based queries
            "document_date": models.PayloadSchemaType.DATETIME,
        }
        
        for field_name, field_type in indexes.items():
            try:
                self.client.create_payload_index(
                    collection_name=self.collection_name,
                    field_name=field_name,
                    field_schema=field_type
                )
                print(f"  Created index for {field_name}")
            except Exception as e:
                # Index might already exist
                print(f"  Index for {field_name} already exists or error: {e}")
        
        print("Payload indexes created.")

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

    def build_filter(self, filters: Dict[str, Any]) -> models.Filter:
        """
        Build Qdrant filter from dict parameters.
        
        Args:
            filters: Dict with optional keys: tickers, sectors, industries, types, date_from, date_to
            
        Returns:
            Qdrant Filter object
        """
        conditions = []
        
        # Ticker filtering (search in both primary and mentioned)
        if filters.get('tickers'):
            conditions.append(
                models.Filter(
                    should=[
                        models.FieldCondition(
                            key="primary_tickers",
                            match=models.MatchAny(any=filters['tickers'])
                        ),
                        models.FieldCondition(
                            key="mentioned_tickers",
                            match=models.MatchAny(any=filters['tickers'])
                        )
                    ]
                )
            )
        
        # Sector filtering
        if filters.get('sectors'):
            conditions.append(
                models.FieldCondition(
                    key="sectors",
                    match=models.MatchAny(any=filters['sectors'])
                )
            )
        
        # Industry filtering
        if filters.get('industries'):
            conditions.append(
                models.FieldCondition(
                    key="industries",
                    match=models.MatchAny(any=filters['industries'])
                )
            )
        
        # Document type filtering
        if filters.get('types'):
            # Convert enum values to strings if needed
            types = [t.value if hasattr(t, 'value') else t for t in filters['types']]
            conditions.append(
                models.FieldCondition(
                    key="type",
                    match=models.MatchAny(any=types)
                )
            )
        
        # Date range filtering
        if filters.get('date_from') or filters.get('date_to'):
            date_range = {}
            if filters.get('date_from'):
                date_range['gte'] = filters['date_from']
            if filters.get('date_to'):
                date_range['lte'] = filters['date_to']
            
            conditions.append(
                models.FieldCondition(
                    key="document_date",
                    range=models.DatetimeRange(**date_range)
                )
            )
        
        if not conditions:
            return None
        
        return models.Filter(must=conditions)

    async def search(
        self, 
        query_vectors: Dict[str, Any], 
        limit: int = 10,
        query_filter: models.Filter = None
    ) -> List[Dict[str, Any]]:
        """
        Search using hybrid retrieval with optional filtering.
        
        Args:
            query_vectors: Dict with 'dense', 'late', and 'splade' vectors
            limit: Number of results to return
            query_filter: Optional Qdrant Filter object for metadata filtering
        """

        max_limit = min(limit * 3, 100)

        # Prefetch from all sources
        results = self.client.query_points(
            collection_name=self.collection_name,
            prefetch=[
                models.Prefetch(
                    query=query_vectors["dense"],
                    using="dense",
                    limit=max_limit,
                    filter=query_filter
                ),
                models.Prefetch(
                    query=models.SparseVector(**query_vectors["splade"]),
                    using="splade",
                    limit=max_limit,
                    filter=query_filter
                ),
            ],
            query=query_vectors["late"],
            using="late",
            limit=limit,
            query_filter=query_filter,
            with_payload=True
        )
        
        return [point.model_dump() for point in results.points]

    async def scroll(
        self, 
        limit: int = 10, 
        offset: str = None,
        scroll_filter: models.Filter = None
    ) -> Dict[str, Any]:
        """
        Scroll through documents with optional filtering.
        
        Args:
            limit: Number of results per page
            offset: Pagination offset
            scroll_filter: Optional Qdrant Filter object for metadata filtering
        """
        results, next_page_offset = self.client.scroll(
            collection_name=self.collection_name,
            limit=limit,
            offset=offset,
            scroll_filter=scroll_filter,
            with_payload=True,
            with_vectors=False
        )
        
        return {
            "items": [point.model_dump() for point in results],
            "next_page_offset": next_page_offset
        }
