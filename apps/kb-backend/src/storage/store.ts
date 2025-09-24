import { VoyageEmbeddings } from "../embeddings/voyage-embeddings.js";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface CollectionInsert {
  name: string;
}

export interface DocumentInsert {
  collection_id: number;
  title: string;
  content: string;
  summary: string;
  summary_embedding: number[];
  hierarchy_path?: string | null;
  metadata?: Json | null;
}

export interface DocumentChunkInsert {
  content: string;
  embedding: number[];
  document_id: number;
  chunk_index: number;
  max_chunk_index: number;
}

export class VectorStore {
  declare FilterType: Record<string, unknown>;
  private readonly upsertBatchSize = 500;
  private readonly embeddings: VoyageEmbeddings = new VoyageEmbeddings({
    model: "voyage-context-3",
  });
}
