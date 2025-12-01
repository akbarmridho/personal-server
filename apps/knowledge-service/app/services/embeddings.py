import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Any
from openrouter import OpenRouter
from fastembed import SparseTextEmbedding
from pylate import models as pylate_models
from app.core.config import settings
from app.services.text_processing import TextProcessor
from app.services.bm25 import CustomBM25

class EmbeddingService:
    def __init__(self):
        # Initialize models
        print("Loading models...")
        
        # ColBERT (Pylate)
        # mixedbread-ai/mxbai-edge-colbert-v0-32m
        self.colbert_model = pylate_models.ColBERT(
            model_name_or_path=settings.COLBERT_MODEL,
        )
        
        # Sparse (FastEmbed)
        self.sparse_model = SparseTextEmbedding(model_name=settings.SPARSE_MODEL)
        
        # Dense (OpenRouter with Qwen)
        if not settings.OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY is required. Please set it in your environment variables.")
        self.openrouter_client = OpenRouter(api_key=settings.OPENROUTER_API_KEY)
            
        # BM25S (Custom)
        self.bm25_model = CustomBM25(save_path="bm25s_index")
        
        # Text Processor for chunking
        self.text_processor = TextProcessor(chunk_size=512, overlap=64)
        
        self.executor = ThreadPoolExecutor(max_workers=2)
        print("Models loaded.")

    def _embed_dense(self, texts: list[str]) -> list[list[float]]:
        # OpenRouter handles batching and long context
        result = self.openrouter_client.embeddings.generate(
            input=texts,
            model=settings.DENSE_MODEL
        )
        return [embedding.embedding for embedding in result.data]

    def _embed_late(self, texts: list[str], is_query: bool = False) -> list[list[list[float]]]:
        # Pylate encode
        # Returns list of list of vectors? Or tensor?
        # The snippet says: documents_embeddings = model.encode(...)
        # We need to convert to list of list of list of float for Qdrant (or list of list of float? ColBERT is MultiVector)
        # Qdrant 'late' vector expects list of vectors.
        
        embeddings = self.colbert_model.encode(
            texts,
            batch_size=32,
            is_query=is_query,
            show_progress_bar=False
        )
        # Convert to list format if it's numpy or tensor
        if hasattr(embeddings, "tolist"):
            return embeddings.tolist()
        return embeddings

    def _embed_sparse_smart(self, text: str) -> dict[int, float]:
        # Handle chunking for 512 limit
        chunks = self.text_processor.chunk_text(text)
        if not chunks:
            return {}
            
        # Embed each chunk
        # sparse_model.passage_embed returns generator of SparseEmbedding (values, indices)
        chunk_embeddings = list(self.sparse_model.passage_embed(chunks))
        
        # Combine (Max Aggregation)
        combined_vector = {}
        
        for embed in chunk_embeddings:
            # embed is a SparseEmbedding object or dict? FastEmbed returns object with .indices and .values
            # or .as_object() or .as_dict()
            # Let's check fastembed usage in ingest.ipynb: "embeddings = list(sparse_model.passage_embed(batch))... e.as_object()"
            # as_object() returns dict with indices and values.
            
            # We want to merge into a single dict {index: value}
            # embed.indices is list[int], embed.values is list[float]
            
            indices = embed.indices
            values = embed.values
            
            for idx, val in zip(indices, values):
                if idx in combined_vector:
                    combined_vector[idx] = max(combined_vector[idx], val)
                else:
                    combined_vector[idx] = val
                    
        return combined_vector

    def _embed_sparse_exact(self, text: str) -> dict[str, Any]:
        # BM25S
        return self.bm25_model.encode(text)

    async def embed_document(self, text: str) -> dict[str, Any]:
        """
        Generate all embeddings for a single document text.
        """
        loop = asyncio.get_event_loop()
        
        # Run in executor to avoid blocking
        # Dense
        dense_task = loop.run_in_executor(self.executor, self._embed_dense, [text])
        
        # Late (ColBERT)
        late_task = loop.run_in_executor(self.executor, self._embed_late, [text], False)
        
        # Sparse Smart (BM42) - needs sub-chunking logic
        sparse_smart_task = loop.run_in_executor(self.executor, self._embed_sparse_smart, text)
        
        # Sparse Exact (BM25S)
        sparse_exact_task = loop.run_in_executor(self.executor, self._embed_sparse_exact, text)
        
        dense, late, sparse_smart, sparse_exact = await asyncio.gather(
            dense_task, late_task, sparse_smart_task, sparse_exact_task
        )
        
        # Format for Qdrant
        # Dense: list[float] (take first element since we passed list of 1)
        # Late: list[list[float]] (take first element)
        # Sparse Smart: dict {index: value} -> convert to Qdrant SparseVector format if needed, or dict
        # Sparse Exact: dict {indices: [], values: []}
        
        # Qdrant Sparse format: models.SparseVector(indices=..., values=...)
        # My _embed_sparse_smart returns dict {idx: val}. I should convert to indices/values lists.
        
        smart_indices = list(sparse_smart.keys())
        smart_values = list(sparse_smart.values())
        
        return {
            "dense": dense[0],
            "late": late[0],
            "sparse_smart": {"indices": smart_indices, "values": smart_values},
            "sparse_exact": sparse_exact
        }

    async def embed_query(self, text: str) -> dict[str, Any]:
        # Similar to document but with is_query=True for models that support it
        loop = asyncio.get_event_loop()
        
        dense_task = loop.run_in_executor(self.executor, lambda: self._embed_dense([text])[0])
        late_task = loop.run_in_executor(self.executor, self._embed_late, [text], True)
        sparse_smart_task = loop.run_in_executor(self.executor, lambda: list(self.sparse_model.query_embed([text]))[0])
        sparse_exact_task = loop.run_in_executor(self.executor, self._embed_sparse_exact, text)
        
        dense, late, sparse_smart, sparse_exact = await asyncio.gather(
            dense_task, late_task, sparse_smart_task, sparse_exact_task
        )
        
        # Sparse Smart from query_embed returns object, need to convert
        smart_indices = sparse_smart.indices
        smart_values = sparse_smart.values
        
        return {
            "dense": dense,
            "late": late[0],
            "sparse_smart": {"indices": smart_indices, "values": smart_values},
            "sparse_exact": sparse_exact
        }
