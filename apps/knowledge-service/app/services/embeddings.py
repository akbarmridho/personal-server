import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Any
from openrouter import OpenRouter
from fastembed import SparseTextEmbedding
from pylate import models as pylate_models
from app.core.config import settings
from app.services.text_processing import TextProcessor
from tokenizers import Tokenizer

# other interesting models: bge-m3, gte-multilingual
# current approach (bm42 and colbert) are trained on common english dataset meanwhile our dataset is focused on Indonesia stock market news even though
# it is mostly written in english
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
        
        # Sparse (FastEmbed) - this is BM42 which is a SPLADE-like model
        self.splade_model: SparseTextEmbedding = SparseTextEmbedding(model_name=self.SPLADE_MODEL)

        # Text Processor for chunking this sparse model
        self.sparse_text_processor: TextProcessor = TextProcessor(chunk_size=self.SPLADE_TOKEN_LIMIT, overlap=64, tokenizer=Tokenizer.from_pretrained(model_name=self.splade_model))
        
        # Dense (OpenRouter with Qwen)
        if not settings.OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY is required. Please set it in your environment variables.")

        self.openrouter_client: OpenRouter = OpenRouter(api_key=settings.OPENROUTER_API_KEY)
        
        self.executor = ThreadPoolExecutor(max_workers=2)

        print("Models loaded.")

    def _embed_dense(self, texts: list[str], is_query: bool = False) -> list[list[float]]:
        """
        Generate dense embeddings for texts with batching.
        Processes texts in batches of 50 to optimize API calls.
        """
        BATCH_SIZE = 50
        all_embeddings = []

        def generate_task(text: str) -> str:
            return f"Instruct: Given a search query, retrieve relevant passages that answer the query\nQuery: {text}"
        
        if is_query:
            texts = [generate_task(text) for text in texts]

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

    async def embed_query(self, text: str) -> dict[str, Any]:
        # Similar to document but with is_query=True for models that support it
        loop = asyncio.get_event_loop()
        
        dense_task = loop.run_in_executor(self.executor, lambda: self._embed_dense([text], True)[0])
        late_task = loop.run_in_executor(self.executor, self._embed_late, [text], True)
        splade_task = loop.run_in_executor(self.executor, lambda: list(self.splade_model.query_embed([text]))[0])
        
        dense, late, splade = await asyncio.gather(
            dense_task, late_task, splade_task
        )

        return {
            "dense": dense,
            "late": late[0],
            "splade": splade
        }

    async def embed_documents(self, texts: list[str], batch_size: int = 20) -> list[dict[str, Any]]:
        """
        Generate all embeddings for multiple documents in batches.
        Processes texts in batches to optimize API calls and memory usage.
        """
        loop = asyncio.get_event_loop()
        all_embeddings = []
        
        # Process texts in batches
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]
            
            # Run dense embeddings in batch (already optimized in _embed_dense)
            dense_task = loop.run_in_executor(self.executor, self._embed_dense, batch_texts, False)
            
            # Run late embeddings in batch
            late_task = loop.run_in_executor(self.executor, self._embed_late, batch_texts)
            
            # Run sparse embeddings for each text in batch (still needs individual processing due to chunking)
            splade_tasks = [
                loop.run_in_executor(self.executor, self._embed_splade, text)
                for text in batch_texts
            ]
            
            dense, late, splade_results = await asyncio.gather(
                dense_task, late_task, *splade_tasks
            )
            
            # Combine results for this batch
            for j in range(len(batch_texts)):
                all_embeddings.append({
                    "dense": dense[j],
                    "late": late[j],
                    "splade": splade_results[j]
                })
        
        return all_embeddings
