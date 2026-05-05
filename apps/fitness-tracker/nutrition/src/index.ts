import { createBot } from "./bot/index.js";
import { db } from "./db/index.js";
import { env } from "./infrastructure/env.js";
import { createOpenFoodFactsClient } from "./search/openfoodfacts.js";
import { loadUsdaIndex } from "./search/usda.js";
import { logger } from "./utils/logger.js";

async function main() {
  // Load USDA index (fail-fast if JSON missing)
  logger.info("Loading USDA Foundation Foods index...");
  const usdaIndex = loadUsdaIndex();

  // Create OpenFoodFacts client
  const searchOpenFoodFacts = createOpenFoodFactsClient();

  // Create and start bot
  const bot = createBot(env.TELEGRAM_BOT_TOKEN, {
    db,
    usdaIndex,
    searchOpenFoodFacts,
  });

  logger.info("Starting nutrition tracker bot...");
  await bot.start({
    onStart: () => logger.info("Bot is running."),
  });
}

main().catch((err) => {
  logger.error(err, "Fatal error");
  process.exit(1);
});
