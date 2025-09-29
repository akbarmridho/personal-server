import { VoyageAIClient, VoyageAIError } from "voyageai";
import { estimateEmbeddingTokenCount } from "../utils/counter.js";
import {
  type ChunkerOptions,
  GFMContextPathChunker,
} from "./gfm-context-path-chunker.js";

export class TokenLimitError extends Error {
  constructor(given: number, limit: number) {
    super(`Token limit exceeded: ${given} tokens given, limit is ${limit}`);
    this.name = "TokenLimitError";
  }
}

// see https://docs.voyageai.com/docs/embeddings and https://docs.voyageai.com/docs/contextualized-chunk-embeddings
export type VoyageEmbeddingModel =
  | "voyage-3-large"
  | "voyage-3.5"
  | "voyage-3.5-lite"
  | "voyage-code-3"
  | "voyage-finance-2"
  | "voyage-law-2"
  | "voyage-code-2"
  | "voyage-context-3";

export type VoyageEmbeddingTask = "query" | "document";

export type VoyageEmbeddingType =
  | "int8"
  | "uint8"
  | "binary"
  | "ubinary"
  | "float";

export interface VoyageEmbeddingsParams {
  model?: VoyageEmbeddingModel;
  stripNewLines?: boolean;
  dimensions?: number;
  embeddingType: VoyageEmbeddingType;
  maxTokensPerRequest?: number;
}

interface DocumentChunksInsert {
  content: string;
  embedding: number[];
  chunk_index: number;
  max_chunk_index: number;
}

const RPM_LIMIT = 500;
const TPM_LIMIT = 1_000_000;
const MIN_MD_CHUNK_TOKEN_LIMIT = 512;
const INITIAL_MD_CHUNK_TOKEN_LIMIT = 7168;

class SharedRateLimiter {
  private static instance: SharedRateLimiter;
  private tokensUsed = 0;
  private requestCount = 0;
  private lastReset: number = Date.now();
  private readonly tpmLimit: number;
  private readonly rpmLimit: number;

  private constructor(tpmLimit: number, rpmLimit: number) {
    this.tpmLimit = tpmLimit;
    this.rpmLimit = rpmLimit;
  }

  public static getInstance(
    tpmLimit: number,
    rpmLimit: number,
  ): SharedRateLimiter {
    if (!SharedRateLimiter.instance) {
      SharedRateLimiter.instance = new SharedRateLimiter(tpmLimit, rpmLimit);
    }
    return SharedRateLimiter.instance;
  }

  async checkAndUpdate(tokenCount: number): Promise<void> {
    const now = Date.now();
    const minuteAgo = now - 60000;

    if (this.lastReset < minuteAgo) {
      this.tokensUsed = 0;
      this.requestCount = 0;
      this.lastReset = now;
    }

    if (
      this.tokensUsed + tokenCount > this.tpmLimit ||
      this.requestCount >= this.rpmLimit
    ) {
      const waitTime = 60000 - (now - this.lastReset);
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        this.tokensUsed = 0;
        this.requestCount = 0;
        this.lastReset = Date.now();
      }
    }

    this.tokensUsed += tokenCount;
    this.requestCount += 1;
  }
}

export class VoyageEmbeddings {
  model: VoyageEmbeddingModel;
  stripNewLines: boolean;
  dimensions: number;
  embeddingType: VoyageEmbeddingType;
  contextualizedEmbedding: boolean;
  maxTokensPerRequest: number;
  private rateLimiter: SharedRateLimiter;
  private voyageClient: VoyageAIClient;

  constructor(fields?: Partial<VoyageEmbeddingsParams>) {
    this.model = fields?.model ?? "voyage-context-3";
    this.stripNewLines = fields?.stripNewLines ?? true;
    this.dimensions = fields?.dimensions ?? 1024;
    this.embeddingType = fields?.embeddingType ?? "float";
    this.maxTokensPerRequest = fields?.maxTokensPerRequest ?? 8192;
    this.contextualizedEmbedding = this.model === "voyage-context-3";

    this.rateLimiter = SharedRateLimiter.getInstance(TPM_LIMIT, RPM_LIMIT);

    this.voyageClient = new VoyageAIClient();
  }

  async embedSingleDocument(text: string): Promise<number[]> {
    if (!text.length) return [];

    const processedText = this.stripNewLines ? text.replace(/\n/g, " ") : text;
    const totalTokens = estimateEmbeddingTokenCount(text);

    await this.rateLimiter.checkAndUpdate(totalTokens);

    const embeddings = await this.createEmbeddings([processedText], "document");

    return embeddings[0] ?? [];
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];

    const processedTexts = texts.map((text) =>
      this.stripNewLines ? text.replace(/\n/g, " ") : text,
    );

    const totalTokens = processedTexts.reduce(
      (sum, text) => sum + estimateEmbeddingTokenCount(text),
      0,
    );

