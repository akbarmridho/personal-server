import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export const env = createEnv({
  server: {
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace"])
      .prefault("info"),

    AI_CLIENT_CONNECTOR_HOST: z.string().prefault("0.0.0.0"),
    AI_CLIENT_CONNECTOR_PORT: z.coerce
      .number()
      .int()
      .min(1)
      .max(65535)
      .prefault(8787),

    GOLDEN_ARTICLE_URL: z.string().url().optional(),
    INNGEST_URL: z.string().url().optional(),
    KB_BACKEND_URL: z.string().url().prefault("https://kb.akbarmr.dev"),
    AI_CLIENT_CONNECTOR_PUBLIC_PROXY_URL: z.string().url(),

    PLAYWRIGHT_CDP_URL: z.string().url().prefault("http://127.0.0.1:9222"),
    PLAYWRIGHT_BROWSER_PATH: z.string().optional(),
    PLAYWRIGHT_USER_DATA_DIR: z.string().optional(),
    PLAYWRIGHT_PROFILE_DIR: z.string().optional(),

    STATE_FILE_PATH: z.string().prefault(path.resolve(appRoot, "state.json")),
  },
  runtimeEnv: process.env,
});
