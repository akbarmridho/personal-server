import { loadDotenv } from "@personal-server/common/utils/load-dotenv";
import { setupServer } from "./http.js";

loadDotenv();

async function main() {
  const _httpServer = setupServer();
}

main().catch(console.error);
