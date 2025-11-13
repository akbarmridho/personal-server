import "@dotenvx/dotenvx/config";
import type { NetworkDrive } from "@filen/network-drive";
import type { SyncWorker } from "@filen/sync";
import type { WebDAVServer } from "@filen/webdav";
import { setupNetworkDrive } from "./filen/network-drive.js";
import { setupSync } from "./filen/sync.js";
import { setupWebdav } from "./filen/webdav.js";
import { env } from "./utils/env.js";

(async function main() {
  let webdavServer: WebDAVServer | null = null;
  let networkDrive: NetworkDrive | null = null;
  // biome-ignore lint/correctness/noUnusedVariables: for future update
  let syncWorker: SyncWorker | null = null;

  if (env.FILEN_FEATURE_CHECK.includes("network")) {
    networkDrive = await setupNetworkDrive();
  }

  if (env.FILEN_FEATURE_CHECK.includes("webdav")) {
    webdavServer = await setupWebdav();
  }

  if (env.FILEN_FEATURE_CHECK.includes("sync")) {
    syncWorker = await setupSync();
  }

  const onExit = async () => {
    webdavServer?.stop();
    networkDrive?.stop();
  };

  process.on("SIGINT", onExit);
  process.on("SIGTERM", onExit);
})();
