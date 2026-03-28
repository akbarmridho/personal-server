import { tmpdir } from "node:os";
import path from "node:path";
import { FilenSDK } from "@filen/sdk";
import { env } from "../utils/env.js";
import { logger } from "../utils/logger.js";
import { generateTOTP } from "./auth.js";

let filenPromise: Promise<FilenSDK> | null = null;

export const getFilenClient = async () => {
  if (!filenPromise) {
    filenPromise = (async () => {
      const filen = new FilenSDK({
        metadataCache: true,
        connectToSocket: true,
        tmpPath: path.join(tmpdir(), "filen-sdk"),
      });

      await filen.login({
        email: env.FILEN_EMAIL,
        password: env.FILEN_PASSWORD,
        twoFactorCode: await generateTOTP(),
      });

      return filen;
    })().catch((error) => {
      filenPromise = null;
      logger.error({ error }, "login failed");
      throw error;
    });
  }

  return filenPromise;
};
