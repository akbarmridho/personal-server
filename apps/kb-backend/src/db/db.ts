import { Kysely, PostgresDialect, sql } from "kysely";
import { Pool } from "pg";
import type { DB } from "./types.js";

export const db = new Kysely<DB>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: process.env.DATABASE_URL,
    }),
  }),
});

// upsert_document
export async function upsertDocument(params: {
  collection_id_input: number;
  title_input: string;
  content_input: string;
  summary_input: string;
  summary_embedding_input: number[];
  hierarchy_path_input?: string | null;
  metadata_input?: object | null;
  document_ts_input?: Date | null;
}) {
  const {
    collection_id_input,
    title_input,
    content_input,
    summary_input,
    summary_embedding_input,
    hierarchy_path_input = null,
    metadata_input = null,
    document_ts_input = null,
  } = params;

  const result = await sql<{
    document_id: number;
    is_new: boolean;
  }>`
    select * from upsert_document(
      ${collection_id_input},
      ${title_input},
      ${content_input},
      ${summary_input},
      ${summary_embedding_input}::vector,
      ${hierarchy_path_input},
      ${metadata_input}::jsonb,
      ${document_ts_input ? document_ts_input.toISOString() : null}
    )
  `.execute(db);

  return result.rows[0];
}

export interface MatchDocumentsHierarchicalInput {
  query_embedding: number[];
  hyde_embedding: number[];
  query_text: string;
  collection_id_input: number;
  keyword_weight?: number;
  semantic_weight?: number;
  doc_search_limit?: number;
  chunk_search_limit?: number;
  similarity_threshold?: number;
  exclude_document_ids?: number[] | null;
  metadata_filter?: object | null;
  strict_metadata_matching?: boolean;
  start_ts?: Date | null;
  end_ts?: Date | null;
}

export interface MatchDocumentsHierarchicalOutput {
  id: number;
  content: string;
  title: string;
  metadata: unknown;
  similarity: number;
  document_id: number;
  chunk_index: number;
  max_chunk_index: number;
  hierarchy_path: string | null;
}

export async function matchDocumentsHierarchical({
  query_embedding,
  hyde_embedding,
  query_text,
  collection_id_input,
  keyword_weight = 0.5,
  semantic_weight = 0.5,
  doc_search_limit = 32,
  chunk_search_limit = 512,
  similarity_threshold = 0.2,
  exclude_document_ids = null,
  metadata_filter = null,
  strict_metadata_matching = false,
  start_ts = null,
  end_ts = null,
}: MatchDocumentsHierarchicalInput): Promise<
  MatchDocumentsHierarchicalOutput[]
> {
  const res = await sql<MatchDocumentsHierarchicalOutput>`
    select * from match_documents_hierarchical(
      ${query_embedding}::vector,
      ${hyde_embedding}::vector,
      ${query_text},
      ${collection_id_input},
      ${keyword_weight},
      ${semantic_weight},
      ${doc_search_limit},
      ${chunk_search_limit},
      ${similarity_threshold},
      ${exclude_document_ids}::bigint[],
      ${metadata_filter}::jsonb,
      ${strict_metadata_matching},
      ${start_ts ? start_ts.toISOString() : null},
      ${end_ts ? end_ts.toISOString() : null}
    )
  `.execute(db);

  return res.rows;
}
