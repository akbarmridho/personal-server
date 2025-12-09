from qdrant_client import AsyncQdrantClient, models
from app.core.config import settings
from app.services.embeddings import EmbeddingService
from typing import List, Dict, Any
import uuid

class QdrantService:
    def __init__(self):
        self.client = AsyncQdrantClient(host=settings.QDRANT_HOST, timeout=180, prefer_grpc=True)
        self.collection_name = settings.QDRANT_COLLECTION_NAME

    async def _ensure_collection(self):
        """Create collection with indexing disabled by default for efficient backfilling."""
        if not await self.client.collection_exists(self.collection_name):
            print(f"Creating collection {self.collection_name} with indexing disabled...")
            await self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config={
                    "dense": models.VectorParams(
                        size=EmbeddingService.DENSE_DIMENSION,
                        distance=models.Distance.COSINE,
                        on_disk=True,
                        datatype=models.Datatype.FLOAT16,
                        hnsw_config=models.HnswConfigDiff(m=0)  # Indexing disabled
                    ),
                    "late": models.VectorParams(
                        size=EmbeddingService.BGE_M3_COLBERT_DIMENSION,
                        distance=models.Distance.COSINE,
                        multivector_config=models.MultiVectorConfig(
                            comparator=models.MultiVectorComparator.MAX_SIM,
                        ),
                        on_disk=True,
                        hnsw_config=models.HnswConfigDiff(m=0),  # Indexing disabled
                        quantization_config=models.BinaryQuantization(
                            binary=models.BinaryQuantizationConfig(
                                always_ram=False,
                                encoding=models.BinaryQuantizationEncoding.ONE_BIT,
                            ),
                        ),
                    ),
                },
                sparse_vectors_config={
                    "sparse": models.SparseVectorParams(
                        index=models.SparseIndexParams(
                            on_disk=True,
                            datatype=models.Datatype.FLOAT16
                        )
                    ),
                }
            )
            print("Collection created with indexing disabled.")
    
    async def enable_indexing(self):
        """Enable indexing for the existing collection (only for dense vector, late vector remains disabled)."""
        if not await self.client.collection_exists(self.collection_name):
            raise ValueError(f"Collection {self.collection_name} does not exist.")
            
        print(f"Enabling indexing for collection {self.collection_name}...")
        
        # Update vector configs to enable indexing only for dense vector
        await self.client.update_collection(
            collection_name=self.collection_name,
            vectors_config={
                "dense": models.VectorParamsDiff(
                    hnsw_config=models.HnswConfigDiff(
                        m=16,  # Default value for indexing
                        ef_construct=100,  # Default value for indexing
                    )
                ),
                # Keep late vector indexing disabled as intended
                "late": models.VectorParamsDiff(
                    hnsw_config=models.HnswConfigDiff(m=0)
                )
            }
        )
        
        # Create payload indexes
        await self._create_payload_indexes()
        print("Indexing enabled for dense vector (late vector remains disabled).")
    
    async def _create_payload_indexes(self):
        """Create payload indexes for efficient filtering on metadata fields."""
        print("Creating payload indexes...")
        
        indexes = {
            # Document classification
            "type": models.PayloadSchemaType.KEYWORD,
            
            # Symbol filtering
            "symbols": models.PayloadSchemaType.KEYWORD,
            
            # Subsector/subindustry filtering
            "subsectors": models.PayloadSchemaType.KEYWORD,
            "subindustries": models.PayloadSchemaType.KEYWORD,
            "indices": models.PayloadSchemaType.KEYWORD,
            
            # Time-based queries
            "document_date": models.PayloadSchemaType.DATETIME,
        }
        
        for field_name, field_type in indexes.items():
            try:
                await self.client.create_payload_index(
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
            
        await self.client.upsert(
            collection_name=self.collection_name,
            points=points,
            wait=False
        )

    def build_filter(self, filters: Dict[str, Any]) -> models.Filter:
        """
        Build Qdrant filter from dict parameters.
        
        Args:
            filters: Dict with optional keys: symbols, subsectors, subindustries, types, date_from, date_to
            
        Returns:
            Qdrant Filter object
        """
        conditions = []
        
        # Symbol filtering
        if filters.get('symbols'):
            conditions.append(
                models.FieldCondition(
                    key="symbols",
                    match=models.MatchAny(any=filters['symbols'])
                )
            )
        
        # Subsector filtering
        if filters.get('subsectors'):
            conditions.append(
                models.FieldCondition(
                    key="subsectors",
                    match=models.MatchAny(any=filters['subsectors'])
                )
            )
        
        # Subindustry filtering
        if filters.get('subindustries'):
            conditions.append(
                models.FieldCondition(
                    key="subindustries",
                    match=models.MatchAny(any=filters['subindustries'])
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
            query_vectors: Dict with 'dense', 'late', and 'sparse' vectors
            limit: Number of results to return
            query_filter: Optional Qdrant Filter object for metadata filtering
        """

        max_limit = min(limit * 3, 100)

        # Prefetch from all sources
        results = await self.client.query_points(
            collection_name=self.collection_name,
            prefetch=[
                models.Prefetch(
                    query=query_vectors["dense"],
                    using="dense",
                    limit=max_limit,
                    filter=query_filter
                ),
                models.Prefetch(
                    query=query_vectors["sparse"],
                    using="sparse",
                    limit=max_limit,
                    filter=query_filter
                ),
            ],
            query=query_vectors["late"],
            using="late",
            limit=limit,
            query_filter=query_filter,
            with_payload=True,
            timeout=60
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
        results, next_page_offset = await self.client.scroll(
            collection_name=self.collection_name,
            limit=limit,
            offset=offset,
            scroll_filter=scroll_filter,
            with_payload=True,
            with_vectors=False,
            timeout=60
        )
        
        return {
            "items": [point.model_dump() for point in results],
            "next_page_offset": next_page_offset
        }
