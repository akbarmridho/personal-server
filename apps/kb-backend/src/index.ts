import "@dotenvx/dotenvx/config";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { serve } from "inngest/express";
import { env } from "./infrastructure/env.js";
import { inngest } from "./infrastructure/inngest.js";
import { inngestFunctions } from "./infrastructure/inngest-functions.js";
import { setupHTTPServer } from "./server.js";
import { setupStockMcp } from "./stock/mcp.js";
import { logger } from "./utils/logger.js";

async function main() {
  const stockMcpServer = await setupStockMcp();
  const apiHttpServer = setupHTTPServer();

  // please note that this approach of creating a proxy server to just forward into mcp server and elysia server
  // is a bit stupid decision. it's better to create proxy in elysia and pass the request for mcp servers into
  // the mcp server. but well, I'm too lazy to debug and make proxying works in elysia so here we are.
  const proxyApp = express();

  //proxy to Stock mcp server
  proxyApp.use(
    "/mcps/stock",
    createProxyMiddleware({
      target: `http://0.0.0.0:${env.STOCK_MCP_PORT}`,
      changeOrigin: true,
      ws: true,
      proxyTimeout: 0,
      timeout: 0,
      pathRewrite: {
        "^/mcps/stock": "", // remove /mcps/stock prefix, keep the rest
      },
    }),
  );

  // add other mcp here

  // inngest
  proxyApp.use(
    "/api/inngest",
    express.json({
      limit: "32mb",
    }),
  );
  proxyApp.use(
    "/api/inngest",
    serve({ client: inngest, functions: inngestFunctions }),
  );

  // proxy the rest to elysia
  proxyApp.use(
    "/",
    createProxyMiddleware({
      target: `http://0.0.0.0:${env.API_SERVER_PORT}`,
      changeOrigin: true,
      // no path rewrite
    }),
  );

  // biome-ignore lint/correctness/noUnusedFunctionParameters: shutup
  proxyApp.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Something broke!");
  });

  const proxyServer = proxyApp.listen(env.HTTP_SERVER_PORT, () => {
    logger.info(`Proxy server running at ::${env.HTTP_SERVER_PORT}`);
  });

  const shutdown = async () => {
    proxyServer.close(() => {
      logger.info("Proxy server closed");
    });
    apiHttpServer.stop();
    await Promise.all([stockMcpServer.stop()]);
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown());
  process.on("SIGTERM", () => shutdown());
}

main().catch(console.error);
