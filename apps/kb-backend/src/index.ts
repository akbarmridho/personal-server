import { loadDotenv } from "@personal-server/common/utils/load-dotenv";

loadDotenv();

import { setupRAGServer } from "./rag/http.js";
import { setupRAGMcp } from "./rag/mcp.js";

async function main() {
  const ragHttpServer = setupRAGServer();
  const ragMcpServer = await setupRAGMcp();

  const shutdown = async () => {
    await ragMcpServer.stop();
    ragHttpServer.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown());
  process.on("SIGTERM", () => shutdown());
}

main().catch(console.error);
