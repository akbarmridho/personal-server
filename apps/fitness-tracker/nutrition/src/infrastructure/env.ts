import "@dotenvx/dotenvx/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    TELEGRAM_BOT_TOKEN: z.string(),
    DATABASE_URL: z.string(),
    OPENROUTER_API_KEY: z.string(),
    FOOD_DB_PATH: z.string().optional(),
    GARMIN_SYNC_SCRIPT: z.string().optional(),
  },
  runtimeEnv: process.env,
});
