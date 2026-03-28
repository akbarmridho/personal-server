#!/usr/bin/env python3

import argparse
import asyncio
import sys
from pathlib import Path
from typing import Any, Dict

from qdrant_client import AsyncQdrantClient, models


SCRIPT_DIR = Path(__file__).resolve().parent
APP_ROOT = SCRIPT_DIR.parent
if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

from app.core.config import settings
from app.services.document_processing import prepare_bm25_text


DENSE_VECTOR_NAME = "dense"
BM25_VECTOR_NAME = "bm25"
SERVER_SIDE_BM25_MODEL = "qdrant/bm25"
DEFAULT_BATCH_SIZE = 100
DEFAULT_TARGET_SUFFIX = "_v2"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Migrate a legacy knowledge-service Qdrant collection into a new "
            "dense + BM25 collection."
        )
    )
    parser.add_argument(
        "--source-collection",
        default=settings.QDRANT_COLLECTION_NAME,
        help="Source collection name. Default: QDRANT_COLLECTION_NAME",
    )
    parser.add_argument(
        "--target-collection",
        default=None,
        help="Target collection name. Default: <source>_v2",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=DEFAULT_BATCH_SIZE,
        help=f"Scroll/upsert batch size. Default: {DEFAULT_BATCH_SIZE}",
    )
    parser.add_argument(
        "--max-points",
        type=int,
        default=None,
        help="Optional cap for how many points to copy in this run.",
    )
    parser.add_argument(
        "--skip-finalize",
        action="store_true",
        help="Skip enabling dense indexing and payload indexes after a full copy.",
    )
    return parser.parse_args()


def build_bm25_sparse_vector_params() -> models.SparseVectorParams:
    return models.SparseVectorParams(
        modifier=models.Modifier.IDF,
        index=models.SparseIndexParams(
            on_disk=True,
            datatype=models.Datatype.FLOAT16,
        ),
    )


