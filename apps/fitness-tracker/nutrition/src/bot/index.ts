import type Database from "better-sqlite3";
import { Bot } from "grammy";
import type { DrizzleDB } from "../db/index.js";
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
import { createSaveFavHandler } from "./handlers/savefav.js";
import {
  appendToMediaGroup,
  createMediaGroupCollector,
  isMediaGroupPending,
} from "./media-group.js";

export interface BotDependencies {
  db: DrizzleDB;
  foodDb: Database.Database;
}

export async function createBot(token: string, deps: BotDependencies) {
  const bot = new Bot(token);

  // Command handlers
  const logHandler = createLogHandler(deps);
  const logCollector = createMediaGroupCollector(logHandler);
  const saveFavHandler = createSaveFavHandler(deps);
  const saveFavCollector = createMediaGroupCollector(saveFavHandler);
  const callbackHandler = createCallbackHandler(deps);
  const todayHandler = createTodayHandler(deps);
  const weekHandler = createWeekHandler(deps);
  const monthHandler = createMonthHandler(deps);
  const historyHandler = createHistoryHandler(deps);
  const favHandler = createFavHandler(deps);
  const unfavHandler = createUnfavHandler(deps);
  const measureHandler = createMeasureHandler(deps);
  const progressHandler = createProgressHandler(deps);

  // Help handler
  const helpText = [
    "🍽 <b>Nutrition Tracker Bot</b>",
    "",
    "<b>Commands:</b>",
    "/log &lt;food&gt; — Log a meal (text or photo)",
    "/savefav &lt;alias&gt; &lt;food&gt; — Save as favorite without logging",
    "/today — Today's nutrition summary",
    "/week — This week's summary",
    "/month — This month's summary",
    "/history — View past logs",
    "/fav — List favorites",
    "/unfav &lt;number&gt; — Remove a favorite",
    "/measure — Log body composition &amp; weight",
    "/progress — Show weight &amp; body progress",
    "/help — Show this help message",
  ].join("\n");

  bot.command("help", (ctx) => ctx.reply(helpText, { parse_mode: "HTML" }));

  // Register commands
  bot.command("log", logCollector);
  bot.command("savefav", saveFavCollector);
  bot.command("today", todayHandler);
  bot.command("week", weekHandler);
  bot.command("month", monthHandler);
  bot.command("history", historyHandler);
  bot.command("fav", favHandler);
  bot.command("unfav", unfavHandler);
  bot.command("measure", measureHandler);
  bot.command("progress", progressHandler);

  // Handle photos sent without /log command (treat as /log with photo)
  bot.on("message:photo", (ctx) => {
    const groupId = ctx.message?.media_group_id;
    // If this photo belongs to a media group already claimed by another handler, route it there
    if (isMediaGroupPending(groupId)) {
      return appendToMediaGroup(groupId!, ctx);
    }
    return logCollector(ctx);
  });

  // Fallback for any unhandled message
  bot.on("message", (ctx) => {
    const text = ctx.message.text ?? ctx.message.caption ?? "";
    if (text.startsWith("/")) {
      return ctx.reply(
        "❓ Unknown command. Send /help for the list of commands.",
      );
    }
    return ctx.reply("🤖 I didn't get that. Send /help to see what I can do.");
  });

  // Callback queries (inline buttons)
  bot.on("callback_query:data", callbackHandler);

  // Register command hints with Telegram
  await bot.api.setMyCommands([
    { command: "log", description: "Log a meal with text or photo" },
    {
      command: "savefav",
      description: "Save food as favorite without logging",
    },
    { command: "today", description: "Show today's nutrition summary" },
    { command: "week", description: "Show this week's summary" },
    { command: "month", description: "Show this month's summary" },
    { command: "history", description: "View past logs" },
    { command: "fav", description: "List favorites" },
    { command: "unfav", description: "Remove a favorite" },
    { command: "measure", description: "Log body composition & weight" },
    { command: "progress", description: "Show weight & body progress" },
    { command: "help", description: "Show help message" },
  ]);

  return bot;
}
