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

// Search Result (includes similarity score)
export interface SearchResult {
  payload: InvestmentDocument;
  id: string;
  score: number;
}

// List Documents Response
export interface ListDocumentsResponse {
  items: Omit<SearchResult, "score">[];
  next_page_offset?: number;
}

// Sector and Subsector Types
export interface Subsector {
  name: string;
  description: string;
}

export interface Sector {
  name: string;
  subsectors: Subsector[];
}

export interface SubsectorOption {
  value: string;
  label: string;
}

// Stock Universe Response
export interface StockUniverseResponse {
  symbols: string[];
  count: number;
}

// Company with name
export interface Company {
  symbol: string;
  name: string;
  sector: string;
  subSector: string;
  industry: string;
  subIndustry: string;
}

// All Companies Response
export interface AllCompaniesResponse {
  success: boolean;
  data: Company[];
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
  offset?: number;
  symbols?: string[];
  subsectors?: string[];
  types?: DocumentType[];
  date_from?: string;
  date_to?: string;
  pure_sector?: boolean;
  source_names?: string[];
  include_ids?: string[];
  exclude_ids?: string[];
}

// Search Parameters
export interface SearchParams extends Omit<FilterParams, "offset"> {
  query: string;
  use_dense?: boolean;
}
