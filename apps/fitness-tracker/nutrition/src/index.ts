import { createBot } from "./bot/index.js";
import { db } from "./db/index.js";
import { env } from "./infrastructure/env.js";
import { createOpenFoodFactsClient } from "./search/openfoodfacts.js";
import { loadUsdaIndex } from "./search/usda.js";

async function main() {
  // Load USDA index (fail-fast if JSON missing)
  console.log("Loading USDA Foundation Foods index...");
  const usdaIndex = loadUsdaIndex();

  // Create OpenFoodFacts client
  const searchOpenFoodFacts = createOpenFoodFactsClient();

  // Create and start bot
  const bot = createBot(env.TELEGRAM_BOT_TOKEN, {
    db,
    usdaIndex,
    searchOpenFoodFacts,
  });

  console.log("Starting nutrition tracker bot...");
  await bot.start({
    onStart: () => console.log("Bot is running."),
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
