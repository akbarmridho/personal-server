import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@tm/supabase/database";

import {
  JinaEmbeddings,
  JinaReranker,
  type RerankedDocument,
  type RerankerDocument,
} from "..";
import type { DocumentSource } from "../types";

export interface HierachicalQueryInput {
  text: string;
  embedding?: number[];
}

// Extended search parameters
export interface HierachicalSearchParams {
  metadataFilter?: Record<string, unknown>;
  strictMetadataMatching?: boolean; // Controls how missing properties are handled
  source?: DocumentSource | DocumentSource[];
  target_user_id: string;
  start_date?: string;
  end_date?: string;
  // Parameters for hierarchical search
  doc_search_limit?: number;
  chunk_search_limit?: number;
  chunk_document_threshold?: number;
  // Weights for hybrid search
  embedding_weight?: number;
  fulltext_weight?: number;
  // Option to override reranker setting for this search
  useReranker?: boolean;
  // Option to concatenate chunks into a single string
  concatChunks?: boolean;
  // Similarity threshold for filtering results
  similarityThreshold?: number;
  // Document IDs to exclude from search
  excludeDocumentIds?: number | number[];
  // Retrieve full document when majority of chunks are returned for a document
  useFullDocumentWhenMajority?: boolean;
  majorityChunkThreshold?: number;
}

// Individual chunk result
export interface ChunkItem {
  id: number;
  content: string;
  similarity: number;
  chunkIndex?: number;
  maxChunkIndex?: number;
}

// Grouped search result by document
export interface GroupedSearchResultItem {
  metadata: Record<string, unknown>;
  source: DocumentSource;
  title: string;
  url: string;
  sourceId: string;
  similarity: number; // Highest similarity score among chunks
  documentId: number;
  sourceParentId?: string;
  hierarchyPath?: string;
  contentParts: ChunkItem[] | string;
  sourceUpdatedAt: string;
}

// Retriever configuration
export interface RetrieverArgs {
  client: SupabaseClient<Database>;
  docSearchLimit?: number;
  chunkSearchLimit?: number;
  chunkDocumentThreshold?: number;
  topN?: number;
  embeddingWeight?: number;
  fulltextWeight?: number;
  useReranker?: boolean;
  concatChunks?: boolean;
  defaultSimilarityThreshold?: number;
  useFullDocumentWhenMajority?: boolean;
  majorityChunkThreshold?: number;
}

type MatchDocumentsHierarchicalFunction =
  Database["public"]["Functions"]["match_documents_hierarchical"];
type MatchDocumentsHierarchical =
  Database["public"]["Functions"]["match_documents_hierarchical"]["Returns"];

// Full document metadata
interface DocumentMetadata {
  source: DocumentSource;
  title: string;
  url: string;
  sourceId: string;
  chunkIndex?: number;
  maxChunkIndex?: number;
  sourceParentId?: string;
  hierarchyPath?: string;
  sourceUpdatedAt: string;
  [key: string]: unknown;
}

export class HierarchicalRetriever {
  private client: SupabaseClient<Database>;
  private topN: number;
  private docSearchLimit: number;
  private chunkSearchLimit: number;
  private embeddingWeight: number;
  private fulltextWeight: number;
  private jinaReranker: JinaReranker;
  private useReranker: boolean;
  private concatChunks: boolean;
  private defaultSimilarityThreshold: number;
  private useFullDocumentWhenMajority: boolean;
  private majorityChunkThreshold: number;
  private embeddings = new JinaEmbeddings({
    task: "retrieval.query",
    lateChunking: false,
  });