    await this.rateLimiter.checkAndUpdate(totalTokens);
    return this.createEmbeddings(processedTexts, "document");
  }

  async embedQuery(text: string): Promise<number[]> {
    const processedText = this.stripNewLines ? text.replace(/\n/g, " ") : text;
    const tokenCount = estimateEmbeddingTokenCount(processedText);

    await this.rateLimiter.checkAndUpdate(tokenCount);
    const embeddings = await this.createEmbeddings([processedText], "query");

    return embeddings[0] ?? [];
  }

  async embedMultipleQueries(texts: string[]): Promise<number[][]> {
    const processedTexts = texts.map((text) =>
      this.stripNewLines ? text.replace(/\n/g, " ") : text,
    );

    const tokenCounts = processedTexts.map((text) =>
      estimateEmbeddingTokenCount(text),
    );
    const totalTokens = tokenCounts.reduce((sum, count) => sum + count, 0);

    await this.rateLimiter.checkAndUpdate(totalTokens);

    // should be modify createEmbeddings to handle difference in output dimension but well whatever
    const embeddings = await Promise.all(
      processedTexts.map((text) => {
        return this.createEmbeddings([text], "query")[0];
      }),
    );

    return embeddings;
  }

  public async createEmbeddedGFMContextPathChunks(
    documentContent: string,
    titlePath: string,
    chunkerOptions?: ChunkerOptions,
  ): Promise<DocumentChunksInsert[]> {
    const chunker = new GFMContextPathChunker(chunkerOptions);

    let tokenLimit = INITIAL_MD_CHUNK_TOKEN_LIMIT;

    while (tokenLimit >= MIN_MD_CHUNK_TOKEN_LIMIT) {
      try {
        const chunkBatches = chunker.chunkWithinTokenLimit(
          documentContent,
          titlePath,
          tokenLimit,
        );

        const totalChunks = chunkBatches.reduce(
          (sum, batch) => sum + batch.length,
          0,
        );
        let currentChunkIndex = 0;
        const allEmbeddedChunks: DocumentChunksInsert[] = [];

        for (const contentChunks of chunkBatches) {
          const vectors = await this.embedDocuments(contentChunks);

          if (vectors.length !== contentChunks.length) {
            throw new Error("Embedding count does not match chunk count");
          }

          const embeddedChunks: DocumentChunksInsert[] = vectors.map(
            (embedding, idx) => {
              const content = contentChunks[idx];
              if (!content) {
                throw new Error(`Missing content for chunk at index ${idx}`);
              }
              return {
                content,
                embedding: embedding,
                chunk_index: currentChunkIndex++,
                max_chunk_index: totalChunks - 1,
              };
            },
          );

          allEmbeddedChunks.push(...embeddedChunks);
        }
        return allEmbeddedChunks;
      } catch (error) {
        if (!(error instanceof TokenLimitError)) {
          throw error;
        }

        tokenLimit =
          Math.floor((tokenLimit * 0.7) / MIN_MD_CHUNK_TOKEN_LIMIT) *
          MIN_MD_CHUNK_TOKEN_LIMIT;
        console.log(`Retrying chunking with ${tokenLimit} tokens`);
      }
    }

    throw new Error("Could not find suitable chunk size for document");
  }

  private async createEmbeddings(
    texts: string[],
    task: VoyageEmbeddingTask,
  ): Promise<number[][]> {
    if (!texts.length) return [];

    const totalTokens = texts.reduce(
      (sum, text) => sum + estimateEmbeddingTokenCount(text),
      0,
    );

    if (totalTokens > this.maxTokensPerRequest) {
      throw new TokenLimitError(totalTokens, this.maxTokensPerRequest);
    }

    const apiKey = process.env.VOYAGE_API_KEY;
    if (!apiKey) {
      throw new Error("Missing Voyage API key");
    }

    try {
      if (this.contextualizedEmbedding) {
        const response = await this.voyageClient.contextualizedEmbed({
          inputs: [texts],
          model: this.model,
          inputType: task,
          outputDimension: this.dimensions,
          outputDtype: this.embeddingType,
        });

        if (
          !response.data ||
          response.data.length !== 1 ||
          !response.data[0].data
        ) {
          throw new Error(
            "Unexpected response data. Data property not found, array response empty, or first element data is undefined.",
          );
        }

        const result = response.data[0].data
          .sort((a, b) => a.index! - b.index!)
          .map((item) => item.embedding!);

        return result;
      }

      const response = await this.voyageClient.embed({
        input: texts,
        model: this.model,
        inputType: task,
        outputDimension: this.dimensions,
        outputDtype: this.embeddingType,
        truncation: false,
      });

      if (!response.data) {
        throw new Error("Unexpected response data.");
      }

      const result = response.data
        .sort((a, b) => a.index! - b.index!)
        .map((item) => item.embedding!);

      return result;
    } catch (e) {
      if (e instanceof VoyageAIError) {
        if (
          e.message.toLowerCase().includes("size") ||
          e.message.toLowerCase().includes("token")
        ) {
          throw new TokenLimitError(-1, this.maxTokensPerRequest);
        }
      }
      throw e;
    }
  }
}
