import { NetworkDrive } from "@filen/network-drive";
import { logger } from "@personal-server/common/utils/logger";
import { env } from "../utils/env.js";
import { filen } from "./client.js";

export const setupNetworkDrive = async () => {
  const networkDrive = new NetworkDrive({
    sdk: filen,
    mountPoint: env.FILEN_NETWORK_MOUNT,
  });

  await networkDrive.start();

  logger.info(`Network drive mounted on ${env.FILEN_NETWORK_MOUNT}`);

  return networkDrive;
};
