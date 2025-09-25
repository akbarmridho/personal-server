import { loadDotenv } from "@personal-server/common/utils/load-dotenv";
import { setupServer } from "./http.js";
import { setupMcp } from "./mcp.js";

loadDotenv();

async function main() {
  const _httpServer = setupServer();
  const mcpServer = await setupMcp();

  const shutdown = async () => {
    await mcpServer.stop();
    _httpServer.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown());
  process.on("SIGTERM", () => shutdown());
}

main().catch(console.error);
