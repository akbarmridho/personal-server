from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum
from datetime import datetime


class DocumentType(str, Enum):
    """Document type enum for investment documents."""
    NEWS = "news"
    WEEKLY_SUMMARY = "weekly_summary"
    ANALYSIS = "analysis"
    RUMOUR = "rumour"


class InvestmentDocument(BaseModel):
    """
    Investment document model matching the Qdrant schema design.
    
    See: ai-apps/investment/docs/qdrant-schema-design.md
    """
    # Core Fields (Required)
    id: str = Field(..., description="Document ID (provided by caller)")
    type: DocumentType = Field(..., description="Document type")
    title: str = Field(..., description="Document title or headline")
    content: str = Field(..., description="The actual text content")
    
    # Temporal Fields (Required)
    document_date: str = Field(
        ...,
        description="ISO 8601 format: '2025-10-31' (date only) or '2025-10-31T14:30:00+07:00' (datetime)"
    )
    
    # Source Fields (Required)
    source: Dict[str, str] = Field(
        ...,
        description="Source metadata as Record<string, string>"
    )
    
    # URLs (Optional)
    urls: Optional[List[str]] = Field(default=None, description="Associated URLs")
    
    # Ticker/Symbol Fields (Optional)
    tickers: Optional[List[str]] = Field(
        default=None,
        description="Tickers discussed (e.g., ['BBCA', 'TLKM'])"
    )
    
    # Sector/Industry Fields (Optional)
    sectors: Optional[List[str]] = Field(
        default=None,
        description="Sectors discussed: 'financials', 'infrastructure', etc."
    )
    industries: Optional[List[str]] = Field(
        default=None,
        description="Industry classifications: 'banks', 'toll_roads', etc."
    )
    
    # Market Context Fields (Optional)
    market_indices: Optional[List[str]] = Field(
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
    tickers: Optional[List[str]] = Field(
        default=None,
        description="Filter by ticker symbols"
    )
    sectors: Optional[List[str]] = Field(
        default=None,
        description="Filter by sectors"
    )
    industries: Optional[List[str]] = Field(
        default=None,
        description="Filter by industries"
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


class SearchResult(BaseModel):
    """Search result model."""
    id: str
    score: float
    payload: Dict[str, Any]
