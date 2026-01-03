from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Knowledge Service"
    
    # Qdrant
    QDRANT_HOST: str = "localhost"
    QDRANT_COLLECTION_NAME: str = "investment_documents"
    
    # API Keys
    OPENROUTER_API_KEY: str | None = None
    
    # Deduplication settings
    DEDUPLICATION_SIMILARITY_THRESHOLD: float = 0.85
    DEDUPLICATION_DATE_RANGE_DAYS: int = 7

settings = Settings()
