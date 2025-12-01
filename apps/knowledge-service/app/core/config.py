from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Knowledge Service"
    
    # Qdrant
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    QDRANT_COLLECTION_NAME: str = "news"
    
    # Models
    COLBERT_MODEL: str = "mixedbread-ai/mxbai-edge-colbert-v0-32m"
    SPARSE_MODEL: str = "Qdrant/bm42-all-minilm-l6-v2-attentions"
    DENSE_MODEL: str = "qwen/qwen3-embedding-8b"
    
    # API Keys
    OPENROUTER_API_KEY: str | None = None
    
    class Config:
        env_file: str = ".env"

settings = Settings()
