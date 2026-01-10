import { apiGet, apiPost } from "./client";
import type {
  FilterParams,
  InvestmentDocument,
  ListDocumentsResponse,
  SearchParams,
  SearchResult,
} from "./types";

/**
 * List documents with pagination (List Mode)
 * Used when no search query is present
 */
export async function listDocuments(
  params: FilterParams = {},
): Promise<ListDocumentsResponse> {
  const queryParams: Record<string, string> = {};

  if (params.limit) queryParams.limit = String(params.limit);
  if (params.offset) queryParams.offset = params.offset;
  if (params.symbols?.length) queryParams.symbols = params.symbols.join(",");
  if (params.subsectors?.length)
    queryParams.subsectors = params.subsectors.join(",");
  if (params.types?.length) queryParams.types = params.types.join(",");
  if (params.date_from) queryParams.date_from = params.date_from;
  if (params.date_to) queryParams.date_to = params.date_to;
  if (params.pure_sector !== undefined)
    queryParams.pure_sector = String(params.pure_sector);

  return apiGet<ListDocumentsResponse>("/knowledge/documents", queryParams);
}

/**
 * Search documents with semantic search (Search Mode)
 * Used when search query is present
 */
export async function searchDocuments(
  params: SearchParams,
): Promise<SearchResult[]> {
  const body = {
    query: params.query,
    limit: params.limit,
    symbols: params.symbols || null,
    subsectors: params.subsectors || null,
    types: params.types || null,
    date_from: params.date_from || null,
    date_to: params.date_to || null,
    pure_sector: params.pure_sector || null,
  };

  return apiPost<SearchResult[]>("/knowledge/documents/search", body);
}

/**
 * Get single document by ID
 */
export async function getDocument(id: string): Promise<InvestmentDocument> {
  return apiGet<InvestmentDocument>(`/knowledge/documents/${id}`);
}
