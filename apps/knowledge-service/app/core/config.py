from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Knowledge Service"
    
    # Qdrant
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    QDRANT_COLLECTION_NAME: str = "news"
    
    # API Keys
    OPENROUTER_API_KEY: str | None = None
    
    class Config:
        env_file: str = ".env"

settings = Settings()
