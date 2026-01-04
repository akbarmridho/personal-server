from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum


class DocumentType(str, Enum):
    """Document type enum for investment documents."""
    NEWS = "news"
    FILING = "filing"
    ANALYSIS = "analysis"
    RUMOUR = "rumour"


class InvestmentDocument(BaseModel):
    """
    Investment document model matching the Qdrant schema design.
    """
    # Core Fields (Required)
    id: str = Field(..., description="Document ID (provided by caller)")
    type: DocumentType = Field(..., description="Document type")
    title: Optional[str] = Field(default=None, description="Document title or headline")
    content: str = Field(..., description="The actual text content")
    
    # Temporal Fields (Required)
    document_date: str = Field(
        ...,
        description="ISO 8601 format: '2025-10-31' (date only) or '2025-10-31T14:30:00+07:00' (datetime)"
    )
    
    # Source Fields (Required)
    source: Dict[str, Any] = Field(
        ...,
        description="Source metadata as Record<string, string>"
    )
    
    # URLs (Optional)
    urls: Optional[List[str]] = Field(default=None, description="Associated URLs")
    
    # Ticker/Symbol Fields (Optional)
    symbols: Optional[List[str]] = Field(
        default=None,
        description="Symbols discussed (e.g., ['BBCA', 'TLKM'])"
    )
    
    # Sector/Industry Fields (Optional)
    subsectors: Optional[List[str]] = Field(
        default=None,
        description="Subsectors discussed: 'financials', 'infrastructure', etc."
    )
    subindustries: Optional[List[str]] = Field(
        default=None,
        description="Subindustry classifications: 'banks', 'toll_roads', etc."
    )
    
    # Market Context Fields (Optional)
    indices: Optional[List[str]] = Field(
        default=None,
        description="Relevant indices: 'IHSG', 'LQ45', 'IDX30', etc."
    )

    def model_dump(self, **kwargs) -> Dict[str, Any]:
        """Override to exclude None values from output."""
        data = super().model_dump(**kwargs)
        return {k: v for k, v in data.items() if v is not None}


class InvestmentIngestRequest(BaseModel):
    """Request model for ingesting investment documents."""
    documents: List[InvestmentDocument] = Field(
        ...,
        description="List of investment documents to ingest"
    )


class InvestmentSearchRequest(BaseModel):
    """Enhanced search request with metadata filtering."""
    query: str = Field(..., description="Search query text")
    limit: int = Field(default=10, ge=1, le=100, description="Number of results")
    
    # Metadata filters (all optional)
    symbols: Optional[List[str]] = Field(
        default=None,
        description="Filter by symbols"
    )
    subsectors: Optional[List[str]] = Field(
        default=None,
        description="Filter by subsectors"
    )
    subindustries: Optional[List[str]] = Field(
        default=None,
        description="Filter by subindustries"
    )
    types: Optional[List[DocumentType]] = Field(
        default=None,
        description="Filter by document types"
    )
    date_from: Optional[str] = Field(
        default=None,
        description="Filter by date range start (ISO format)"
    )
    date_to: Optional[str] = Field(
        default=None,
        description="Filter by date range end (ISO format)"
    )
    pure_sector: Optional[bool] = Field(
        default=None,
        description="Filter for documents without symbols (pure sector/market news)"
    )


class SearchResult(BaseModel):
    """Search result model."""
    id: str
    score: float
    payload: Dict[str, Any]
