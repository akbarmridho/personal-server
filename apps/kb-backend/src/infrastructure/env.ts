import "@dotenvx/dotenvx/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  /*
   * Serverside Environment variables, not available on the client.
   * Will throw if you access these variables on the client.
   */
  server: {
    // LLM API Key
    OPENROUTER_API_KEY: z.string(),
    XAI_API_KEY: z.string(),
    JINA_AI_API_KEY: z.string(),
    GEMINI_API_KEY: z.string(),

    // Server ports
    HTTP_SERVER_PORT: z.coerce.number().prefault(3010),
    API_SERVER_PORT: z.coerce.number().prefault(10001),
    STOCK_MCP_PORT: z.coerce.number().prefault(10004),

    DATABASE_URL: z.string(),
    STOCK_HTTP_PROXY_URL: z.string(),
    INNGEST_BASE_URL: z.string(),
    INNGEST_EVENT_KEY: z.string(),
    INNGEST_SIGNING_KEY: z.string(),

    // aggregator site
    AGGREGATOR_AUTH: z.string(),
    AGGREGATOR_COMPANY_REPORT_ENDPOINT: z.string(),
    AGGREGATOR_COMPANIES_ENDPOINT: z.string(),
    AGGREGATOR_SECTORS_REPORT_ENDPOINT: z.string(),
    ALGORESEARCH_AUTH: z.string(),
    ALGORESEARCH_COOKIE: z.string(),

    // knowledge service
    KNOWLEDGE_SERVICE_URL: z.string(),

    // telegram
    TELEGRAM_CHANNEL_ID: z.string(),
    TELEGRAM_KEY: z.string(),

    // discord
    DISCORD_TOKEN: z.string(),
    DISCORD_APPLICATION_ID: z.string(),
    DISCORD_CHANNEL_INNGEST_ERROR: z.string(),
    DISCORD_CHANNEL_ANALYSIS_RUMOUR: z.string(),
  },
  /*
   * Specify what values should be validated by your schemas above.
   */
  runtimeEnv: process.env,
});
