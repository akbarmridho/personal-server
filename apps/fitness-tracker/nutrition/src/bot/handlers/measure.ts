import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import type { Context } from "grammy";
import type { DrizzleDB } from "../../db/index.js";
import { parseMeasurement } from "../../llm/analyzer.js";
import {
  getRecentMeasurements,
  upsertMeasurement,
} from "../../repository/measurements.js";
import { syncGarminWeight } from "../../sync/garmin.js";
import { formatMeasurementComparison } from "../../utils/format.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = "Asia/Jakarta";

interface MeasureDeps {
  db: DrizzleDB;
}

export function createMeasureHandler(deps: MeasureDeps) {
  return async (ctx: Context) => {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const text =
      ctx.message?.text?.replace(/^\/measure\s*/, "").trim() ||
      ctx.message?.caption?.replace(/^\/measure\s*/, "").trim() ||
      "";

    // Collect photos
    const photos: { data: Uint8Array; mediaType: string }[] = [];

    if (ctx.message?.photo) {
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      const file = await ctx.api.getFile(photo.file_id);
      if (file.file_path) {
        const url = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;
        const ext = file.file_path.split(".").pop()?.toLowerCase();
        const mediaType =
          ext === "png"
            ? "image/png"
            : ext === "webp"
              ? "image/webp"
              : "image/jpeg";
        const res = await fetch(url);
        if (res.ok) {
          const buffer = new Uint8Array(await res.arrayBuffer());
          photos.push({ data: buffer, mediaType });
        }
      }
    }

    if (!text && photos.length === 0) {
      await ctx.reply(
        "Send a photo of your InBody result sheet, or type your values.\nExample: /measure weight 75.5 body fat 18.5% muscle 33.2kg",
      );
      return;
    }

    // Parse measurement via LLM (text and/or photo)
    const data = await parseMeasurement(
      text || undefined,
      photos.length > 0 ? photos : undefined,
    );
    if (!data) {
      await ctx.reply(
        "❌ Could not parse body composition values. Please try again with a clearer photo or text.",
      );
      return;
    }

    const today = dayjs().tz(TZ).format("YYYY-MM-DD");

    // Upsert measurement
    await upsertMeasurement(deps.db, {
      userId,
      date: today,
      weight: data.weight,
      bodyFatPct: data.body_fat_pct,
      bodyFatMass: data.body_fat_mass,
      skeletalMuscleMass: data.skeletal_muscle_mass,
      visceralFatLevel: data.visceral_fat_level,
      bmr: data.bmr,
      totalBodyWater: data.total_body_water,
      bmi: data.bmi,
      fatFreeMass: data.fat_free_mass,
      smi: data.smi,
    });

    // Sync weight to Garmin
    if (data.weight) {
      syncGarminWeight(data.weight, today);
    }

    // Get previous measurement for comparison
    const recent = await getRecentMeasurements(deps.db, userId, 2);
    const current = recent[0];
    const previous = recent.length > 1 ? recent[1] : null;

    if (current) {
      await ctx.reply(formatMeasurementComparison(current, previous));
    } else {
      await ctx.reply("Measurement saved.");
    }
  };
}
