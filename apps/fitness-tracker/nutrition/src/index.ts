import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createBot } from "./bot/index.js";
import { db } from "./db/index.js";
import { env } from "./infrastructure/env.js";
import { openFoodDb } from "./search/food-db.js";
import { logger } from "./utils/logger.js";

async function main() {
  // Run database migrations
  logger.info("Running database migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });

  // Open food search database (fail-fast if not built)
  logger.info("Opening food search database...");
  const foodDb = openFoodDb();

  // Create and start bot
  const bot = await createBot(env.TELEGRAM_BOT_TOKEN, {
    db,
    foodDb,
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
