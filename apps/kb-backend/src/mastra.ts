import "@dotenvx/dotenvx/config";

import { MastraServer } from "@mastra/express";
import express from "express";
import { env } from "./infrastructure/env.js";
import { mastra } from "./mastra/index.js";
import { mountStudio } from "./mastra/studio.js";
import { logger } from "./utils/logger.js";

async function main() {
  const app = express();

  app.use(express.json({}));

  const mastraServer = new MastraServer({
    app: app,
    mastra: mastra,
    prefix: "/api",
  });

  await mastraServer.init();

  mountStudio(app, {
    mastraServerHost: "mastra.akbarmr.dev",
    mastraServerPort: "443",
    mastraServerProtocol: "https",
    hideCloudCta: true,
  });

  const server = app.listen(env.MASTRA_SERVER_PORT, () => {
    logger.info(`Mastra server running at ::${env.HTTP_SERVER_PORT}`);
  });

  const shutdown = async () => {
    server.close(() => {
      mastra.shutdown().then(() => {
        process.exit(0);
      });
    });
  };

  process.on("SIGINT", () => shutdown());
  process.on("SIGTERM", () => shutdown());
}

main().catch(console.error);
