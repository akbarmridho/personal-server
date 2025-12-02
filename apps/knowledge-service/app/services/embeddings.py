import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Any
from openrouter import OpenRouter
from fastembed import SparseTextEmbedding
from pylate import models as pylate_models
from app.core.config import settings
from app.services.text_processing import TextProcessor
from app.services.bm25 import CustomBM25
from tokenizers import Tokenizer

class EmbeddingService:
    COLBERT_MODEL: str = "mixedbread-ai/mxbai-edge-colbert-v0-32m"
    COLBERT_DIMENSION: int = 64
    SPLADE_MODEL: str = "Qdrant/bm42-all-minilm-l6-v2-attentions"
    SPLADE_TOKEN_LIMIT: int = 512
    DENSE_MODEL: str = "qwen/qwen3-embedding-8b"
    DENSE_DIMENSION: int = 2048

    def __init__(self):
        # Initialize models
        print("Loading models...")
        
        # ColBERT (Pylate)
        self.colbert_model: pylate_models.ColBERT = pylate_models.ColBERT(
            model_name_or_path=self.COLBERT_MODEL,
        )
        
        # Sparse (FastEmbed) - this is BM42 which is a SPLADE-like model or BM25 with steroids
        self.splade_model: SparseTextEmbedding = SparseTextEmbedding(model_name=self.SPLADE_MODEL)

        # Text Processor for chunking this sparse model
        self.sparse_text_processor: TextProcessor = TextProcessor(chunk_size=self.SPLADE_TOKEN_LIMIT, overlap=64, tokenizer=Tokenizer.from_pretrained(model_name=self.splade_model))
        
        # Dense (OpenRouter with Qwen)
        if not settings.OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY is required. Please set it in your environment variables.")

        self.openrouter_client: OpenRouter = OpenRouter(api_key=settings.OPENROUTER_API_KEY)
            
        # BM25S (Custom)
        self.bm25_model: CustomBM25 = CustomBM25()
        
        self.executor = ThreadPoolExecutor(max_workers=2)

        print("Models loaded.")

    def _embed_dense(self, texts: list[str]) -> list[list[float]]:
        """
        Generate dense embeddings for texts with batching.
        Processes texts in batches of 50 to optimize API calls.
        """
        BATCH_SIZE = 50
        all_embeddings = []
        
        # Process texts in batches
        for i in range(0, len(texts), BATCH_SIZE):
            batch_texts = texts[i:i + BATCH_SIZE]
            
            result = self.openrouter_client.embeddings.generate(
                input=batch_texts,
                encoding_format="float",
                dimensions=self.DENSE_DIMENSION,
                retries=3
            )
            
            batch_embeddings = [embedding.embedding for embedding in result.data]
            all_embeddings.extend(batch_embeddings)
        
        return all_embeddings

    def _embed_late(self, texts: list[str], is_query: bool = False):
        embeddings = self.colbert_model.encode(
            texts,
            batch_size=32,
            is_query=is_query,
            show_progress_bar=False,
            convert_to_numpy=True
        )
  
        return embeddings

    def _embed_splade(self, text: str) -> dict[int, float]:
        # Handle chunking for 512 limit
        chunks = self.sparse_text_processor.chunk_text(text)
        if not chunks:
            return {}

        # Embed each chunk
        # splade_model.passage_embed returns generator of SparseEmbedding (values, indices)
        chunk_embeddings = list(self.splade_model.passage_embed(chunks))
        
        # Combine (Max Aggregation)
        combined_vector = {}
        
        for embed in chunk_embeddings:
            indices = embed.indices
            values = embed.values
            
            for idx, val in zip(indices, values):
                if idx in combined_vector:
                    combined_vector[idx] = max(combined_vector[idx], val)
                else:
                    combined_vector[idx] = val
                    
        return combined_vector

    def _embed_bm25(self, text: str) -> dict[str, Any]:
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
        splade_task = loop.run_in_executor(self.executor, self._embed_splade, text)
        
        # Sparse Exact (BM25S)
        bm25_task = loop.run_in_executor(self.executor, self._embed_bm25, text)
        
        dense, late, splade, bm25 = await asyncio.gather(
            dense_task, late_task, splade_task, bm25_task
        )
        
        # Format for Qdrant
        # Dense: list[float] (take first element since we passed list of 1)
        # Late: list[list[float]] (take first element)
        # Sparse Smart: dict {index: value} -> convert to Qdrant SparseVector format if needed, or dict
        # Sparse Exact: dict {indices: [], values: []}
        
        # Qdrant Sparse format: models.SparseVector(indices=..., values=...)
        # My _embed_splade returns dict {idx: val}. I should convert to indices/values lists.
  
        return {
            "dense": dense[0],
            "late": late[0],
            "splade": splade,
            "bm25": bm25
        }

    async def embed_query(self, text: str) -> dict[str, Any]:
        # Similar to document but with is_query=True for models that support it
        loop = asyncio.get_event_loop()
        
        dense_task = loop.run_in_executor(self.executor, lambda: self._embed_dense([text])[0])
        late_task = loop.run_in_executor(self.executor, self._embed_late, [text], True)
        splade_task = loop.run_in_executor(self.executor, lambda: list(self.splade_model.query_embed([text]))[0])
        bm25_task = loop.run_in_executor(self.executor, self._embed_bm25, text)
        
        dense, late, splade, bm25 = await asyncio.gather(
            dense_task, late_task, splade_task, bm25_task
        )
        
        # Sparse Smart from query_embed returns object, need to convert
        smart_indices = splade.indices
        smart_values = splade.values
        
        return {
            "dense": dense,
            "late": late[0],
            "splade": {"indices": smart_indices, "values": smart_values},
            "bm25": bm25
        }
