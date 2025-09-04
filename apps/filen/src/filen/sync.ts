import { SyncWorker } from "@filen/sync";
import type { SyncPair } from "@filen/sync/dist/types.js";
import { logger } from "@personal-server/common/utils/logger";
import { env } from "../utils/env.js";
import { filen } from "./client.js";

export const setupSync = async () => {
  if (!env.FILEN_SYNC_CONFIG) {
    logger.warn("No FILEN_SYNC_CONFIG found");
    return null;
  }

  const config = JSON.parse(env.FILEN_SYNC_CONFIG) as SyncPair[];

  if (config.length === 0) {
    logger.warn("No FILEN_SYNC_CONFIG found");
    return null;
  }

  const sync = new SyncWorker({
    syncPairs: config,
    sdk: filen,
    dbPath: "./sync_db",
    runOnce: false, // Run the sync once
  });

  // Start the sync
  await sync.initialize();

  logger.info(`Sync worker set up with config: ${env.FILEN_SYNC_CONFIG}`);

  return sync;
};
