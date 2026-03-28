import "@dotenvx/dotenvx/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const filenFeature = z.enum(["webdav", "sync"]);

export const env = createEnv({
  /*
   * Serverside Environment variables, not available on the client.
   * Will throw if you access these variables on the client.
   */
  server: {
    FILEN_EMAIL: z.string(),
    FILEN_PASSWORD: z.string(),
    FILEN_2FA: z.string(),
    FILEN_FEATURE_CHECK: z.string().default("webdav"),
    FILEN_WEBDAV_PORT: z.coerce.number().default(4001),
    FILEN_WEBDAV_USER: z.string().optional(),
    FILEN_WEBDAV_PASSWORD: z.string().optional(),
    FILEN_SYNC_CONFIG: z.string().optional(),
  },
  /*
   * Specify what values should be validated by your schemas above.
   */
  runtimeEnv: process.env,
});

export type FilenFeature = z.infer<typeof filenFeature>;

export const parseFilenFeatures = (rawValue: string): Set<FilenFeature> => {
  const features = rawValue
    .split(",")
    .map((feature) => feature.trim())
    .filter(Boolean)
    .map((feature) => filenFeature.parse(feature));

  if (features.length === 0) {
    throw new Error("FILEN_FEATURE_CHECK must include at least one feature");
  }

  return new Set(features);
};
