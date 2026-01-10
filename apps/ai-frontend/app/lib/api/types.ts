// Document Types
export type DocumentType = "news" | "filing" | "analysis" | "rumour";

// Investment Document (full document)
export interface InvestmentDocument {
  id: string;
  type: DocumentType;
  title?: string;
  content: string;
  document_date: string; // ISO 8601: "2025-01-15" or "2025-01-15T14:30:00+07:00"
  source: Record<string, string>;
  urls?: string[];
  symbols?: string[];
  subsectors?: string[];
  subindustries?: string[];
  indices?: string[];
}

// Document Snapshot (for list mode - preview only)
export interface DocumentSnapshot {
  id: string;
  type: DocumentType;
  title?: string;
  preview: string; // 100 token preview of content
  document_date: string;
  source: Record<string, string>;
  urls?: string[];
  symbols?: string[];
  subsectors?: string[];
  subindustries?: string[];
  indices?: string[];
}

// Search Result (includes similarity score)
export interface SearchResult {
  document: InvestmentDocument;
  similarity_score: number;
}

// List Documents Response
export interface ListDocumentsResponse {
  items: DocumentSnapshot[];
  next_page_offset?: string;
}

// Stock Universe Response
export interface StockUniverseResponse {
  symbols: string[];
  count: number;
}

// API Response Wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Filter Parameters (for API requests)
export interface FilterParams {
  limit?: number;
  offset?: string;
  symbols?: string[];
  subsectors?: string[];
  types?: DocumentType[];
  date_from?: string;
  date_to?: string;
  pure_sector?: boolean;
}

// Search Parameters
export interface SearchParams extends Omit<FilterParams, "offset"> {
  query: string;
}
