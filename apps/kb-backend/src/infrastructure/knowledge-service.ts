import axios, { type AxiosError, type AxiosInstance } from "axios";
import { logger } from "../utils/logger.js";
import { takeFirstNTokens } from "../utils/token-count.js";
import { env } from "./env.js";

export type DocumentType = "news" | "filing" | "analysis" | "rumour";

export interface InvestmentDocument {
  /** Document ID (provided by caller) */
  id: string;
  /** Document type */
  type: DocumentType;
  /** Document title or headline */
  title?: string | null;
  /** The actual text content */
  content: string;
  /** ISO 8601 format: '2025-10-31' or '2025-10-31T14:30:00+07:00' */
  document_date: string;
  /** Source metadata as Key-Value pairs */
  source: Record<string, string>;
  /** Associated URLs */
  urls?: string[] | null;
  /** Symbols discussed (e.g., ['BBCA', 'TLKM']) */
  symbols?: string[] | null;
  /** Subsectors discussed */
  subsectors?: string[] | null;
  /** Subindustry classifications */
  subindustries?: string[] | null;
  /** Relevant indices */
  indices?: string[] | null;
}

export interface InvestmentIngestRequest {
  documents: InvestmentDocument[];
}

// Generic response type based on the 200 OK schema
export interface IngestResponse {
  [key: string]: string | number;
}

export interface ListDocumentsParams {
  limit?: number;
  page?: number;
  symbols?: string[] | null;
  subsectors?: string[] | null;
  subindustries?: string[] | null;
  types?: DocumentType[] | null;
  date_from?: string | null;
  date_to?: string | null;
  pure_sector?: boolean | null;
  source_names?: string[] | null;
  include_ids?: string[] | null;
  exclude_ids?: string[] | null;
}

export interface DocumentSnapshot {
  id: string;
  type: DocumentType;
  title?: string | null;
  content_preview: string;
  document_date: string;
  symbols?: string[] | null;
}

export interface ListDocumentsPreviewResponse {
  items: DocumentSnapshot[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ListDocumentsResponse {
  items: Omit<SearchResult, "score">[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface SearchRequest {
  query: string;
  limit?: number;
  use_dense?: boolean;
  symbols?: string[] | null;
  subsectors?: string[] | null;
  subindustries?: string[] | null;
  types?: DocumentType[] | null;
  date_from?: string | null;
  date_to?: string | null;
  pure_sector?: boolean | null;
  source_names?: string[] | null;
  include_ids?: string[] | null;
  exclude_ids?: string[] | null;
}

export interface SearchResult {
  id: string;
  score: number;
  payload: Record<string, any>;
}

export class KnowledgeService {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        "Content-Type": "application/json",
      },
      paramsSerializer: {
        // Serialize arrays with repeated keys (FastAPI compatible format)
        // e.g., types=news&types=analysis instead of types[]=news&types[]=analysis
        serialize: (params) => {
          const searchParams = new URLSearchParams();
          for (const [key, value] of Object.entries(params)) {
            if (value === null || value === undefined) {
              continue;
            }
            if (Array.isArray(value)) {
              // Repeat the key for each array element
              for (const item of value) {
                searchParams.append(key, String(item));
              }
            } else {
              searchParams.append(key, String(value));
            }
          }
          return searchParams.toString();
        },
      },
    });
  }

  /**
   * Ingest investment documents into the knowledge base.
   * Corresponds to POST /documents
   */
  public async ingestDocuments(
    payload: InvestmentIngestRequest,
  ): Promise<IngestResponse> {
    try {
      const response = await this.client.post<IngestResponse>(
        "/documents",
        payload,
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        // Handle 422 Validation Errors specifically
        if (axiosError.response?.status === 422) {
          logger.error(axiosError.response.data, "Validation error");
          throw new Error(`Ingest failed: Validation Error (422)`);
        }

        // Handle other HTTP errors
        if (axiosError.response) {
          throw new Error(
            `Ingest failed with status ${axiosError.response.status}: ${axiosError.message}`,
          );
        }
      }

      // Handle network or unexpected errors
      throw error;
    }
  }

  async listDocumentsPreview(
    params: ListDocumentsParams,
  ): Promise<ListDocumentsPreviewResponse> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const offset = (page - 1) * limit;

    const { page: _, ...restParams } = params;
    const response = await this.client.get<{
      items: Array<{ id: string; payload: InvestmentDocument }>;
      total_count: number;
    }>("/documents", {
      params: {
        ...restParams,
        offset,
        limit,
      },
    });

    const total_count = response.data.total_count;
    const total_pages = Math.ceil(total_count / limit);

    return {
      items: response.data.items.map((item) => ({
        id: item.id,
        type: item.payload.type,
        title: item.payload.title,
        content_preview: takeFirstNTokens(item.payload.content, 100),
        document_date: item.payload.document_date,
        symbols: item.payload.symbols,
      })),
      total_count,
      page,
      page_size: limit,
      total_pages,
    };
  }

  async listDocuments(
    params: ListDocumentsParams,
  ): Promise<ListDocumentsResponse> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const offset = (page - 1) * limit;

    const { page: _, ...restParams } = params;
    const response = await this.client.get<{
      items: Array<{ id: string; payload: InvestmentDocument }>;
      total_count: number;
    }>("/documents", {
      params: {
        ...restParams,
        offset,
        limit,
      },
    });

    const total_count = response.data.total_count;
    const total_pages = Math.ceil(total_count / limit);

    return {
      items: response.data.items,
      total_count,
      page,
      page_size: limit,
      total_pages,
    };
  }

  async searchDocuments(request: SearchRequest): Promise<SearchResult[]> {
    const response = await this.client.post<SearchResult[]>(
      "/documents/search",
      request,
    );
    return response.data;
  }

  async getDocument(documentId: string): Promise<Record<string, any>> {
    const response = await this.client.get<Record<string, any>>(
      `/documents/${documentId}`,
    );
    return response.data;
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.client.delete(`/documents/${documentId}`);
  }

  async updateDocument(
    documentId: string,
    payload: Omit<InvestmentDocument, "id">,
  ): Promise<IngestResponse> {
    // Reuse ingest endpoint with same ID for update
    const request: InvestmentIngestRequest = {
      documents: [{ id: documentId, ...payload }],
    };
    return this.ingestDocuments(request);
  }

  async listSourceNames(): Promise<string[]> {
    const response = await this.client.get<string[]>("/sources");
    return response.data;
  }
}

export const knowledgeService = new KnowledgeService(env.KNOWLEDGE_SERVICE_URL);
