from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class DocumentInput(BaseModel):
    text: str
    metadata: Dict[str, Any] = {}
    id: Optional[str] = None

class IngestRequest(BaseModel):
    documents: List[DocumentInput]

class SearchRequest(BaseModel):
    query: str
    limit: int = 10

class SearchResult(BaseModel):
    id: str
    score: float
    payload: Dict[str, Any]
