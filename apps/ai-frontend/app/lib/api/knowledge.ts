import { apiDelete, apiGet, apiPost, apiPut } from "./client";
import type {
  FilterParams,
  InvestmentDocument,
  ListDocumentsResponse,
  SearchParams,
  SearchResult,
  Sector,
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
  if (params.offset) queryParams.offset = String(params.offset);
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
  const body: Record<string, unknown> = {
    query: params.query,
    limit: params.limit,
  };

  if (params.use_dense !== undefined) body.use_dense = params.use_dense;
  if (params.symbols?.length) body.symbols = params.symbols;
  if (params.subsectors?.length) body.subsectors = params.subsectors;
  if (params.types?.length) body.types = params.types;
  if (params.date_from) body.date_from = params.date_from;
  if (params.date_to) body.date_to = params.date_to;
  if (params.pure_sector !== undefined) body.pure_sector = params.pure_sector;

  return apiPost<SearchResult[]>("/knowledge/documents/search", body);
}

/**
 * Get available subsectors for filtering
 */
export async function getSubsectors(): Promise<Sector[]> {
  return apiGet<Sector[]>("/stock-market-id/sectors");
}

/**
 * Get a single document by ID
 */
export async function getDocument(
  documentId: string,
): Promise<{ id: string; payload: InvestmentDocument }> {
  return apiGet<{ id: string; payload: InvestmentDocument }>(
    `/knowledge/documents/${documentId}`,
  );
}

/**
 * Delete a document by ID
 */
export async function deleteDocument(documentId: string): Promise<void> {
  await apiDelete<{ message: string }>(`/knowledge/documents/${documentId}`);
}

/**
 * Update a document by ID
 */
export async function updateDocument(
  documentId: string,
  payload: Omit<InvestmentDocument, "id">,
): Promise<{ count: number; skipped_count: number }> {
  return apiPut<{ count: number; skipped_count: number }>(
    `/knowledge/documents/${documentId}`,
    payload,
  );
}
