import { openrouter } from "@openrouter/ai-sdk-provider";
import { logger } from "@personal-server/common/utils/logger";
import { generateObject } from "ai";
import { type SqlBool, sql } from "kysely";
import pRetry from "p-retry";
import { db, upsertDocument } from "../db/db.js";
import { VoyageEmbeddings } from "../embeddings/voyage-embeddings.js";
import {
  DocumentSummarySchema,
  docSummarySystemPrompt,
  docSummaryUserPrompt,
} from "../prompts/doc-summary-prompt.js";

export interface DocumentInsert {
  collection_id: number;
  title: string;
  content: string;
  summary: string;
  summary_embedding: number[];
  hierarchy_path?: string | null;
  metadata?: Record<string, any> | null;
}

export interface DocumentChunkInsert {
  content: string;
  embedding: number[];
  chunk_index: number;
  max_chunk_index: number;
}

export class VectorStore {
  declare FilterType: Record<string, unknown>;
  private readonly upsertBatchSize = 500;
  private readonly embeddings: VoyageEmbeddings = new VoyageEmbeddings({
    model: "voyage-context-3",
  });

  /**
   * Store or update a document with chunks
   */
  async storeDocument(
    collection_id: number,
    document: Omit<
      DocumentInsert,
      "summary" | "summary_embedding" | "metadata"
    > & {
      metadata: Record<string, any>;
    },
  ): Promise<{ id: number; isNew: boolean }> {
    const titlePath = document.hierarchy_path
      ? `${document.hierarchy_path}\\${document.title}`
      : document.title;

    const contentWithHierarchy = `${titlePath}\n\n${document.content}`;
    const docSummary = await this.generateSummary(titlePath, document.content);

    const { document_id, is_new } = await upsertDocument({
      collection_id_input: collection_id,
      title_input: document.title,
      content_input: contentWithHierarchy,
      summary_input: docSummary.summaryContent,
      summary_embedding_input: docSummary.summaryEmbedding,
      hierarchy_path_input: document.hierarchy_path,
      metadata_input: document.metadata,
    });

    try {
      const embeddedChunks =
        await this.embeddings.createEmbeddedGFMContextPathChunks(
          document.content,
          titlePath,
        );

      await this.storeEmbeddedChunks(embeddedChunks, document_id);
    } catch (chunkError) {
      if (is_new) {
        try {
          await db
            .deleteFrom("documents")
            .where("id", "=", document_id.toString())
            .execute();
          logger.error("Deleted document due to chunk creation failure");
        } catch (deleteError) {
          logger.error(
            deleteError,
            "Failed to delete document after chunk creation failure:",
          );
        }
      }
      throw new Error(
        `Failed to process document chunks: ${chunkError as string}`,
      );
    }

    return { id: document_id, isNew: is_new };
  }

  /**
   * Get existing documents in a collection
   */
  async getExistingDocumentsByCollectionId<T>(
    collectionId: number,
    metadataFilters: Record<string, string | string[]> = {},
  ): Promise<Map<number, T & { updated_at: string }>> {
    let query = db
      .selectFrom("documents")
      .select(["id", "metadata", "updated_at"])
      .where("collection_id", "=", collectionId.toString());

    // optional metadata filters (jsonb @> operator)
    for (const [key, value] of Object.entries(metadataFilters)) {
      query = query.where(
        sql<SqlBool>`metadata @> ${JSON.stringify({ [key]: value })}::jsonb`,
      );
    }

    const rows = await query.execute();

    return new Map(
      rows.map((doc) => [
        Number(doc.id),
        {
          ...(doc.metadata as T),
          updated_at: doc.updated_at.toString(),
        },
      ]),
    );
  }

  /**
   * Delete document by its primary ID
   */
  async deleteDocumentById(
    documentId: number,
  ): Promise<{ documentId?: number; deleted: boolean }> {
    const deleted = await db
      .deleteFrom("documents")
      .where("id", "=", documentId.toString())
      .returning(["id"])
      .executeTakeFirst();

    return {
      documentId: deleted?.id ? Number(deleted.id) : undefined,
      deleted: !!deleted,
    };
  }

  /**
   * Generate a summary for a document and create an embedding for it
   * @param titlePath The title path of the document
   * @param docContent The content of the document
   * @returns An object containing the summary content and its embedding
   */
  private async generateSummary(
    titlePath: string,
    docContent: string,
  ): Promise<{ summaryContent: string; summaryEmbedding: number[] }> {
    const formattedPrompt = docSummaryUserPrompt.format({
      titlePath,
      docContent,
    });

    const ops = async () => {
      const response = await generateObject({
        model: openrouter("google/gemini-2.5-flash"),
        schema: DocumentSummarySchema,
        system: docSummarySystemPrompt.format(),
        temperature: 0.5,
        prompt: formattedPrompt,
      });

      return response.object.summaryContent;
    };

    const summaryContent = await pRetry(ops, { retries: 3 });

    const summary = `${titlePath}\n\n${summaryContent}`;

    const summaryEmbedding = await this.embeddings.embedSingleDocument(summary);

    return { summaryContent, summaryEmbedding };
  }

  /**
   * Store embedded chunks in batches
   */
  private async storeEmbeddedChunks(
    chunks: DocumentChunkInsert[],
    documentId: number,
  ): Promise<void> {
    for (let i = 0; i < chunks.length; i += this.upsertBatchSize) {
      const batch = chunks.slice(i, i + this.upsertBatchSize);
      await db
        .insertInto("document_chunks")
        .values(
          batch.map((chunk) => ({
            ...chunk,
            document_id: documentId,
            embedding: JSON.stringify(chunk.embedding), // store as string, or cast to vector if schema supports
          })),
        )
        .execute();
    }
  }
}
