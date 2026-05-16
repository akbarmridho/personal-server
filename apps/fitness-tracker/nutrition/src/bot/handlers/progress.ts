import type { Context } from "grammy";
import type { DrizzleDB } from "../../db/index.js";
import {
  getRecentBodyCompMeasurements,
  getRecentMeasurements,
} from "../../repository/measurements.js";
import {
  formatMeasurementComparison,
  formatWeightTrend,
} from "../../utils/format.js";

interface ProgressDeps {
  db: DrizzleDB;
}

export function createProgressHandler(deps: ProgressDeps) {
  return async (ctx: Context) => {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const recent = await getRecentMeasurements(deps.db, userId, 7);

    if (recent.length === 0) {
      await ctx.reply(
        "No body composition data yet.\nUse /measure to log your first scan.",
      );
      return;
    }

    const sections: string[] = [];

    // Weight trend (last 7 entries)
    const weightEntries = recent.map((m) => ({
      date: m.date,
      weight: m.weight,
    }));
    sections.push(formatWeightTrend(weightEntries));

    // Body composition comparison (find entries with full data)
    const bodyComp = await getRecentBodyCompMeasurements(deps.db, userId, 2);
    if (bodyComp.length > 0) {
      const current = bodyComp[0];
      const previous = bodyComp.length > 1 ? bodyComp[1] : null;
      sections.push(formatMeasurementComparison(current, previous));
    }

    await ctx.reply(sections.join("\n\n"));
  };
}
