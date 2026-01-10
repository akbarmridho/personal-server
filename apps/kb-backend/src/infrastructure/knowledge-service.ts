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
  offset?: string | null;
  symbols?: string[] | null;
  subsectors?: string[] | null;
  subindustries?: string[] | null;
  types?: DocumentType[] | null;
  date_from?: string | null;
  date_to?: string | null;
  pure_sector?: boolean | null;
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
  next_page_offset?: string;
}

export interface ListDocumentsResponse {
  items: Omit<SearchResult, "score">[];
  next_page_offset?: string;
}

export interface SearchRequest {
  query: string;
  limit?: number;
  symbols?: string[] | null;
  subsectors?: string[] | null;
  subindustries?: string[] | null;
  types?: DocumentType[] | null;
  date_from?: string | null;
  date_to?: string | null;
  pure_sector?: boolean | null;
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
    const response = await this.client.get<{
      items: Array<{ id: string; payload: InvestmentDocument }>;
      next_page_offset?: string;
    }>("/documents", { params });

    return {
      items: response.data.items.map((item) => ({
        id: item.id,
        type: item.payload.type,
        title: item.payload.title,
        content_preview: takeFirstNTokens(item.payload.content, 100),
        document_date: item.payload.document_date,
        symbols: item.payload.symbols,
      })),
      next_page_offset: response.data.next_page_offset,
    };
  }

  async listDocuments(
    params: ListDocumentsParams,
  ): Promise<ListDocumentsResponse> {
    const response = await this.client.get<{
      items: Array<{ id: string; payload: InvestmentDocument }>;
      next_page_offset?: string;
    }>("/documents", { params });

    return {
      items: response.data.items,
      next_page_offset: response.data.next_page_offset,
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
}

export const knowledgeService = new KnowledgeService(env.KNOWLEDGE_SERVICE_URL);
