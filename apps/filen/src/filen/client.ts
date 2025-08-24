import { tmpdir } from "node:os";
import path from "node:path";
import { FilenSDK } from "@filen/sdk";
import { env } from "../utils/env.js";
import { generateTOTP } from "./auth.js";

export const filen = new FilenSDK({
  metadataCache: true,
  connectToSocket: true,
  tmpPath: path.join(tmpdir(), "filen-sdk"),
  email: env.FILEN_EMAIL,
  password: env.FILEN_PASSWORD,
  twoFactorCode: generateTOTP(),
});

await filen.login({});
