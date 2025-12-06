"""
Document processing utilities for investment documents.

Includes:
- prepare_embedding_text(): Generate enriched content for better retrieval
- Validation helpers for document schema
"""

from typing import Dict, Any


def prepare_embedding_text(doc: Dict[str, Any]) -> str:
    """
    Prepare enriched content for embedding.
    Works for all document types (news, weekly_summary, analysis, rumour).
    
    Combines structured metadata with content to improve:
    - Company/ticker-specific queries
    - Sector/industry thematic queries
    - Temporal queries
    - Source-aware queries
    
    Args:
        doc: Investment document dict with type, title, content, and metadata
        
    Returns:
        Enriched text combining metadata and content
        
    Example:
        >>> doc = {
        ...     "type": "news",
        ...     "title": "BBCA Q3 Earnings",
        ...     "content": "Bank Central Asia reported...",
        ...     "tickers": ["BBCA"],
        ...     "sectors": ["financials"],
        ...     "document_date": "2025-10-21"
        ... }
        >>> prepare_embedding_text(doc)
        'News: BBCA Q3 Earnings\\nCompanies: BBCA\\nSectors: financials\\n
Date: 2025-10-21\\n\\nBank Central Asia reported...'
    """
    parts = []
    
    # 1. Document type (helps distinguish news vs analysis vs rumours)
    doc_type = doc['type'].replace('_', ' ').title()
    parts.append(f"{doc_type}: {doc['title']}")
    
    # 2. Ticker context (if available)
    if doc.get('tickers'):
        parts.append(f"Companies: {', '.join(doc['tickers'])}")
    
    # 3. Sector/industry context (if available)
    if doc.get('sectors'):
        parts.append(f"Sectors: {', '.join(doc['sectors'])}")
    if doc.get('industries'):
        parts.append(f"Industries: {', '.join(doc['industries'])}")
    
    # 4. Market indices (if available)
    if doc.get('market_indices'):
        parts.append(f"Markets: {', '.join(doc['market_indices'])}")
    
    # 5. Source context (important for rumours)
    if doc['type'] == 'rumour':
        platform = doc['source'].get('platform', 'social media')
        parts.append(f"Source: {platform} discussion")
    
    # 6. Temporal context
    parts.append(f"Date: {doc['document_date']}")
    
    # 7. Main content (most important - gets full weight)
    parts.append('')  # Empty line separator
    parts.append(doc['content'])
    
    return '\n'.join(parts)


def validate_document_schema(doc: Dict[str, Any]) -> bool:
    """
    Validate that a document has the required fields.
    
    Args:
        doc: Document to validate
        
    Returns:
        True if valid, False otherwise
        
    Raises:
        ValueError: If document is missing required fields
    """
    required_fields = ['id', 'type', 'title', 'content', 'document_date', 'source']
    
    for field in required_fields:
        if field not in doc or doc[field] is None:
            raise ValueError(f"Document missing required field: {field}")
    
    # Validate document type
    valid_types = ['news', 'weekly_summary', 'analysis', 'rumour']
    if doc['type'] not in valid_types:
        raise ValueError(f"Invalid document type: {doc['type']}. Must be one of {valid_types}")
    
    # Validate source is a dict
    if not isinstance(doc['source'], dict):
        raise ValueError(f"Source must be a dict, got {type(doc['source'])}")
    
    return True
