from qdrant_client import AsyncQdrantClient, models
from app.core.config import settings
from app.services.embeddings import EmbeddingService
from typing import List, Dict, Any
import uuid
from datetime import datetime, timedelta

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

            # Source filtering (nested field)
            "source.name": models.PayloadSchemaType.KEYWORD,
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
            filters: Dict with optional keys:
                - symbols: List of stock symbols to match
                - subsectors: List of subsectors to match
                - subindustries: List of subindustries to match
                - types: List of document types to match
                - date_from: Start date for range filter (ISO format)
                - date_to: End date for range filter (ISO format)
                - pure_sector: Three-state symbol filter
                    * True: Only documents WITHOUT symbols (pure sector/market news)
                    * False: Only documents WITH symbols (ticker-specific news)
                    * None/not provided: No filter on symbols (show all documents)
                - source_names: List of source.name values to match

        Returns:
            Qdrant Filter object with must/must_not clauses, or None if no filters
        """
        must_conditions = []
        must_not_conditions = []

        # Pure sector filtering - three-state behavior
        if filters.get('pure_sector') is True:
            # Filter for documents WITHOUT symbols (pure sector/market news)
            must_conditions.append(
                models.IsEmptyCondition(
                    is_empty=models.PayloadField(
                        key="symbols",
                    ),
                )
            )
        elif filters.get('pure_sector') is False:
            # Filter for documents WITH symbols (ticker-specific news)
            # To check NOT empty, we use must_not with IsEmptyCondition
            must_not_conditions.append(
                models.IsEmptyCondition(
                    is_empty=models.PayloadField(
                        key="symbols",
                    ),
                )
            )
        # else: pure_sector is None/not provided - no filter on symbols

        # Symbol filtering
        if filters.get('symbols'):
            must_conditions.append(
                models.FieldCondition(
                    key="symbols",
                    match=models.MatchAny(any=filters['symbols'])
                )
            )

        # Subsector filtering
        if filters.get('subsectors'):
            must_conditions.append(
                models.FieldCondition(
                    key="subsectors",
                    match=models.MatchAny(any=filters['subsectors'])
                )
            )

        # Subindustry filtering
        if filters.get('subindustries'):
            must_conditions.append(
                models.FieldCondition(
                    key="subindustries",
                    match=models.MatchAny(any=filters['subindustries'])
                )
            )

        # Document type filtering
        if filters.get('types'):
            # Convert enum values to strings if needed
            types = [t.value if hasattr(t, 'value') else t for t in filters['types']]
            must_conditions.append(
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

            must_conditions.append(
                models.FieldCondition(
                    key="document_date",
                    range=models.DatetimeRange(**date_range)
                )
            )

        # Source name filtering (nested field)
        if filters.get('source_names'):
            must_conditions.append(
                models.FieldCondition(
                    key="source.name",
                    match=models.MatchAny(any=filters['source_names'])
                )
            )

        # Return None if no filters
        if not must_conditions and not must_not_conditions:
            return None

        # Build filter with both must and must_not clauses
        filter_params = {}
        if must_conditions:
            filter_params['must'] = must_conditions
        if must_not_conditions:
            filter_params['must_not'] = must_not_conditions

        return models.Filter(**filter_params)

    async def search(
        self,
        query_vectors: Dict[str, Any],
        limit: int = 10,
        query_filter: models.Filter = None,
        use_dense: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Search using hybrid retrieval with optional filtering.

        Args:
            query_vectors: Dict with 'dense', 'late', and 'sparse' vectors
            limit: Number of results to return
            query_filter: Optional Qdrant Filter object for metadata filtering
            use_dense: Whether to use dense vector in search (default: True)
        """

        max_limit = min(limit * 3, 100)

        # Build prefetch list conditionally based on use_dense
        prefetch = []

        if use_dense and query_vectors.get("dense") is not None:
            # Include dense vector prefetch
            prefetch.append(
                models.Prefetch(
                    query=query_vectors["dense"],
                    using="dense",
                    limit=max_limit,
                    filter=query_filter
                )
            )

        # Always include sparse prefetch
        prefetch.append(
            models.Prefetch(
                query=query_vectors["sparse"],
                using="sparse",
                limit=max_limit,
                filter=query_filter
            )
        )

        # Search with late interaction reranking
        results = await self.client.query_points(
            collection_name=self.collection_name,
            prefetch=prefetch,
            query=query_vectors["late"],
            using="late",
            limit=limit,
            query_filter=query_filter,
            with_payload=True,
            timeout=60
        )

        return [point.model_dump() for point in results.points]

    async def retrieve(self, document_id: str) -> Dict[str, Any]:
        """
        Retrieve a document by its ID.

        Args:
            document_id: The document ID

        Returns:
            Document dict with id, payload, and vectors
        """
        point = await self.client.retrieve(
            collection_name=self.collection_name,
            ids=[document_id],
            with_payload=True,
            with_vectors=False
        )

        if not point:
            return None

        return point[0].model_dump()

    async def delete_document(self, document_id: str) -> bool:
        """
        Delete a document by its ID.

        Args:
            document_id: The ID of the document to delete

        Returns:
            True if document was deleted, False if not found
        """
        # First check if document exists
        existing = await self.retrieve(document_id)
        if not existing:
            return False

        # Delete the document
        await self.client.delete(
            collection_name=self.collection_name,
            points_selector=models.PointIdsList(
                points=[document_id]
            )
        )

        return True

    async def scroll(
        self,
        limit: int = 10,
        offset: int = None,
        scroll_filter: models.Filter = None
    ) -> Dict[str, Any]:
        """
        Scroll through documents with optional filtering and ordering.

        Uses query_points instead of scroll to support ordering with pagination.

        Args:
            limit: Number of results per page
            offset: Numeric pagination offset (default: 0)
            scroll_filter: Optional Qdrant Filter object for metadata filtering
        """
        if offset is None:
            offset = 0

        # Use query_points with ordering support
        # Use OrderByQuery to order documents without vector search
        results = await self.client.query_points(
            collection_name=self.collection_name,
            query=models.OrderByQuery(
                order_by=models.OrderBy(
                    key="document_date",
                    direction=models.Direction.DESC
                )
            ),
            limit=limit,
            offset=offset,
            query_filter=scroll_filter,
            with_payload=True,
            with_vectors=False,
            timeout=60
        )

        # Calculate if there are more pages
        has_more = len(results.points) == limit
        next_offset = offset + limit if has_more else None

        return {
            "items": [point.model_dump() for point in results.points],
            "next_page_offset": next_offset
        }
    
    async def find_similar_documents(
        self,
        query_vectors: Dict[str, Any],
        document_date: str,
        document_type: str,
        similarity_threshold: float = 0.87,
        date_range_days: int = 7
    ) -> List[Dict[str, Any]]:
        """
        Find similar documents within a date range to check for duplicates.
        
        NOTE: The similarity score of 0.87 refers ONLY to the dense vector similarity,
        not the hybrid score from the full pipeline.
        NOTE: Deduplication is only performed for documents of type "news".
        
        Args:
            query_vectors: Dict with 'dense', 'late', and 'sparse' vectors
            document_date: The date of the document to check (various formats supported)
            document_type: The type of document (deduplication only applies to "news")
            similarity_threshold: Minimum similarity score to consider as duplicate (default: 0.87)
            date_range_days: Number of days before/after to check for duplicates (default: 7)
            
        Returns:
            List of similar documents with scores
        """
        # Only perform deduplication for news documents
        if document_type.lower() != "news":
            return []
        
        # Parse the document date - try multiple formats
        date_formats = [
            # ISO 8601 with timezone
            "%Y-%m-%dT%H:%M:%S%z",
            "%Y-%m-%dT%H:%M:%S.%f%z",
            # ISO 8601 without timezone
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%S.%f",
            # Date only
            "%Y-%m-%d",
            # Common formats
            "%d/%m/%Y",
            "%m/%d/%Y",
            "%Y/%m/%d",
            "%d-%m-%Y",
            "%m-%d-%Y",
            # With time components
            "%d/%m/%Y %H:%M:%S",
            "%m/%d/%Y %H:%M:%S",
            "%Y/%m/%d %H:%M:%S",
            "%d-%m-%Y %H:%M:%S",
            "%m-%d-%Y %H:%M:%S",
        ]
        
        doc_date = None
        for fmt in date_formats:
            try:
                doc_date = datetime.strptime(document_date, fmt)
                break
            except ValueError:
                continue
        
        # Try ISO format with Z suffix
        if doc_date is None and document_date.endswith('Z'):
            try:
                doc_date = datetime.fromisoformat(document_date.replace('Z', '+00:00'))
            except ValueError:
                pass
        
        # If all parsing attempts fail, raise an error
        if doc_date is None:
            raise ValueError(f"Unable to parse date: {document_date}")
        
        # Calculate date range
        start_date = doc_date - timedelta(days=date_range_days)
        end_date = doc_date + timedelta(days=date_range_days)
        
        # Build filter with date range and document type
        filter_conditions = [
            models.FieldCondition(
                key="document_date",
                range=models.DatetimeRange(
                    gte=start_date.isoformat(),
                    lte=end_date.isoformat()
                )
            ),
            models.FieldCondition(
                key="type",
                match=models.MatchValue(value="news")
            )
        ]
        
        date_filter = models.Filter(must=filter_conditions)
        
        # Search for similar documents using ONLY the dense vector for similarity checking
        results = await self.client.query_points(
            collection_name=self.collection_name,
            query=query_vectors["dense"],
            using="dense",
            limit=100,
            query_filter=date_filter,
            with_payload=True,
            score_threshold=similarity_threshold,
            timeout=60
        )
        
        # Filter results by similarity threshold (in case score_threshold doesn't work as expected)
        similar_docs = []
        for point in results.points:
            if point.score >= similarity_threshold:
                similar_docs.append({
                    "id": str(point.id),
                    "score": point.score,
                    "payload": point.payload
                })
        
        return similar_docs
