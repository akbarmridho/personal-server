import { setupNetworkDrive } from "./filen/network-drive.js";
import { setupWebdav } from "./filen/webdav.js";

(async function main() {
  const webdavServer = await setupWebdav();
  const networkDrive = await setupNetworkDrive();

  const onExit = async () => {
    webdavServer.stop();
    networkDrive.stop();
  };

  process.on("SIGINT", onExit);
  process.on("SIGTERM", onExit);
})();
