import { loadDotenv } from "@personal-server/common/utils/load-dotenv";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

loadDotenv();

export const env = createEnv({
  /*
   * Serverside Environment variables, not available on the client.
   * Will throw if you access these variables on the client.
   */
  server: {
    VOYAGE_API_KEY: z.string(),
    OPENROUTER_API_KEY: z.string(),
    RAG_SERVER_PORT: z.coerce.number().prefault(3010),
    RAG_MCP_PORT: z.coerce.number().prefault(3011),
    DATABASE_URL: z.string(),
  },
  /*
   * Specify what values should be validated by your schemas above.
   */
  runtimeEnv: process.env,
});
