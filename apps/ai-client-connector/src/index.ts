import { Server } from "proxy-chain";
import { ensureAutomationBrowserReady } from "./browser/bootstrap.js";
import { runGoldenArticleTaskAtStartup } from "./golden-article/intercept.js";
import { env } from "./infrastructure/env.js";
import { logger } from "./utils/logger.js";

const host = env.AI_CLIENT_CONNECTOR_HOST;
const port = env.AI_CLIENT_CONNECTOR_PORT;

const proxyServer = new Server({
  host,
  port,
  // No request/header overrides: pass-through proxy behavior.
  prepareRequestFunction: () => ({}),
});

await proxyServer.listen();
logger.info({ host, port }, "ai-client-connector proxy is listening");

await ensureAutomationBrowserReady().catch((error) => {
  logger.error({ err: error }, "browser readiness check failed");
});

void runGoldenArticleTaskAtStartup();

const shutdown = async () => {
  logger.info("Shutdown signal received, closing proxy server");
  await proxyServer.close(true);
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
