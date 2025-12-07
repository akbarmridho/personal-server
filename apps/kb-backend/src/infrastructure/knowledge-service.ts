import axios, { type AxiosError, type AxiosInstance } from "axios";
import { logger } from "../utils/logger.js";
import { env } from "./env.js";

export type DocumentType = "news" | "weekly_summary" | "analysis" | "rumour";

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
}

export const knowledgeService = new KnowledgeService(env.KNOWLEDGE_SERVICE_URL);
