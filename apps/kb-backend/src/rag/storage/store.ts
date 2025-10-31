import { openrouter } from "@openrouter/ai-sdk-provider";
import { logger } from "@personal-server/common/utils/logger";
import { generateObject } from "ai";
import pRetry from "p-retry";
import { db, upsertDocument } from "../../db/db.js";
import {
  type VoyageEmbeddingModel,
  VoyageEmbeddings,
} from "../embeddings/voyage-embeddings.js";
import {
  DocumentSummarySchema,
  docSummarySystemPrompt,
  docSummaryUserPrompt,
} from "../prompts/doc-summary-prompt.js";

/**
 * Returns the first `n` words from a given string.
 *
 * @param text - The input string.
 * @param n - Number of words to take.
 * @returns The first `n` words as a string.
 */
function takeFirstNWords(text: string, n: number): string {
  if (!text || n <= 0) return "";

  const words = text.trim().split(/\s+/); // Split on any whitespace
  return words.slice(0, n).join(" ");
}

interface DocumentInsert {
  collection_id: number;
  title: string;
  content: string;
  hierarchy_path?: string | null;
  document_ts?: Date | null;
  metadata?: Record<string, any> | null;
}

interface DocumentChunkInsert {
  content: string;
  embedding: number[];
  chunk_index: number;
  max_chunk_index: number;
}

export class VectorStore {
  declare FilterType: Record<string, unknown>;
  private readonly upsertBatchSize = 500;
  private readonly embeddings: Map<string, VoyageEmbeddings> = new Map();

  /**
   * Store or update a document with chunks
   */
  async storeDocument(
    document: DocumentInsert,
    options: { skipSummary: boolean },
  ): Promise<{ id: number; isNew: boolean }> {
    const titlePath = document.hierarchy_path
      ? `${document.hierarchy_path}\\${document.title}`
      : document.title;

    const contentWithHierarchy = `${titlePath}\n\n${document.content}`;

    const docSummary = await this.generateSummary(
      document.collection_id,
      titlePath,
      document.content,
      options.skipSummary,
    );

    const { document_id, is_new } = await upsertDocument({
      collection_id_input: document.collection_id,
      title_input: document.title,
      content_input: contentWithHierarchy,
      summary_input: docSummary.summaryContent,
      summary_embedding_input: docSummary.summaryEmbedding,
      hierarchy_path_input: document.hierarchy_path,
      metadata_input: document.metadata,
    });

    try {
      const embeddedChunks = await this.getEmbedding(
        await this.getEmbeddingFromCollection(document.collection_id),
      ).createEmbeddedGFMContextPathChunks(document.content, titlePath);

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
            { err: deleteError },
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
  async getDocuments(
    collectionId: number,
    options?: {
      title?: string;
      daysBack?: number;
      from?: string;
      to?: string;
      metadataFilter?: Record<string, any>;
      fullContent?: boolean;
    },
  ) {
    let query = db
      .selectFrom("documents")
      .select(["id", "title", "summary", "content", "metadata", "document_ts"])
      .where("collection_id", "=", collectionId.toString());

    if (options?.title) {
      query = query.where("title", "=", options.title);
    }

    if (options?.daysBack) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - options.daysBack);
      query = query.where("document_ts", ">=", startDate);
    } else {
      if (options?.from) {
        query = query.where("document_ts", ">=", new Date(options.from));
      }
      if (options?.to) {
        query = query.where("document_ts", "<=", new Date(options.to));
      }
    }

    if (options?.metadataFilter && Object.keys(options.metadataFilter).length > 0) {
      for (const [key, value] of Object.entries(options.metadataFilter)) {
        query = query.where("metadata", "@>", JSON.stringify({ [key]: value }));
      }
    }

    const rows = await query.orderBy("document_ts", "desc").execute();

    return rows.map(({ content, summary, ...rest }) => {
      return {
        ...rest,
        content: options?.fullContent ? content : summary,
        document_ts: rest.document_ts.toString(),
      };
    });
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
    collection_id: number,
    titlePath: string,
    docContent: string,
    skipLLMSummary: boolean,
  ): Promise<{ summaryContent: string; summaryEmbedding: number[] }> {
    const formattedPrompt = docSummaryUserPrompt.format({
      titlePath,
      docContent,
    });

    const ops = async () => {
      const response = await generateObject({
        model: openrouter("google/gemini-2.5-flash-preview-09-2025", {
          models: [
            "google/gemini-2.5-flash-lite-preview-09-2025",
            "google/gemini-2.0-flash-001",
          ],
        }),
        schema: DocumentSummarySchema,
        system: docSummarySystemPrompt.format(),
        temperature: 0.5,
        prompt: formattedPrompt,
      });

      return response.object.summaryContent;
    };

    const summaryContent = skipLLMSummary
      ? takeFirstNWords(docContent, 200)
      : await pRetry(ops, { retries: 3 });

    const summary = `${titlePath}\n\n${summaryContent}`;

    const summaryEmbedding = await this.getEmbedding(
      await this.getEmbeddingFromCollection(collection_id),
    ).embedSingleDocument(summary);

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

  private getEmbedding(model: string): VoyageEmbeddings {
    if (this.embeddings.has(model)) {
      return this.embeddings.get(model)!;
    }

    const embeddings = new VoyageEmbeddings({
      model: model as VoyageEmbeddingModel,
    });

    this.embeddings.set(model, embeddings);

    return embeddings;
  }

  private async getEmbeddingFromCollection(collection_id: number) {
    const collection = await db
      .selectFrom("collections")
      .where("id", "=", collection_id.toString())
      .selectAll()
      .executeTakeFirstOrThrow();

    return collection.embedding;
  }
}

export const vectorStore = new VectorStore();