def build_payload_indexes() -> Dict[str, Any]:
    return {
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


def get_named_vector_params(
    collection_info: models.CollectionInfo,
    vector_name: str,
) -> models.VectorParams:
    vectors = collection_info.config.params.vectors
    if not isinstance(vectors, dict):
        raise ValueError(
            f"Collection does not use named vectors; expected {vector_name!r}"
        )

    vector_params = vectors.get(vector_name)
    if vector_params is None:
        raise ValueError(f"Source collection is missing vector {vector_name!r}")

    return vector_params


async def ensure_target_collection(
    client: AsyncQdrantClient,
    source_info: models.CollectionInfo,
    target_collection: str,
) -> None:
    source_dense = get_named_vector_params(source_info, DENSE_VECTOR_NAME)

    if await client.collection_exists(target_collection):
        target_info = await client.get_collection(target_collection)
        target_sparse_vectors = target_info.config.params.sparse_vectors or {}
        if BM25_VECTOR_NAME not in target_sparse_vectors:
            raise ValueError(
                f"Target collection {target_collection!r} exists but does not have "
                f"the {BM25_VECTOR_NAME!r} sparse vector."
            )
        return

    print(f"Creating target collection {target_collection}...")
    await client.create_collection(
        collection_name=target_collection,
        vectors_config={
            DENSE_VECTOR_NAME: models.VectorParams(
                size=source_dense.size,
                distance=source_dense.distance,
                on_disk=source_dense.on_disk,
                datatype=source_dense.datatype,
                hnsw_config=models.HnswConfigDiff(m=0),
            )
        },
        sparse_vectors_config={
            BM25_VECTOR_NAME: build_bm25_sparse_vector_params(),
        },
        shard_number=source_info.config.params.shard_number,
        replication_factor=source_info.config.params.replication_factor,
        write_consistency_factor=source_info.config.params.write_consistency_factor,
        on_disk_payload=source_info.config.params.on_disk_payload,
    )
    print("Target collection created.")


async def finalize_target_collection(
    client: AsyncQdrantClient,
    target_collection: str,
) -> None:
    print("Finalizing target collection indexing...")
    await client.update_collection(
        collection_name=target_collection,
        vectors_config={
            DENSE_VECTOR_NAME: models.VectorParamsDiff(
                hnsw_config=models.HnswConfigDiff(
                    m=16,
                    ef_construct=100,
                )
            )
        },
    )

    for field_name, field_schema in build_payload_indexes().items():
        try:
            await client.create_payload_index(
                collection_name=target_collection,
                field_name=field_name,
                field_schema=field_schema,
            )
            print(f"  Created payload index for {field_name}")
        except Exception as error:
            print(f"  Payload index for {field_name} already exists or error: {error}")


async def migrate() -> None:
    args = parse_args()
    if args.batch_size <= 0:
        raise ValueError("--batch-size must be greater than 0")
    if args.max_points is not None and args.max_points <= 0:
        raise ValueError("--max-points must be greater than 0")

    source_collection = args.source_collection
    target_collection = (
        args.target_collection
        if args.target_collection
        else f"{source_collection}{DEFAULT_TARGET_SUFFIX}"
    )

    client = AsyncQdrantClient(
        host=settings.QDRANT_HOST,
        timeout=180,
        prefer_grpc=True,
    )

    try:
        if not await client.collection_exists(source_collection):
            raise ValueError(f"Source collection {source_collection!r} does not exist")

        source_info = await client.get_collection(source_collection)
        await ensure_target_collection(client, source_info, target_collection)

        source_count = (
            await client.count(collection_name=source_collection, exact=True)
        ).count
        target_count_before = (
            await client.count(collection_name=target_collection, exact=True)
        ).count

        print(
            f"Starting migration from {source_collection} to {target_collection}. "
            f"source_count={source_count} target_count_before={target_count_before}"
        )

        migrated_count = 0
        offset = None
        finished_full_scan = False

        while True:
            remaining = None
            if args.max_points is not None:
                remaining = args.max_points - migrated_count
                if remaining <= 0:
                    break

            batch_limit = args.batch_size if remaining is None else min(args.batch_size, remaining)
            records, offset = await client.scroll(
                collection_name=source_collection,
                limit=batch_limit,
                offset=offset,
                with_payload=True,
                with_vectors=[DENSE_VECTOR_NAME],
                timeout=180,
            )

            if not records:
                finished_full_scan = True
                break

            points = []
            for record in records:
                if not isinstance(record.vector, dict):
                    raise ValueError(
                        f"Point {record.id!r} did not return named vectors as expected"
                    )

                dense_vector = record.vector.get(DENSE_VECTOR_NAME)
                if dense_vector is None:
                    raise ValueError(
                        f"Point {record.id!r} is missing dense vector {DENSE_VECTOR_NAME!r}"
                    )

                payload = dict(record.payload or {})
                points.append(
                    models.PointStruct(
                        id=record.id,
                        payload=payload,
                        vector={
                            DENSE_VECTOR_NAME: dense_vector,
                            BM25_VECTOR_NAME: models.Document(
                                text=prepare_bm25_text(payload),
                                model=SERVER_SIDE_BM25_MODEL,
                            ),
                        },
                    )
                )

            await client.upsert(
                collection_name=target_collection,
                points=points,
                wait=True,
            )

            migrated_count += len(points)
            print(
                f"Migrated batch of {len(points)} points. total_migrated={migrated_count}"
            )

            if len(records) < batch_limit:
                finished_full_scan = True
                break

        target_count_after = (
            await client.count(collection_name=target_collection, exact=True)
        ).count

        print(
            f"Migration run complete. target_count_after={target_count_after} "
            f"migrated_this_run={migrated_count}"
        )

        if (
            finished_full_scan
            and args.max_points is None
            and not args.skip_finalize
            and target_count_after >= source_count
        ):
            await finalize_target_collection(client, target_collection)
            print("Target collection finalized.")
        elif not args.skip_finalize:
            print(
                "Skipping finalize because this run did not complete a full migration "
                "or target count is still behind source count."
            )
    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(migrate())
