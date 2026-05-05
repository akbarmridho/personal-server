import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import type { Context } from "grammy";
import type { DrizzleDB } from "../../db/index.js";
import {
  getPreviousWeight,
  getRecentWeights,
  upsertWeight,
} from "../../repository/weight.js";
import { syncGarminWeight } from "../../sync/garmin.js";
import { formatWeightDelta, formatWeightTrend } from "../../utils/format.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = "Asia/Jakarta";

interface WeightDeps {
  db: DrizzleDB;
}

export function createWeightHandler(deps: WeightDeps) {
  return async (ctx: Context) => {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const text = ctx.message?.text?.replace(/^\/weight\s*/, "").trim() || "";
    const parts = text.split(/\s+/).filter(Boolean);

    // No args — show recent weights
    if (parts.length === 0) {
      const entries = await getRecentWeights(deps.db, userId);
      await ctx.reply(formatWeightTrend(entries));
      return;
    }

    // Parse weight
    const weight = parseFloat(parts[0]);
    if (Number.isNaN(weight) || weight <= 0 || weight > 500) {
      await ctx.reply(
        "Invalid weight. Please provide a number in kg.\nExample: /weight 75.5",
      );
      return;
    }

    // Parse optional date
    let date: string;
    if (parts.length >= 2) {
      const parsed = dayjs(parts[1], "YYYY-MM-DD", true);
      if (!parsed.isValid()) {
        await ctx.reply(
          "Invalid date format. Use YYYY-MM-DD.\nExample: /weight 75.5 2025-01-15",
        );
        return;
      }
      date = parts[1];
    } else {
      date = dayjs().tz(TZ).format("YYYY-MM-DD");
    }

    // Upsert weight
    await upsertWeight(deps.db, { userId, date, weight });

    syncGarminWeight(weight, date);

    // Get previous weight for delta
    const previous = await getPreviousWeight(deps.db, userId, date);
    const msg = formatWeightDelta(weight, previous?.weight ?? null);

    await ctx.reply(msg);
  };
}
