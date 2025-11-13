import { tmpdir } from "node:os";
import path from "node:path";
import { FilenSDK } from "@filen/sdk";
import { env } from "../utils/env.js";
import { logger } from "../utils/logger.js";
import { generateTOTP } from "./auth.js";

export const filen = new FilenSDK({
  metadataCache: true,
  connectToSocket: true,
  tmpPath: path.join(tmpdir(), "filen-sdk"),
  // email: env.FILEN_EMAIL,
  // password: env.FILEN_PASSWORD,
  // twoFactorCode: await generateTOTP(),
});

try {
  await filen.login({
    email: env.FILEN_EMAIL,
    password: env.FILEN_PASSWORD,
    twoFactorCode: await generateTOTP(),
  });
} catch (e) {
  logger.error({ e: e }, "login failed");
}
