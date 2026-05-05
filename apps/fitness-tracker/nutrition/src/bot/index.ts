import { Bot } from "grammy";
import type MiniSearch from "minisearch";
import type { DrizzleDB } from "../db/index.js";
import type { FoodResult } from "../search/openfoodfacts.js";
import type { UsdaFood } from "../search/usda.js";
import { createCallbackHandler } from "./handlers/callback.js";
import {
  createFavHandler,
  createHistoryHandler,
  createMonthHandler,
  createTodayHandler,
  createUnfavHandler,
  createWeekHandler,
} from "./handlers/commands.js";
import { createLogHandler } from "./handlers/log.js";
import { createMeasureHandler } from "./handlers/measure.js";
import { createProgressHandler } from "./handlers/progress.js";
import { createWeightHandler } from "./handlers/weight.js";

interface BotDependencies {
  db: DrizzleDB;
  usdaIndex: MiniSearch<UsdaFood>;
  searchOpenFoodFacts: (query: string, limit?: number) => Promise<FoodResult[]>;
}

export function createBot(token: string, deps: BotDependencies) {
  const bot = new Bot(token);

  // Command handlers
  const logHandler = createLogHandler(deps);
  const callbackHandler = createCallbackHandler(deps);
  const todayHandler = createTodayHandler(deps);
  const weekHandler = createWeekHandler(deps);
  const monthHandler = createMonthHandler(deps);
  const historyHandler = createHistoryHandler(deps);
  const favHandler = createFavHandler(deps);
  const unfavHandler = createUnfavHandler(deps);
  const weightHandler = createWeightHandler(deps);
  const measureHandler = createMeasureHandler(deps);
  const progressHandler = createProgressHandler(deps);

  // Register commands
  bot.command("log", logHandler);
  bot.command("today", todayHandler);
  bot.command("week", weekHandler);
  bot.command("month", monthHandler);
  bot.command("history", historyHandler);
  bot.command("fav", favHandler);
  bot.command("unfav", unfavHandler);
  bot.command("weight", weightHandler);
  bot.command("measure", measureHandler);
  bot.command("progress", progressHandler);

  // Handle photos sent without /log command (treat as /log with photo)
  bot.on("message:photo", logHandler);

  // Callback queries (inline buttons)
  bot.on("callback_query:data", callbackHandler);

  return bot;
}
