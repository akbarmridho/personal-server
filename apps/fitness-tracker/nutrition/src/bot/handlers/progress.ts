import type { Context } from "grammy";
import type { DrizzleDB } from "../../db/index.js";
import { getRecentMeasurements } from "../../repository/measurements.js";
import { formatMeasurementComparison } from "../../utils/format.js";

interface ProgressDeps {
  db: DrizzleDB;
}

export function createProgressHandler(deps: ProgressDeps) {
  return async (ctx: Context) => {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const recent = await getRecentMeasurements(deps.db, userId, 2);

    if (recent.length === 0) {
      await ctx.reply(
        "No body composition data yet.\nUse /measure to log your first scan.",
      );
      return;
    }

    if (recent.length === 1) {
      const msg = formatMeasurementComparison(recent[0], null);
      await ctx.reply(
        `${msg}\n\nLog a second scan with /measure to see progress.`,
      );
      return;
    }

    await ctx.reply(formatMeasurementComparison(recent[0], recent[1]));
  };
}
