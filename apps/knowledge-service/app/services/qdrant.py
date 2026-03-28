from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
import uuid

from qdrant_client import AsyncQdrantClient, models

from app.core.config import settings
from app.services.document_processing import prepare_bm25_text
from app.services.embeddings import EmbeddingService


DENSE_VECTOR_NAME = "dense"
BM25_VECTOR_NAME = "bm25"
SERVER_SIDE_BM25_MODEL = "qdrant/bm25"
PREFETCH_CANDIDATE_MULTIPLIER = 5
PREFETCH_MAX_LIMIT = 200
TITLE_BOOST = 0.25
CONTENT_BOOST = 0.1
RECENCY_BOOST = 0.15
RECENCY_SCALE_SECONDS = 60 * 60 * 24 * 180
RECENCY_MIDPOINT = 0.5


class QdrantService:
    def __init__(self):
        self.client = AsyncQdrantClient(
            host=settings.QDRANT_HOST,
            timeout=180,
            prefer_grpc=True,
        )
        self.schema_client = AsyncQdrantClient(
            host=settings.QDRANT_HOST,
            timeout=180,
            prefer_grpc=False,
        )
        self.collection_name = settings.QDRANT_COLLECTION_NAME
        self._has_bm25_sparse_vector = False

    async def _ensure_collection(self):
        """Create the collection or evolve an existing one for BM25 migration."""
        if not await self.client.collection_exists(self.collection_name):
            print(
                f"Creating collection {self.collection_name} with dense + BM25 search..."
            )
            await self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config={
                    DENSE_VECTOR_NAME: models.VectorParams(
                        size=EmbeddingService.DENSE_DIMENSION,
                        distance=models.Distance.COSINE,
                        on_disk=True,
                        datatype=models.Datatype.FLOAT16,
                        hnsw_config=models.HnswConfigDiff(m=0),
                    ),
                },
                sparse_vectors_config={
                    BM25_VECTOR_NAME: self._build_bm25_sparse_vector_params(),
                },
            )
            print("Collection created.")

        await self._refresh_collection_state()
        if not self._has_bm25_sparse_vector:
            await self._ensure_bm25_sparse_vector()
            await self._refresh_collection_state()

        if not self._has_bm25_sparse_vector:
            print(
                "Collection is using legacy schema without the bm25 sparse vector. "
                "Starting in dense-only compatibility mode."
            )

    async def _refresh_collection_state(self):
        info = await self.client.get_collection(self.collection_name)
        sparse_vectors = info.config.params.sparse_vectors or {}
        self._has_bm25_sparse_vector = BM25_VECTOR_NAME in sparse_vectors

    def _build_bm25_sparse_vector_params(self) -> models.SparseVectorParams:
        return models.SparseVectorParams(
            modifier=models.Modifier.IDF,
            index=models.SparseIndexParams(
                on_disk=True,
                datatype=models.Datatype.FLOAT16,
            ),
        )

    async def _ensure_bm25_sparse_vector(self):
        print(
            f"Adding sparse vector {BM25_VECTOR_NAME} to collection "
            f"{self.collection_name} for server-side BM25 migration..."
        )
        try:
            await self.schema_client.update_collection(
                collection_name=self.collection_name,
                sparse_vectors_config={
                    BM25_VECTOR_NAME: self._build_bm25_sparse_vector_params(),
                },
            )
            print(f"Sparse vector {BM25_VECTOR_NAME} added successfully.")
        except Exception as error:
            print(
                "Unable to add the bm25 sparse vector to the existing collection. "
                f"Continuing without BM25 migration support. Error: {error}"
            )

    async def enable_indexing(self):
        """Enable indexing for the collection and ensure payload indexes exist."""
        if not await self.client.collection_exists(self.collection_name):
            raise ValueError(f"Collection {self.collection_name} does not exist.")

        print(f"Enabling indexing for collection {self.collection_name}...")

        await self.client.update_collection(
            collection_name=self.collection_name,
            vectors_config={
                DENSE_VECTOR_NAME: models.VectorParamsDiff(
                    hnsw_config=models.HnswConfigDiff(
                        m=16,
                        ef_construct=100,
                    )
                )
            },
        )

        await self._create_payload_indexes()
        print("Indexing enabled for dense vector and retrieval payload fields.")

    async def _create_payload_indexes(self):
        print("Creating payload indexes...")

        indexes: Dict[str, Any] = {
            "type": models.PayloadSchemaType.KEYWORD,
            "symbols": models.PayloadSchemaType.KEYWORD,
            "subsectors": models.PayloadSchemaType.KEYWORD,
            "subindustries": models.PayloadSchemaType.KEYWORD,
            "indices": models.PayloadSchemaType.KEYWORD,
            "document_date": models.PayloadSchemaType.DATETIME,
            "source.name": models.PayloadSchemaType.KEYWORD,
            "title": models.TextIndexParams(
                type=models.TextIndexType.TEXT,
                tokenizer=models.TokenizerType.MULTILINGUAL,
                lowercase=True,
                ascii_folding=True,
                on_disk=True,
            ),
            "content": models.TextIndexParams(
                type=models.TextIndexType.TEXT,
                tokenizer=models.TokenizerType.MULTILINGUAL,
                lowercase=True,
                ascii_folding=True,
                on_disk=True,
            ),
        }

        for field_name, field_schema in indexes.items():
            try:
                await self.client.create_payload_index(
                    collection_name=self.collection_name,
                    field_name=field_name,
                    field_schema=field_schema,
                )
                print(f"  Created index for {field_name}")
            except Exception as error:
                print(f"  Index for {field_name} already exists or error: {error}")

        print("Payload indexes created.")

    async def upsert_documents(self, documents: List[Dict[str, Any]]):
        """
        Upsert processed documents using dense vectors plus server-side BM25 text.
        """
        points = []
        for doc in documents:
            vector_payload: Dict[str, Any] = {
                DENSE_VECTOR_NAME: doc["dense_vector"],
            }
            if self._has_bm25_sparse_vector:
                vector_payload[BM25_VECTOR_NAME] = models.Document(
                    text=doc["bm25_text"],
                    model=SERVER_SIDE_BM25_MODEL,
                )

            points.append(
                models.PointStruct(
                    id=doc.get("id", str(uuid.uuid4())),
                    payload=doc.get("payload", {}),
                    vector=vector_payload,
                )
            )

        await self.client.upsert(
            collection_name=self.collection_name,
            points=points,
            wait=False,
        )

    def build_filter(self, filters: Dict[str, Any]) -> Optional[models.Filter]:
        must_conditions = []
        must_not_conditions = []

        if filters.get("pure_sector") is True:
            must_conditions.append(
                models.IsEmptyCondition(
                    is_empty=models.PayloadField(key="symbols"),
                )
            )
        elif filters.get("pure_sector") is False:
            must_not_conditions.append(
                models.IsEmptyCondition(
                    is_empty=models.PayloadField(key="symbols"),
                )
            )

        if filters.get("symbols"):
            must_conditions.append(
                models.FieldCondition(
                    key="symbols",
                    match=models.MatchAny(any=filters["symbols"]),
                )
            )

        if filters.get("subsectors"):
            must_conditions.append(
                models.FieldCondition(
                    key="subsectors",
                    match=models.MatchAny(any=filters["subsectors"]),
                )
            )

        if filters.get("subindustries"):
            must_conditions.append(
                models.FieldCondition(
                    key="subindustries",
                    match=models.MatchAny(any=filters["subindustries"]),
                )
            )

        if filters.get("types"):
            types = [
                value.value if hasattr(value, "value") else value
                for value in filters["types"]
            ]
            must_conditions.append(
                models.FieldCondition(
                    key="type",
                    match=models.MatchAny(any=types),
                )
            )

        if filters.get("date_from") or filters.get("date_to"):
            date_range = {}
            if filters.get("date_from"):
                date_range["gte"] = filters["date_from"]
            if filters.get("date_to"):
                date_range["lte"] = filters["date_to"]

            must_conditions.append(
                models.FieldCondition(
                    key="document_date",
                    range=models.DatetimeRange(**date_range),
                )
            )

        if filters.get("source_names"):
            must_conditions.append(
                models.FieldCondition(
                    key="source.name",
                    match=models.MatchAny(any=filters["source_names"]),
                )
            )

        if filters.get("include_ids"):
            must_conditions.append(
                models.HasIdCondition(has_id=filters["include_ids"])
            )

        if filters.get("exclude_ids"):
            must_not_conditions.append(
                models.HasIdCondition(has_id=filters["exclude_ids"])
            )

        if not must_conditions and not must_not_conditions:
            return None

        filter_params = {}
        if must_conditions:
            filter_params["must"] = must_conditions
        if must_not_conditions:
            filter_params["must_not"] = must_not_conditions

        return models.Filter(**filter_params)

    async def search(
        self,
        query_text: str,
        query_vector: Optional[List[float]],
        limit: int = 10,
        query_filter: Optional[models.Filter] = None,
        use_dense: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Search using dense vectors and server-side BM25 with score boosting.
        """
        prefetch_limit = min(
            PREFETCH_MAX_LIMIT,
            max(limit, limit * PREFETCH_CANDIDATE_MULTIPLIER),
        )

        prefetches = []
        if use_dense and query_vector is not None:
            prefetches.append(
                models.Prefetch(
                    query=query_vector,
                    using=DENSE_VECTOR_NAME,
                    limit=prefetch_limit,
                    filter=query_filter,
                )
            )

        if self._has_bm25_sparse_vector:
            prefetches.append(
                models.Prefetch(
                    query=models.Document(
                        text=query_text,
                        model=SERVER_SIDE_BM25_MODEL,
                    ),
                    using=BM25_VECTOR_NAME,
                    limit=prefetch_limit,
                    filter=query_filter,
                )
            )

        if not prefetches:
            raise ValueError(
                "No retrieval path is available. Enable dense search or backfill BM25."
            )

        formula_query = self._build_formula_query(query_text)

        if len(prefetches) == 1:
            results = await self.client.query_points(
                collection_name=self.collection_name,
                prefetch=prefetches[0],
                query=formula_query,
                limit=limit,
                with_payload=True,
                timeout=60,
            )
            return [point.model_dump() for point in results.points]

        fused_candidates = models.Prefetch(
            prefetch=prefetches,
            query=models.FusionQuery(fusion=models.Fusion.DBSF),
            limit=max(prefetch_limit, limit),
        )

        results = await self.client.query_points(
            collection_name=self.collection_name,
            prefetch=fused_candidates,
            query=formula_query,
            limit=limit,
            with_payload=True,
            timeout=60,
        )

        return [point.model_dump() for point in results.points]

    def _build_formula_query(self, query_text: str) -> models.FormulaQuery:
        reference_time = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        score_parts: List[Any] = [
            "$score",
            models.MultExpression(
                mult=[
                    TITLE_BOOST,
                    models.FieldCondition(
                        key="title",
                        match=models.MatchText(text=query_text),
                    ),
                ]
            ),
            models.MultExpression(
                mult=[
                    CONTENT_BOOST,
                    models.FieldCondition(
                        key="content",
                        match=models.MatchText(text=query_text),
                    ),
                ]
            ),
            models.MultExpression(
                mult=[
                    RECENCY_BOOST,
                    models.ExpDecayExpression(
                        exp_decay=models.DecayParamsExpression(
                            x=models.DatetimeKeyExpression(
                                datetime_key="document_date"
                            ),
                            target=models.DatetimeExpression(datetime=reference_time),
                            scale=RECENCY_SCALE_SECONDS,
                            midpoint=RECENCY_MIDPOINT,
                        )
                    ),
                ]
            ),
        ]

        return models.FormulaQuery(
            formula=models.SumExpression(sum=score_parts),
            defaults={
                "title": "",
                "content": "",
                "document_date": reference_time,
            },
        )

    async def retrieve(self, document_id: str) -> Optional[Dict[str, Any]]:
        point = await self.client.retrieve(
            collection_name=self.collection_name,
            ids=[document_id],
            with_payload=True,
            with_vectors=False,
        )

        if not point:
            return None

        return point[0].model_dump()

    async def delete_document(self, document_id: str) -> bool:
        existing = await self.retrieve(document_id)
        if not existing:
            return False

        await self.client.delete(
            collection_name=self.collection_name,
            points_selector=models.PointIdsList(points=[document_id]),
        )

        return True

    async def count_documents(
        self,
        count_filter: Optional[models.Filter] = None,
    ) -> int:
        count_result = await self.client.count(
            collection_name=self.collection_name,
            count_filter=count_filter,
            exact=True,
        )
        return count_result.count

    async def scroll(
        self,
        limit: int = 10,
        offset: int = None,
        scroll_filter: Optional[models.Filter] = None,
    ) -> Dict[str, Any]:
        if offset is None:
            offset = 0

        total_count = await self.count_documents(scroll_filter)

        results = await self.client.query_points(
            collection_name=self.collection_name,
            query=models.OrderByQuery(
                order_by=models.OrderBy(
                    key="document_date",
                    direction=models.Direction.DESC,
                )
            ),
            limit=limit,
            offset=offset,
            query_filter=scroll_filter,
            with_payload=True,
            with_vectors=False,
            timeout=60,
        )

        return {
            "items": [point.model_dump() for point in results.points],
            "total_count": total_count,
        }

    async def find_similar_documents(
        self,
        dense_vector: List[float],
        document_date: str,
        document_type: str,
        similarity_threshold: float = 0.87,
        date_range_days: int = 7,
    ) -> List[Dict[str, Any]]:
        """
        Find similar documents for deduplication using dense similarity only.
        """
        if document_type.lower() != "news":
            return []

        doc_date = self._parse_document_date(document_date)
        start_date = doc_date - timedelta(days=date_range_days)
        end_date = doc_date + timedelta(days=date_range_days)

        date_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="document_date",
                    range=models.DatetimeRange(
                        gte=start_date.isoformat(),
                        lte=end_date.isoformat(),
                    ),
                ),
                models.FieldCondition(
                    key="type",
                    match=models.MatchValue(value="news"),
                ),
            ]
        )

        results = await self.client.query_points(
            collection_name=self.collection_name,
            query=dense_vector,
            using=DENSE_VECTOR_NAME,
            limit=100,
            query_filter=date_filter,
            with_payload=True,
            score_threshold=similarity_threshold,
            timeout=60,
        )

        similar_docs = []
        for point in results.points:
            if point.score >= similarity_threshold:
                similar_docs.append(
                    {
                        "id": str(point.id),
                        "score": point.score,
                        "payload": point.payload,
                    }
                )

        return similar_docs

    def _parse_document_date(self, document_date: str) -> datetime:
        date_formats = [
            "%Y-%m-%dT%H:%M:%S%z",
            "%Y-%m-%dT%H:%M:%S.%f%z",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%S.%f",
            "%Y-%m-%d",
            "%d/%m/%Y",
            "%m/%d/%Y",
            "%Y/%m/%d",
            "%d-%m-%Y",
            "%m-%d-%Y",
            "%d/%m/%Y %H:%M:%S",
            "%m/%d/%Y %H:%M:%S",
            "%Y/%m/%d %H:%M:%S",
            "%d-%m-%Y %H:%M:%S",
            "%m-%d-%Y %H:%M:%S",
        ]

        for date_format in date_formats:
            try:
                return datetime.strptime(document_date, date_format)
            except ValueError:
                continue

        if document_date.endswith("Z"):
            try:
                return datetime.fromisoformat(document_date.replace("Z", "+00:00"))
            except ValueError:
                pass

        raise ValueError(f"Unable to parse date: {document_date}")

    async def backfill_bm25_vectors(
        self,
        limit: int = 500,
        batch_size: int = 100,
    ) -> Dict[str, Any]:
        """
        Backfill server-side BM25 vectors from existing payloads in chunks.
        """
        if not self._has_bm25_sparse_vector:
            raise ValueError(
                "Current collection schema does not contain the bm25 sparse vector. "
                "Qdrant cannot add a new vector name to an existing collection in place."
            )

        if batch_size <= 0:
            raise ValueError("batch_size must be greater than 0")

        migration_filter = models.Filter(
            must_not=[models.HasVectorCondition(has_vector=BM25_VECTOR_NAME)]
        )

        updated_count = 0
        next_offset = None

        while updated_count < limit:
            page_limit = min(batch_size, limit - updated_count)
            records, next_offset = await self.client.scroll(
                collection_name=self.collection_name,
                scroll_filter=migration_filter,
                limit=page_limit,
                offset=next_offset,
                with_payload=True,
                with_vectors=False,
                timeout=60,
            )

            if not records:
                break

            points = []
            for record in records:
                payload = dict(record.payload or {})
                points.append(
                    models.PointVectors(
                        id=record.id,
                        vector={
                            BM25_VECTOR_NAME: models.Document(
                                text=prepare_bm25_text(payload),
                                model=SERVER_SIDE_BM25_MODEL,
                            )
                        },
                    )
                )

            if points:
                await self.client.update_vectors(
                    collection_name=self.collection_name,
                    points=points,
                    wait=True,
                )
                updated_count += len(points)

            if len(records) < page_limit:
                break

        remaining_count = await self.count_documents(migration_filter)
        return {
            "updated_count": updated_count,
            "remaining_count": remaining_count,
            "has_more": remaining_count > 0,
        }

    async def get_unique_source_names(self) -> List[str]:
        result = await self.client.facet(
            collection_name=self.collection_name,
            key="source.name",
            limit=1000,
            exact=False,
        )

        source_names = [hit.value for hit in result.hits]
        return sorted(source_names)
