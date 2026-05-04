import "@dotenvx/dotenvx/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    TELEGRAM_BOT_TOKEN: z.string(),
    DATABASE_URL: z.string(),
    OPENROUTER_API_KEY: z.string(),
  },
  runtimeEnv: process.env,
});
