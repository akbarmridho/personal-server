import "@dotenvx/dotenvx/config";
import type { SyncWorker } from "@filen/sync";
import type { WebDAVServer } from "@filen/webdav";
import { env, parseFilenFeatures } from "./utils/env.js";
import { logger } from "./utils/logger.js";

(async function main() {
  let webdavServer: WebDAVServer | null = null;
  // biome-ignore lint/correctness/noUnusedVariables: for future update
  let syncWorker: SyncWorker | null = null;
  const features = parseFilenFeatures(env.FILEN_FEATURE_CHECK);

  logger.info(`Starting Filen with features=${[...features].join(",")}`);

  if (features.has("webdav")) {
    const { setupWebdav } = await import("./filen/webdav.js");
    webdavServer = await setupWebdav();
  }

  if (features.has("sync")) {
    const { setupSync } = await import("./filen/sync.js");
    syncWorker = await setupSync();
  }

  const onExit = async () => {
    webdavServer?.stop();
  };

  process.on("SIGINT", onExit);
  process.on("SIGTERM", onExit);
})();
