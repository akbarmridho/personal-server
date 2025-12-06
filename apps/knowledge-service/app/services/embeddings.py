import asyncio
import os
from concurrent.futures import ThreadPoolExecutor
from typing import Any
from FlagEmbedding import BGEM3FlagModel
from openrouter import OpenRouter
from app.core.config import settings

class EmbeddingService:
    DENSE_MODEL: str = "qwen/qwen3-embedding-8b"
    DENSE_DIMENSION: int = 1024
    BGE_M3_LENGTH: int = 3072
    BGE_M3_COLBERT_DIMENSION: int = 1024
    bge_m3_model: BGEM3FlagModel
    openrouter_client: OpenRouter

    def __init__(self):
        # Initialize models
        print("Loading models...")

        self.bge_m3_model = BGEM3FlagModel(
            'BAAI/bge-m3',
            use_fp16=True,
            query_max_length=self.BGE_M3_LENGTH,
            batch_size=int(os.getenv("BGE_M3_BATCH_SIZE", 4))
        )
        self.m3_lock = asyncio.Lock()

        # Dense (OpenRouter with Qwen)
        if not settings.OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY is required. Please set it in your environment variables.")

        self.openrouter_client = OpenRouter(api_key=settings.OPENROUTER_API_KEY)

        # Used for BGE M3 CPU/GPU model forward
        self.executor = ThreadPoolExecutor(max_workers=1)  # 1 ensures no concurrent M3 calls

        print("Models loaded.")

    # ---------------------------
    # DENSE (ASYNC, OPENROUTER)
    # ---------------------------
    async def _embed_dense(self, texts: List[str], is_query: bool = False) -> List[List[float]]:
        BATCH_SIZE = 50
        all_embeddings = []

        def generate_task(text: str) -> str:
            return f"Instruct: Given a search query, retrieve relevant passages that answer the query\nQuery: {text}"

        if is_query:
            texts = [generate_task(t) for t in texts]

        for i in range(0, len(texts), BATCH_SIZE):
            batch = texts[i:i + BATCH_SIZE]

            result = await self.openrouter_client.embeddings.generate_async(
                input=batch,
                encoding_format="float",
                dimensions=self.DENSE_DIMENSION,
                retries=3
            )
            all_embeddings.extend([e.embedding for e in result.data])

        return all_embeddings

    async def _embed_m3(self, texts: list[str]) -> list[dict[str, Any]]:
        """
        BGE-M3 encode must not run concurrently.
        Use async lock + thread executor to keep it safe.
        """
        async with self.m3_lock:
            loop = asyncio.get_event_loop()
            output = await loop.run_in_executor(
                self.executor,
                lambda: self.bge_m3_model.encode(
                    texts,
                    return_colbert_vecs=True,
                    return_sparse=True
                )
            )

        results = []
        for i in range(len(texts)):
            results.append({
                "sparse": output["lexical_weights"][i],
                "late": output["colbert_vecs"][i]
            })

        return results

    # ---------------------------
    # QUERY EMBEDDING
    # ---------------------------
    async def embed_query(self, text: str) -> dict[str, Any]:
        dense_task = self._embed_dense([text], is_query=True)
        m3_task = self._embed_m3([text])

        dense, m3 = await asyncio.gather(dense_task, m3_task)

        return {
            "dense": dense[0],
            "late": m3[0]["late"],
            "sparse": m3[0]["sparse"]
        }

    # ---------------------------
    # DOCUMENT EMBEDDING
    # ---------------------------
    async def embed_documents(self, texts: List[str], batch_size: int = 20) -> List[dict[str, Any]]:
        results = []

        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]

            dense_task = self._embed_dense(batch_texts, is_query=False)
            m3_task = self._embed_m3(batch_texts)

            dense, m3 = await asyncio.gather(dense_task, m3_task)

            for j in range(len(batch_texts)):
                results.append({
                    "dense": dense[j],
                    "late": m3[j]["late"],
                    "sparse": m3[j]["sparse"]
                })

        return results
