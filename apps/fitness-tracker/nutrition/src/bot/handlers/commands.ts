import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import type { Context } from "grammy";
import type { DrizzleDB } from "../../db/index.js";
import {
  deleteFavoriteById,
  listFavorites,
} from "../../repository/favorites.js";
import {
  getDailyMeals,
  getMonthlySummary,
  getWeeklySummary,
} from "../../repository/stats.js";
import {
  formatDailySummary,
  formatMonthlySummary,
  formatWeeklySummary,
} from "../../utils/format.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = "Asia/Jakarta";

interface CommandDeps {
  db: DrizzleDB;
}

export function createTodayHandler(deps: CommandDeps) {
  return async (ctx: Context) => {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const today = dayjs().tz(TZ).format("YYYY-MM-DD");
    const meals = await getDailyMeals(deps.db, userId, today);
    await ctx.reply(formatDailySummary(meals, today));
  };
}

export function createWeekHandler(deps: CommandDeps) {
  return async (ctx: Context) => {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const now = dayjs().tz(TZ);
    const monday = now.startOf("week").add(1, "day"); // dayjs week starts Sunday
    const sunday = monday.add(6, "day");
    const mondayStr = monday.format("YYYY-MM-DD");
    const sundayStr = sunday.format("YYYY-MM-DD");

    const days = await getWeeklySummary(deps.db, userId, mondayStr, sundayStr);
    await ctx.reply(
      formatWeeklySummary(days, `Week ${mondayStr} to ${sundayStr}`),
    );
  };
}

export function createMonthHandler(deps: CommandDeps) {
  return async (ctx: Context) => {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const now = dayjs().tz(TZ);
    const currentMonday = now.startOf("week").add(1, "day");
    const startMonday = currentMonday.subtract(21, "day");
    const endSunday = currentMonday.add(6, "day");

    const weeks = await getMonthlySummary(
      deps.db,
      userId,
      startMonday.format("YYYY-MM-DD"),
      endSunday.format("YYYY-MM-DD"),
    );
    await ctx.reply(formatMonthlySummary(weeks));
  };
}

export function createHistoryHandler(deps: CommandDeps) {
  return async (ctx: Context) => {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const text = ctx.message?.text?.replace(/^\/history\s*/, "").trim() || "";
    if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      await ctx.reply(
        "Usage: /history YYYY-MM-DD\nExample: /history 2025-01-15",
      );
      return;
    }

    const meals = await getDailyMeals(deps.db, userId, text);
    await ctx.reply(formatDailySummary(meals, text));
  };
}

export function createFavHandler(deps: CommandDeps) {
  return async (ctx: Context) => {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const favorites = await listFavorites(deps.db, userId);
    if (favorites.length === 0) {
      await ctx.reply(
        'No favorites saved yet.\nUse /log with "save as [name]" to save a favorite.',
      );
      return;
    }

    const lines = favorites.map(
      (f, i) =>
        `${i + 1}. ${f.aliases.join(", ")} — ${f.calories} kcal | P:${f.proteinG}g C:${f.carbsG}g F:${f.fatG}g${f.portion ? ` (${f.portion})` : ""}`,
    );
    await ctx.reply(`⭐ Your Favorites\n\n${lines.join("\n")}`);
  };
}

export function createUnfavHandler(deps: CommandDeps) {
  return async (ctx: Context) => {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const input = ctx.message?.text?.replace(/^\/unfav\s*/, "").trim() || "";
    const index = parseInt(input, 10);
    if (!input || Number.isNaN(index) || index < 1) {
      await ctx.reply("Usage: /unfav [number]\nExample: /unfav 1");
      return;
    }

    const favorites = await listFavorites(deps.db, userId);
    if (index > favorites.length) {
      await ctx.reply(
        `Only ${favorites.length} favorites. Use /fav to see the list.`,
      );
      return;
    }

    const target = favorites[index - 1];
    await deleteFavoriteById(deps.db, target.id);
    await ctx.reply(`🗑 Removed #${index} "${target.name}" from favorites.`);
  };
}