  constructor(args: RetrieverArgs) {
    this.client = args.client;
    this.docSearchLimit = args.docSearchLimit ?? 256;
    this.chunkSearchLimit = args.chunkSearchLimit ?? 1024;
    this.topN = args.topN ?? 128;
    this.embeddingWeight = args.embeddingWeight ?? 0.7;
    this.fulltextWeight = args.fulltextWeight ?? 0.3;
    this.useReranker = args.useReranker ?? false;
    this.concatChunks = args.concatChunks ?? true;
    this.defaultSimilarityThreshold = args.defaultSimilarityThreshold ?? 0.3;
    this.useFullDocumentWhenMajority = args.useFullDocumentWhenMajority ?? true;
    this.majorityChunkThreshold = args.majorityChunkThreshold ?? 0.75; // Default to 75%
    this.jinaReranker = new JinaReranker({ topN: this.topN });
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
    query: string | HierachicalQueryInput,
    hydeDoc: string | HierachicalQueryInput,
    searchParams: HierachicalSearchParams,
  ): Promise<GroupedSearchResultItem[]> {
    // Extract text and embeddings
    const queryText = typeof query === "string" ? query : query.text;
    const hydeText = typeof hydeDoc === "string" ? hydeDoc : hydeDoc.text;

    // Get embeddings if provided, otherwise keep undefined
    let queryEmbedding =
      typeof query === "string" ? undefined : query.embedding;
    let hydeEmbedding =
      typeof hydeDoc === "string" ? undefined : hydeDoc.embedding;

    // Generate any missing embeddings
    if (!queryEmbedding || !hydeEmbedding) {
      const textsToEmbed: string[] = [];
      const embeddingIndexMap = new Map<string, number>();

      if (!queryEmbedding) {
        embeddingIndexMap.set("query", textsToEmbed.length);
        textsToEmbed.push(queryText);
      }

      if (!hydeEmbedding) {
        embeddingIndexMap.set("hyde", textsToEmbed.length);
        textsToEmbed.push(hydeText);
      }

      if (textsToEmbed.length > 0) {
        const embeddings =
          await this.embeddings.embedMultipleQueries(textsToEmbed);

        if (!queryEmbedding && embeddingIndexMap.has("query")) {
          const queryIndex = embeddingIndexMap.get("query")!;
          queryEmbedding = embeddings[queryIndex];
        }

        if (!hydeEmbedding && embeddingIndexMap.has("hyde")) {
          const hydeIndex = embeddingIndexMap.get("hyde")!;
          hydeEmbedding = embeddings[hydeIndex];
        }
      }
    }

    if (!queryEmbedding || !hydeEmbedding) {
      throw new Error(
        "Failed to generate embeddings for query and HyDE document",
      );
    }

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

    // Clean search parameters for dates and metadata
    const cleanedParams = this.cleanSearchParams(searchParams);

    // Call the database function with updated parameters including metadata filter
    console.time("DB search");
    const { data, error } = await this.client.rpc<
      "match_documents_hierarchical",
      MatchDocumentsHierarchicalFunction
    >("match_documents_hierarchical", {
      query_embedding: queryEmbedding as unknown as string,
      hyde_embedding: hydeEmbedding as unknown as string,
      query_text: queryText,
      target_user_id: searchParams.target_user_id,
      source_types: Array.isArray(searchParams.source)
        ? searchParams.source
        : searchParams.source
          ? [searchParams.source]
          : undefined,
      doc_search_limit: searchParams.doc_search_limit ?? this.docSearchLimit,
      chunk_search_limit:
        searchParams.chunk_search_limit ?? this.chunkSearchLimit,
      keyword_weight: fulltextWeight,
      semantic_weight: embeddingWeight,
      start_date: cleanedParams.start_date,
      end_date: cleanedParams.end_date,
      similarity_threshold: similarityThreshold,
      exclude_document_ids: excludeDocumentIds,
      metadata_filter: cleanedParams.metadataFilter as unknown as Json,
      strict_metadata_matching: searchParams.strictMetadataMatching ?? false,
    });
    console.timeEnd("DB search");

    if (error) {
      throw new Error(
        `Error in hierarchical search: ${error.code} ${error.message} ${error.details}`,
      );
    }

    const searches = data as (MatchDocumentsHierarchical[number] & {
      metadata: Record<string, unknown>;
    })[];

    if (searches.length === 0) {
      return [];
    }

    // Store full metadata separately by chunk ID
    const metadataMap = new Map<number, DocumentMetadata>();

    // Prepare simplified documents for reranking
    const documentsForReranking: RerankerDocument[] = searches.map((resp) => {
      // Store full metadata
      metadataMap.set(resp.id, {
        source: resp.source,
        title: resp.title || "",
        url: (resp.metadata.url as string) || "",
        sourceId: resp.source_id,
        chunkIndex: resp.chunk_index,
        maxChunkIndex: resp.max_chunk_index,
        sourceParentId: resp.source_parent_id,
        hierarchyPath: resp.hierarchy_path,
        sourceUpdatedAt: resp.source_updated_at,
        ...(typeof resp.metadata === "object" ? resp.metadata : {}),
      });

      // Return minimal structure for reranking
      return {
        pageContent: resp.content,
        metadata: {
          id: resp.id,
          documentId: resp.document_id,
          originalSimilarity: resp.similarity,
        },
      };
    });

    // Determine whether to use reranker (prefer parameter passed in search params if provided)
    const shouldUseReranker = searchParams.useReranker ?? this.useReranker;

    // Apply reranking with minimal data for better efficiency if enabled
    let rerankedResults: RerankedDocument[];
    if (shouldUseReranker) {
      console.time("Reranking");
      rerankedResults = await this.jinaReranker.compressDocuments(
        documentsForReranking,
        queryText,
      );
      console.timeEnd("Reranking");
    } else {
      // If not using reranker, just pass through the original results
      rerankedResults = documentsForReranking.map((doc) => ({
        ...doc,
        metadata: {
          ...doc.metadata,
          // No _reranker_score when reranking is disabled
        },
      })) as RerankedDocument[];
    }

    // Group results by document ID
    const groupedByDocId = new Map<number, RerankedDocument[]>();

    rerankedResults.forEach((item) => {
      const docId = item.metadata.documentId;
      if (!groupedByDocId.has(docId)) {
        groupedByDocId.set(docId, []);
      }
      const group = groupedByDocId.get(docId);
      if (group) {
        group.push(item);
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
      const { data: fullDocuments, error: fetchError } = await this.client
        .from("documents")
        .select("id, content")
        .in("id", Array.from(documentsNeedingFullContent));

      if (fetchError) {
        console.error("Error fetching full documents:", fetchError);
      } else if (fullDocuments) {
        for (const doc of fullDocuments) {
          documentContentMap.set(doc.id, doc.content);
        }
      }
    }

    // Convert grouped results to GroupedSearchResultItem format
    const groupedResults: GroupedSearchResultItem[] = Array.from(
      groupedByDocId.entries(),
    ).map(([documentId, chunks]) => {
      // Sort chunks by similarity (descending)
      chunks.sort(
        (a, b) =>
          (b.metadata._reranker_score ?? b.metadata.originalSimilarity) -
          (a.metadata._reranker_score ?? a.metadata.originalSimilarity),
      );

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
      const {
        source,
        title,
        url = "",
        sourceId,
        sourceParentId,
        hierarchyPath,
        sourceUpdatedAt,
        ...otherMetadata
      } = fullMetadata;

      // Get the highest similarity score
      const highestSimilarity =
        bestChunk.metadata._reranker_score ??
        bestChunk.metadata.originalSimilarity;

      // Create chunk results
      const chunkItems: ChunkItem[] = chunks.map((chunk) => {
        const chunkMetadata = metadataMap.get(chunk.metadata.id);
        return {
          id: chunk.metadata.id,
          content: chunk.pageContent,
          similarity:
            chunk.metadata._reranker_score ?? chunk.metadata.originalSimilarity,
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
        source,
        title,
        url,
        sourceId,
        similarity: highestSimilarity,
        documentId,
        sourceParentId,
        hierarchyPath,
        contentParts,
        sourceUpdatedAt,
      };
    });

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

  private cleanSearchParams(
    params: HierachicalSearchParams,
  ): Partial<HierachicalSearchParams> & {
    metadataFilter?: Record<string, unknown>;
  } {
    const validateDate = (date?: string) => {
      if (!date || date === "null") return false;
      try {
        new Date(date).toISOString();
        return true;
      } catch {
        return false;
      }
    };

    return {
      metadataFilter: params.metadataFilter, // Include metadata filter
      source: params.source,
      start_date: validateDate(params.start_date)
        ? params.start_date
        : undefined,
      end_date: validateDate(params.end_date) ? params.end_date : undefined,
    };
  }
}
