import { parseDate } from "@personal-server/common/utils/date";
import { logger } from "@personal-server/common/utils/logger";
import { db, matchDocumentsHierarchical } from "../../db/db.js";
import { VoyageEmbeddings } from "../embeddings/voyage-embeddings.js";

// Extended search parameters
export interface HierachicalSearchParams {
  metadataFilter?: Record<string, unknown>;
  strictMetadataMatching?: boolean; // Controls how missing properties are handled
  // Parameters for hierarchical search
  doc_search_limit?: number;
  chunk_search_limit?: number;
  chunk_document_threshold?: number;
  // Weights for hybrid search
  embedding_weight?: number;
  fulltext_weight?: number;
  // Option to concatenate chunks into a single string
  concatChunks?: boolean;
  // Similarity threshold for filtering results
  similarityThreshold?: number;
  // Document IDs to exclude from search
  excludeDocumentIds?: number | number[];
  // Retrieve full document when majority of chunks are returned for a document
  useFullDocumentWhenMajority?: boolean;
  majorityChunkThreshold?: number;
  // temporal filter
  start_date?: string;
  end_date?: string;
}

// Individual chunk result
export interface ChunkItem {
  id: number;
  content: string;
  similarity: number;
  chunkIndex?: number;
  maxChunkIndex?: number;
}

export interface DocumentMapped {
  pageContent: string;
  metadata: {
    id: number;
    documentId: number;
    similarity: number;
  };
}

// Grouped search result by document
export interface GroupedSearchResultItem {
  metadata: Record<string, unknown>;
  title: string;
  similarity: number; // Highest similarity score among chunks
  documentId: number;
  hierarchyPath?: string;
  contentParts: ChunkItem[] | string;
}

// Retriever configuration
export interface RetrieverArgs {
  docSearchLimit?: number;
  chunkSearchLimit?: number;
  chunkDocumentThreshold?: number;
  topN?: number;
  embeddingWeight?: number;
  fulltextWeight?: number;
  concatChunks?: boolean;
  defaultSimilarityThreshold?: number;
  useFullDocumentWhenMajority?: boolean;
  majorityChunkThreshold?: number;
}

// Full document metadata
interface DocumentMetadata {
  title: string;
  chunkIndex?: number;
  maxChunkIndex?: number;
  hierarchyPath?: string;
  [key: string]: unknown;
}

export class HierarchicalRetriever {
  private topN: number;
  private docSearchLimit: number;
  private chunkSearchLimit: number;
  private embeddingWeight: number;
  private fulltextWeight: number;
  private concatChunks: boolean;
  private defaultSimilarityThreshold: number;
  private useFullDocumentWhenMajority: boolean;
  private majorityChunkThreshold: number;
  private embeddings = new VoyageEmbeddings();

  constructor(args: RetrieverArgs) {
    this.docSearchLimit = args.docSearchLimit ?? 128;
    this.chunkSearchLimit = args.chunkSearchLimit ?? 512;
    this.topN = args.topN ?? 128;
    this.embeddingWeight = args.embeddingWeight ?? 0.7;
    this.fulltextWeight = args.fulltextWeight ?? 0.3;
    this.concatChunks = args.concatChunks ?? true;
    this.defaultSimilarityThreshold = args.defaultSimilarityThreshold ?? 0.3;
    this.useFullDocumentWhenMajority = args.useFullDocumentWhenMajority ?? true;
    this.majorityChunkThreshold = args.majorityChunkThreshold ?? 0.75; // Default to 75%
  }

  /**
   * Combines multiple result sets and removes duplicates by keeping the highest similarity score
   *
   * @param resultSets - Array of arrays of GroupedSearchResultItem from different searches
   * @returns Combined and deduplicated results sorted by similarity score
   */
  public static combineResults(
    resultSets: GroupedSearchResultItem[][],
  ): GroupedSearchResultItem[] {
    // Map to track documents by ID with their highest similarity
    const documentMap = new Map<number, GroupedSearchResultItem>();

    // Process all result sets
    for (const results of resultSets) {
      for (const item of results) {
        if (
          !documentMap.has(item.documentId) ||
          item.similarity > documentMap.get(item.documentId)!.similarity
        ) {
          // First occurrence or higher similarity than previous
          documentMap.set(item.documentId, item);
        }
      }
    }

    // Convert to array and sort by similarity
    return Array.from(documentMap.values()).sort(
      (a, b) => b.similarity - a.similarity,
    );
  }

