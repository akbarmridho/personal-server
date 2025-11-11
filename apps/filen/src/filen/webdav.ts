import { WebDAVServer } from "@filen/webdav";
import { env } from "../utils/env.js";
import { logger } from "../utils/logger.js";
import { filen } from "./client.js";

export const setupWebdav = async () => {
  const webdavServer = new WebDAVServer({
    hostname: "0.0.0.0",
    port: env.FILEN_WEBDAV_PORT,
    https: false,
    user: {
      username: env.FILEN_WEBDAV_USER,
      password: env.FILEN_WEBDAV_PASSWORD,
      sdk: filen,
    },
    authMode: "basic",
  });

  await webdavServer.start();

  logger.info(
    `WebDAV server started on http://0.0.0.0:${env.FILEN_WEBDAV_PORT}`,
  );

  return webdavServer;
};
