import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createBot } from "./bot/index.js";
import { db } from "./db/index.js";
import { startExportServer } from "./export-server.js";
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

  // Start export server for AI/LLM consumption
  const server = startExportServer();

  // Create and start bot
  const bot = await createBot(env.TELEGRAM_BOT_TOKEN, {
    db,
    foodDb,
  });

  logger.info("Starting nutrition tracker bot...");
  await bot.start({
    onStart: () => logger.info("Bot is running."),
  });

  // Graceful shutdown
  const shutdown = () => {
    logger.info("Shutting down...");
    bot.stop();
    server.close(() => {
      logger.info("Export server closed.");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  logger.error(err, "Fatal error");
  process.exit(1);
});
