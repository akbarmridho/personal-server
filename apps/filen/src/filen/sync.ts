import { SyncWorker } from "@filen/sync";
import type { SyncPair } from "@filen/sync/dist/types.js";
import { env } from "../utils/env.js";
import { logger } from "../utils/logger.js";
import { getFilenClient } from "./client.js";

export const setupSync = async () => {
  if (!env.FILEN_SYNC_CONFIG) {
    throw new Error("FILEN_SYNC_CONFIG is required when sync is enabled");
  }

  const config = JSON.parse(env.FILEN_SYNC_CONFIG) as SyncPair[];

  if (config.length === 0) {
    throw new Error("FILEN_SYNC_CONFIG must include at least one sync pair");
  }

  const filen = await getFilenClient();

  const sync = new SyncWorker({
    syncPairs: config,
    sdk: filen,
    dbPath: "./sync_db",
    runOnce: false,
  });

  await sync.initialize();

  logger.info(
    `Sync worker set up with ${config.length} pair(s), runOnce=false`,
  );

  return sync;
};
