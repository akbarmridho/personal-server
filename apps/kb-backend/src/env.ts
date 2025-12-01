import "@dotenvx/dotenvx/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  /*
   * Serverside Environment variables, not available on the client.
   * Will throw if you access these variables on the client.
   */
  server: {
    VOYAGE_API_KEY: z.string(),
    OPENROUTER_API_KEY: z.string(),
    GOOGLE_GENERATIVE_AI_API_KEY: z.string(),
    XAI_API_KEY: z.string(),
    JINA_AI_API_KEY: z.string(),
    HTTP_SERVER_PORT: z.coerce.number().prefault(3010),
    API_SERVER_PORT: z.coerce.number().prefault(10001),
    RAG_MCP_PORT: z.coerce.number().prefault(10002),
    INTERNET_MCP_PORT: z.coerce.number().prefault(10003),
    STOCK_MCP_PORT: z.coerce.number().prefault(10004),
    DATABASE_URL: z.string(),
    QDRANT_URL: z.string(),
    STOCK_HTTP_PROXY_URL: z.string(),
    INNGEST_BASE_URL: z.string(),

    // aggregator site
    AGGREGATOR_AUTH: z.string(),
    AGGREGATOR_COMPANY_REPORT_ENDPOINT: z.string(),
    AGGREGATOR_COMPANIES_ENDPOINT: z.string(),
    AGGREGATOR_SECTORS_REPORT_ENDPOINT: z.string(),
  },
  /*
   * Specify what values should be validated by your schemas above.
   */
  runtimeEnv: process.env,
});
