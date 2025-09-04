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
    FILEN_EMAIL: z.string(),
    FILEN_PASSWORD: z.string(),
    FILEN_2FA: z.string(),
    FILEN_FEATURE_CHECK: z.string().default("webdav,network,sync"),
    FILEN_WEBDAV_PORT: z.coerce.number().default(4001),
    FILEN_WEBDAV_USER: z.string(),
    FILEN_WEBDAV_PASSWORD: z.string(),
    FILEN_NETWORK_MOUNT: z.string(),
    FILEN_SYNC_CONFIG: z.string().optional(),
  },
  /*
   * Specify what values should be validated by your schemas above.
   */
  runtimeEnv: process.env,
});
