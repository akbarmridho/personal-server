#!/usr/bin/env python3
"""
Test script for document deduplication feature.

This script tests the deduplication functionality by:
1. Creating a sample document
2. Ingesting it
3. Creating a similar document
4. Attempting to ingest the similar document and verifying it's skipped
"""

import asyncio
import json
from datetime import datetime, timedelta
from app.services.embeddings import EmbeddingService
from app.services.qdrant import QdrantService
from app.services.document_processing import prepare_embedding_text
from app.core.config import settings

async def test_deduplication():
    print("Starting deduplication test...")
    
    # Initialize services
    embedding_service = EmbeddingService()
    qdrant_service = QdrantService()
    await qdrant_service._ensure_collection()
    
    # Create test documents
    base_date = datetime.now().isoformat()
    
    doc1 = {
        "id": "test-doc-1",
        "type": "news",
        "title": "BBCA Reports Strong Q3 Earnings",
        "content": "Bank Central Asia (BBCA) reported strong third quarter earnings with a 15% increase in net profit compared to the same period last year. The bank's performance was driven by robust loan growth and improved net interest margin.",
        "document_date": base_date,
        "source": {"platform": "test", "type": "news"},
        "symbols": ["BBCA"],
        "subsectors": ["financials"],
        "subindustries": ["banks"]
    }
    
    # Create a very similar document (should be detected as duplicate)
    doc2 = {
        "id": "test-doc-2",
        "type": "news",
        "title": "BBCA Q3 Earnings Show 15% Profit Growth",
        "content": "Bank Central Asia (BBCA) announced strong Q3 earnings, showing a 15% increase in net profit year-over-year. The growth was attributed to significant loan expansion and better net interest margin.",
        "document_date": (datetime.now() + timedelta(days=1)).isoformat(),
        "source": {"platform": "test", "type": "news"},
        "symbols": ["BBCA"],
        "subsectors": ["financials"],
        "subindustries": ["banks"]
    }
    
    # Create a different document (should not be detected as duplicate)
    doc3 = {
        "id": "test-doc-3",
        "type": "news",
        "title": "TLKM Announces New Digital Initiative",
        "content": "Telekomunikasi Indonesia (TLKM) launched a new digital transformation initiative aimed at expanding 5G coverage across major cities. The company plans to invest $2 billion in infrastructure over the next three years.",
        "document_date": base_date,
        "source": {"platform": "test", "type": "news"},
        "symbols": ["TLKM"],
        "subsectors": ["infrastructure"],
        "subindustries": ["telecommunications"]
    }
    
    print("\n1. Testing first document ingestion...")
    
    # Process and embed first document
    text1 = prepare_embedding_text(doc1)
    vectors1 = await embedding_service.embed_documents([text1])
    
    # Ingest first document
    await qdrant_service.upsert_documents([{
        "id": doc1["id"],
        "payload": doc1,
        "vectors": vectors1[0]
    }])
    print(f"✓ Document {doc1['id']} ingested successfully")
    
    print("\n2. Testing similar document detection...")
    
    # Process and embed second document
    text2 = prepare_embedding_text(doc2)
    vectors2 = await embedding_service.embed_documents([text2])
    
    # Check for similar documents
    similar_docs = await qdrant_service.find_similar_documents(
        query_vectors=vectors2[0],
        document_date=doc2["document_date"],
        document_type=doc2["type"],
        similarity_threshold=settings.DEDUPLICATION_SIMILARITY_THRESHOLD,
        date_range_days=settings.DEDUPLICATION_DATE_RANGE_DAYS
    )
    
    if similar_docs:
        print(f"✓ Similar document detected: {similar_docs[0]['id']} with score {similar_docs[0]['score']:.3f}")
        print(f"  This document would be skipped during ingestion")
    else:
        print("✗ No similar document found (unexpected)")
    
    print("\n3. Testing different document detection...")
    
    # Process and embed third document
    text3 = prepare_embedding_text(doc3)
    vectors3 = await embedding_service.embed_documents([text3])
    
    # Check for similar documents
    similar_docs = await qdrant_service.find_similar_documents(
        query_vectors=vectors3[0],
        document_date=doc3["document_date"],
        document_type=doc3["type"],
        similarity_threshold=settings.DEDUPLICATION_SIMILARITY_THRESHOLD,
        date_range_days=settings.DEDUPLICATION_DATE_RANGE_DAYS
    )
    
    if not similar_docs:
        print("✓ No similar document found (expected)")
        print(f"  This document would be ingested")
    else:
        print(f"✗ Unexpected similar document found: {similar_docs[0]['id']} with score {similar_docs[0]['score']:.3f}")
    
    print("\n4. Testing batch ingestion with deduplication...")
    
    # Test batch ingestion (simulating the API endpoint behavior)
    documents = [doc2, doc3]  # One duplicate, one unique
    enriched_texts = [prepare_embedding_text(doc) for doc in documents]
    batch_embeddings = await embedding_service.embed_documents(enriched_texts)
    
    # Check for duplicates
    non_duplicate_docs = []
    skipped_count = 0
    
    for doc, vectors in zip(documents, batch_embeddings):
        similar_docs = await qdrant_service.find_similar_documents(
            query_vectors=vectors,
            document_date=doc["document_date"],
            document_type=doc["type"],
            similarity_threshold=settings.DEDUPLICATION_SIMILARITY_THRESHOLD,
            date_range_days=settings.DEDUPLICATION_DATE_RANGE_DAYS
        )
        
        if similar_docs:
            skipped_count += 1
            print(f"  Document {doc['id']} skipped (similar to {similar_docs[0]['id']})")
        else:
            non_duplicate_docs.append(doc)
            print(f"  Document {doc['id']} will be ingested")
    
    # Ingest non-duplicate documents
    if non_duplicate_docs:
        # Create a mapping of doc IDs to embeddings for the non-duplicate docs
        doc_to_embedding = {doc["id"]: emb for doc, emb in zip(documents, batch_embeddings)}
        
        processed_docs = []
        for doc in non_duplicate_docs:
            processed_docs.append({
                "id": doc["id"],
                "payload": doc,
                "vectors": doc_to_embedding[doc["id"]]
            })
        
        await qdrant_service.upsert_documents(processed_docs)
    
    print(f"\n✓ Batch ingestion complete: {len(non_duplicate_docs)} ingested, {skipped_count} skipped")
    
    print("\n5. Testing different date formats...")
    
    # Create a document with a different date format
    doc4 = {
        "id": "test-doc-4",
        "type": "news",
        "title": "BBCA Quarterly Results Announcement",
        "content": "Bank Central Asia has announced its quarterly financial results showing significant growth in net interest margin and loan portfolio.",
        "document_date": "15/01/2025",  # Different date format
        "source": {"platform": "test", "type": "news"},
        "symbols": ["BBCA"],
        "subsectors": ["financials"],
        "subindustries": ["banks"]
    }
    
    # Process and embed document
    text4 = prepare_embedding_text(doc4)
    vectors4 = await embedding_service.embed_documents([text4])
    
    # Check for similar documents
    similar_docs = await qdrant_service.find_similar_documents(
        query_vectors=vectors4[0],
        document_date=doc4["document_date"],
        document_type=doc4["type"],
        similarity_threshold=settings.DEDUPLICATION_SIMILARITY_THRESHOLD,
        date_range_days=settings.DEDUPLICATION_DATE_RANGE_DAYS
    )
    
    if similar_docs:
        print(f"✓ Similar document found with different date format: {similar_docs[0]['id']} with score {similar_docs[0]['score']:.3f}")
    else:
        print("✓ No similar document found with different date format")
    
    print("\n6. Testing non-news document type (should not be deduplicated)...")
    
    # Create a filing document (should not be deduplicated)
    doc5 = {
        "id": "test-doc-5",
        "type": "filing",
        "title": "BBCA Annual Report 2024",
        "content": "Bank Central Asia annual report for fiscal year 2024, containing comprehensive financial statements and business performance metrics.",
        "document_date": base_date,
        "source": {"platform": "test", "type": "filing"},
        "symbols": ["BBCA"],
        "subsectors": ["financials"],
        "subindustries": ["banks"]
    }
    
    # Process and embed document
    text5 = prepare_embedding_text(doc5)
    vectors5 = await embedding_service.embed_documents([text5])
    
    # Check for similar documents
    similar_docs = await qdrant_service.find_similar_documents(
        query_vectors=vectors5[0],
        document_date=doc5["document_date"],
        document_type=doc5["type"],
        similarity_threshold=settings.DEDUPLICATION_SIMILARITY_THRESHOLD,
        date_range_days=settings.DEDUPLICATION_DATE_RANGE_DAYS
    )
    
    if not similar_docs:
        print("✓ No similar documents found for filing type (expected - deduplication only for news)")
    else:
        print(f"✗ Unexpected similar document found for filing type: {similar_docs[0]['id']}")
        
        print("\n7. Testing document update with same ID...")
        
        # Create an updated version of doc1 with same ID but slightly different content
        updated_doc1 = {
            "id": "test-doc-1",  # Same ID as original doc1
            "type": "news",
            "title": "BBCA Reports Strong Q3 Earnings - Updated",
            "content": "Bank Central Asia (BBCA) reported very strong third quarter earnings with a 16% increase in net profit compared to same period last year. The bank's performance was driven by robust loan growth and improved net interest margin.",  # Slightly different content
            "document_date": base_date,
            "source": {"platform": "test", "type": "news"},
            "symbols": ["BBCA"],
            "subsectors": ["financials"],
            "subindustries": ["banks"]
        }
        
        # Process and embed updated document
        updated_text1 = prepare_embedding_text(updated_doc1)
        updated_vectors1 = await embedding_service.embed_documents([updated_text1])
        
        # Ingest updated document (should update, not skip)
        await qdrant_service.upsert_documents([{
            "id": updated_doc1["id"],
            "payload": updated_doc1,
            "vectors": updated_vectors1[0]
        }])
        
        print(f"✓ Document {updated_doc1['id']} updated successfully (same ID allowed)")
        
        # Verify document was updated by retrieving it
        retrieved_doc = await qdrant_service.retrieve("test-doc-1")
        if retrieved_doc and retrieved_doc["payload"]["title"] == "BBCA Reports Strong Q3 Earnings - Updated":
            print(f"✓ Document content verified as updated")
        else:
            print(f"✗ Document update verification failed")
        
        print("\nDeduplication test completed successfully!")

if __name__ == "__main__":
    asyncio.run(test_deduplication())