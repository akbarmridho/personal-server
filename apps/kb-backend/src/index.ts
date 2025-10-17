import { loadDotenv } from "@personal-server/common/utils/load-dotenv";

loadDotenv();

import { logger } from "@personal-server/common/utils/logger";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { env } from "./env.js";
import { setupInternetMcp } from "./internet/mcp.js";
import { setupRAGMcp } from "./rag/mcp.js";
import { setupHTTPServer } from "./server.js";

async function main() {
  const ragMcpServer = await setupRAGMcp();
  const internetMcpServer = await setupInternetMcp();
  const apiHttpServer = setupHTTPServer();

  // please note that this approach of creating a proxy server to just forward into mcp server and elysia server
  // is a bit stupid decision. it's better to create proxy in elysia and pass the request for mcp servers into
  // the mcp server. but well, I'm too lazy to debug and make proxying works in elysia so here we are.
  const proxyApp = express();

  //proxy to RAG mcp server
  proxyApp.use(
    "/mcps/rag",
    createProxyMiddleware({
      target: `http://0.0.0.0:${env.RAG_MCP_PORT}`,
      changeOrigin: true,
      ws: true,
      pathRewrite: {
        "^/mcps/rag": "", // remove /mcps/rag prefix, keep the rest
      },
    }),
  );

  //proxy to Internet mcp server
  proxyApp.use(
    "/mcps/internet",
    createProxyMiddleware({
      target: `http://0.0.0.0:${env.INTERNET_MCP_PORT}`,
      changeOrigin: true,
      ws: true,
      pathRewrite: {
        "^/mcps/internet": "", // remove /mcps/internet prefix, keep the rest
      },
    }),
  );

  // add other mcp here

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
    await ragMcpServer.stop();
    await internetMcpServer.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown());
  process.on("SIGTERM", () => shutdown());
}

main().catch(console.error);
