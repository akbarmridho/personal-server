import { loadDotenv } from "@personal-server/common/utils/load-dotenv";

loadDotenv();

import { setupRAGMcp } from "./rag/mcp.js";
import { setupHTTPServer } from "./server.js";

async function main() {
  const httpServer = setupHTTPServer();
  const ragMcpServer = await setupRAGMcp();

  const shutdown = async () => {
    await ragMcpServer.stop();
    httpServer.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown());
  process.on("SIGTERM", () => shutdown());
}

main().catch(console.error);
