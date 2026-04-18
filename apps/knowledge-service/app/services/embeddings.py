from typing import List

from openrouter import OpenRouter
from openrouter.errors import ResponseValidationError

from app.core.config import settings


class EmbeddingService:
    DENSE_MODEL: str = "qwen/qwen3-embedding-8b"
    DENSE_DIMENSION: int = 1024

    def __init__(self):
        if not settings.OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY is required.")

        print("Loading dense embedding service...")
        self.openrouter_client = OpenRouter(api_key=settings.OPENROUTER_API_KEY)
        print("Dense embedding service loaded.")

    async def _embed_dense_batch(
        self,
        texts: List[str],
        *,
        is_query: bool,
    ) -> List[List[float]]:
        inputs = texts
        if is_query:
            inputs = [
                (
                    "Instruct: Given a search query, retrieve relevant passages "
                    f"that answer the query\nQuery: {text}"
                )
                for text in texts
            ]

        try:
            result = await self.openrouter_client.embeddings.generate_async(
                model=self.DENSE_MODEL,
                input=inputs,
                encoding_format="float",
                dimensions=self.DENSE_DIMENSION,
                retries=3,
            )
        except ResponseValidationError as e:
            raise RuntimeError(
                f"OpenRouter embeddings API error for model '{self.DENSE_MODEL}': {e}"
            ) from e

        return [item.embedding for item in result.data]

    async def embed_query(self, text: str) -> List[float]:
        return (await self._embed_dense_batch([text], is_query=True))[0]

    async def embed_documents(
        self,
        texts: List[str],
        batch_size: int = 50,
    ) -> List[List[float]]:
        embeddings: List[List[float]] = []

        for start in range(0, len(texts), batch_size):
            batch = texts[start : start + batch_size]
            embeddings.extend(
                await self._embed_dense_batch(batch, is_query=False)
            )

        return embeddings