  /**
   * Performs a hierarchical search for documents and chunks based on a query and a HyDE (Hypothetical Document Embedding) document.
   * This method combines semantic and full-text search to retrieve relevant documents, groups them by document ID,
   * and optionally reranks the results using a Jina reranker for improved accuracy.
   *
   * @param query - The search query, which can be a string or a {@link HierachicalQueryInput} object containing text and/or embedding.
   * @param hydeDoc - The HyDE document, which can be a string or a {@link HierachicalQueryInput} object containing text and/or embedding.
   * @param searchParams - {@link HierachicalSearchParams} object containing various search parameters such as weights, limits, filters, and reranking options.
   * @returns A promise that resolves to an array of {@link GroupedSearchResultItem} objects, each representing a document and its relevant chunks.
   *
   * @throws {Error} If there is an error during the database search or if embeddings cannot be generated for the query and HyDE document.
   */
  public async hierarchicalSearch(
    query: string,
    hydeDoc: string,
    collection_id: number,
    searchParams: HierachicalSearchParams,
  ): Promise<GroupedSearchResultItem[]> {
    logger.info(
      { query, hydeDoc, collection_id, searchParams },
      "hierarchicalSearch",
    );
    const [queryEmbedding, hydeEmbedding] =
      await this.embeddings.embedMultipleQueries([query, hydeDoc]);

    // Continue with existing implementation - these params remain the same
    const embeddingWeight =
      searchParams.embedding_weight ?? this.embeddingWeight;
    const fulltextWeight = searchParams.fulltext_weight ?? this.fulltextWeight;
    const similarityThreshold =
      searchParams.similarityThreshold ?? this.defaultSimilarityThreshold;

    // Process exclude document IDs
    let excludeDocumentIds: number[] | undefined;
    if (searchParams.excludeDocumentIds) {
      excludeDocumentIds = Array.isArray(searchParams.excludeDocumentIds)
        ? searchParams.excludeDocumentIds
        : [searchParams.excludeDocumentIds];
    }

    let start_date: Date | null = null;
    let end_date: Date | null = null;

    if (searchParams.start_date) {
      start_date = parseDate(searchParams.start_date);
      if (!start_date) {
        logger.warn(`Invalid start_date ${searchParams.start_date}`);
      }
    }

    if (searchParams.end_date) {
      end_date = parseDate(searchParams.end_date);
      if (!end_date) {
        logger.warn(`Invalid end_date ${searchParams.end_date}`);
      }
    }

    const params = {
      query_embedding: queryEmbedding,
      hyde_embedding: hydeEmbedding,
      query_text: query,
      collection_id_input: collection_id,
      doc_search_limit: searchParams.doc_search_limit ?? this.docSearchLimit,
      chunk_search_limit:
        searchParams.chunk_search_limit ?? this.chunkSearchLimit,
      keyword_weight: fulltextWeight,
      semantic_weight: embeddingWeight,
      similarity_threshold: similarityThreshold,
      exclude_document_ids: excludeDocumentIds,
      metadata_filter: searchParams.metadataFilter,
      strict_metadata_matching: searchParams.strictMetadataMatching ?? false,
      start_ts: start_date,
      end_ts: end_date,
    };

    logger.debug(params, "search func params");

    // Call the database function with updated parameters including metadata filter
    const searches = await matchDocumentsHierarchical(params);

    logger.debug(searches, "searches result");

    if (searches.length === 0) {
      return [];
    }

    // Store full metadata separately by chunk ID
    const metadataMap = new Map<number, DocumentMetadata>();

    for (const resp of searches) {
      metadataMap.set(resp.id, {
        title: resp.title || "",
        chunkIndex: resp.chunk_index,
        maxChunkIndex: resp.max_chunk_index,
        hierarchyPath: resp.hierarchy_path ? resp.hierarchy_path : undefined,
        ...(typeof resp.metadata === "object" ? resp.metadata : {}),
      });
    }

    // Group results by document ID
    const groupedByDocId = new Map<number, DocumentMapped[]>();

    searches.forEach((item) => {
      const docId = item.document_id;
      if (!groupedByDocId.has(docId)) {
        groupedByDocId.set(docId, []);
      }
      const group = groupedByDocId.get(docId);
      if (group) {
        group.push({
          pageContent: item.content,
          metadata: {
            id: item.id,
            documentId: item.document_id,
            similarity: item.similarity,
          },
        });
      }
    });

    // Determine feature settings from params or class defaults
    const shouldConcatChunks = searchParams.concatChunks ?? this.concatChunks;
    const shouldUseFullDocumentWhenMajority =
      searchParams.useFullDocumentWhenMajority ??
      this.useFullDocumentWhenMajority;
    const majorityThreshold =
      searchParams.majorityChunkThreshold ?? this.majorityChunkThreshold;

    // Identify documents where we have majority of chunks
    const documentsNeedingFullContent = new Set<number>();
    if (shouldUseFullDocumentWhenMajority) {
      for (const [documentId, chunks] of groupedByDocId.entries()) {
        // Find the max chunk index from metadata
        let maxChunkIndexValue = 0;
        for (const chunk of chunks) {
          const metadata = metadataMap.get(chunk.metadata.id);
          if (
            metadata?.maxChunkIndex !== undefined &&
            metadata.maxChunkIndex > maxChunkIndexValue
          ) {
            maxChunkIndexValue = metadata.maxChunkIndex;
          }
        }

        // If maxChunkIndex is 0, there's only one chunk, so always get full content
        if (maxChunkIndexValue === 0) {
          documentsNeedingFullContent.add(documentId);
          continue;
        }

        // Count unique chunk indexes we have
        const uniqueChunkIndexes = new Set<number>();
        for (const chunk of chunks) {
          const metadata = metadataMap.get(chunk.metadata.id);
          if (metadata?.chunkIndex !== undefined) {
            uniqueChunkIndexes.add(metadata.chunkIndex);
          }
        }

        // Calculate percentage of document we have
        // maxChunkIndex is 0-based, so add 1 for total count
        const totalChunks = maxChunkIndexValue + 1;
        const percentage = uniqueChunkIndexes.size / totalChunks;

        // If we have >= threshold percentage, fetch full document
        if (percentage >= majorityThreshold) {
          documentsNeedingFullContent.add(documentId);
        }
      }
    }

    // Fetch full document content if needed
    const documentContentMap = new Map<number, string>();
    if (documentsNeedingFullContent.size > 0) {
      const fullDocuments = await db
        .selectFrom("documents")
        .select(["id", "content"])
        .where("id", "in", Array.from(documentsNeedingFullContent).map(String))
        .execute();

      for (const doc of fullDocuments) {
        documentContentMap.set(Number(doc.id), doc.content);
      }
    }

    // Convert grouped results to GroupedSearchResultItem format
    const groupedResults: GroupedSearchResultItem[] = Array.from(
      groupedByDocId.entries(),
    ).map(([documentId, chunks]) => {
      // Sort chunks by similarity (descending)
      chunks.sort((a, b) => b.metadata.similarity - a.metadata.similarity);

      // Get the best chunk
      const bestChunk = chunks[0];
      if (!bestChunk) {
        throw new Error("No best chunk found for document");
      }

      // Get the full metadata for the best chunk
      const fullMetadata = metadataMap.get(bestChunk.metadata.id);
      if (!fullMetadata) {
        throw new Error(
          `Metadata not found for chunk ID ${bestChunk.metadata.id}`,
        );
      }

      // Extract core fields from metadata
      const { title, hierarchyPath, ...otherMetadata } = fullMetadata;

      // Get the highest similarity score
      const highestSimilarity = bestChunk.metadata.similarity;

      // Create chunk results
      const chunkItems: ChunkItem[] = chunks.map((chunk) => {
        const chunkMetadata = metadataMap.get(chunk.metadata.id);
        return {
          id: chunk.metadata.id,
          content: chunk.pageContent,
          similarity: chunk.metadata.similarity,
          chunkIndex: chunkMetadata?.chunkIndex,
          maxChunkIndex: chunkMetadata?.maxChunkIndex,
        };
      });

      // Determine content format
      let contentParts: ChunkItem[] | string;

      // Check if we have full document content for this document
      if (documentContentMap.has(documentId)) {
        // Use full document content
        contentParts = documentContentMap.get(documentId)!;
      } else if (shouldConcatChunks) {
        // Concatenate chunks
        contentParts = this.concatenateChunks(chunkItems);
      } else {
        // Use individual chunks
        contentParts = chunkItems;
      }

      return {
        metadata: otherMetadata,
        title,
        similarity: highestSimilarity,
        documentId,
        hierarchyPath,
        contentParts,
      };
    });

    logger.debug(groupedResults, "grouped result");

    // Return top N grouped results
    return groupedResults
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, this.topN);
  }

  /**
   * Concatenates content chunks into a single string with appropriate formatting
   * @param chunks - Array of chunk items
   * @returns Concatenated content with "..." indicating gaps between non-consecutive chunks
   */
  public concatenateChunks(chunks: ChunkItem[]): string {
    if (chunks.length === 0) {
      return "";
    }

    // Sort chunks by index for concatenation (handling undefined indexes as 0)
    const sortedChunks = [...chunks].sort(
      (a, b) => (a.chunkIndex ?? 0) - (b.chunkIndex ?? 0),
    );

    // Build concatenated content
    let result = "";

    // Add "..." at the beginning if the first chunk isn't index 0
    const firstChunk = sortedChunks[0];
    if (firstChunk && (firstChunk.chunkIndex ?? 0) > 0) {
      result += "... ";
    }

    // Process each chunk
    for (let idx = 0; idx < sortedChunks.length; idx++) {
      const currentChunk = sortedChunks[idx];

      if (!currentChunk) continue;

      // Add chunk content
      result += currentChunk.content;

      // If not the last chunk, check for gaps
      if (idx < sortedChunks.length - 1) {
        const nextChunk = sortedChunks[idx + 1];

        if (!nextChunk) continue;

        const currentIdx = currentChunk.chunkIndex ?? 0;
        const nextIdx = nextChunk.chunkIndex ?? 0;

        // If there's a gap between consecutive chunks, add "..."
        if (nextIdx - currentIdx > 1) {
          result += " ... ";
        } else {
          // Just add a space between consecutive chunks
          result += " ";
        }
      }
    }

    return result;
  }
}

export const retriever = new HierarchicalRetriever({});
