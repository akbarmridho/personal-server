import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import type { Context } from "grammy";
import type { DrizzleDB } from "../../db/index.js";
import {
  getRecentMeasurements,
  upsertMeasurement,
} from "../../repository/measurements.js";
import { syncGarminBodyComp } from "../../sync/garmin.js";
import { formatMeasurementComparison } from "../../utils/format.js";
import { logger } from "../../utils/logger.js";
import { parseMeasureInput } from "../../utils/measure-parser.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = "Asia/Jakarta";

interface MeasureDeps {
  db: DrizzleDB;
}

function getGuideText() {
  return `<b>📏 Body Composition Input Guide</b>

Send <code>/measure</code> with key:value pairs. All fields optional except <code>w</code> (weight).

<b>Required:</b>
<code>w</code> or <code>weight</code> — weight in kg

<b>Optional:</b>
<code>f</code> / <code>bf</code> / <code>body_fat_pct</code> — body fat %
<code>bfm</code> / <code>body_fat_mass</code> — body fat mass in kg
<code>smm</code> / <code>skeletal_muscle_mass</code> — skeletal muscle mass in kg
<code>vf</code> / <code>visceral_fat</code> — visceral fat level
<code>bmr</code> — basal metabolic rate in kcal
<code>tbw</code> / <code>total_body_water</code> — total body water in L
<code>bmi</code> — body mass index
<code>ffm</code> / <code>fat_free_mass</code> — fat-free mass in kg
<code>bm</code> / <code>mineral</code> / <code>bone_mass</code> — bone mass (mineral) in kg
<code>smi</code> — skeletal muscle index
<code>notes</code> — any note
<code>date</code> — YYYY-MM-DD (default: today)

<b>Examples:</b>
<code>/measure w:72.5</code>
<code>/measure w:72.5 f:18.5 smm:33.2 bmr:1500</code>
<code>/measure w:72.5 f:18.5 date:2025-05-01</code>`;
}

export function createMeasureHandler(deps: MeasureDeps) {
  return async (ctx: Context) => {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const text =
      ctx.message?.text?.replace(/^\/measure\s*/, "").trim() ||
      ctx.message?.caption?.replace(/^\/measure\s*/, "").trim() ||
      "";

    if (!text) {
      await ctx.reply(getGuideText(), { parse_mode: "HTML" });
      return;
    }

    const today = dayjs().tz(TZ).format("YYYY-MM-DD");
    const parsed = parseMeasureInput(text, today);
    if (!parsed.ok) {
      logger.info({ userId, reason: parsed.reason }, "/measure parse failed");
      await ctx.reply(`❌ ${parsed.reason}\n\n${getGuideText()}`, {
        parse_mode: "HTML",
      });
      return;
    }

    const data = parsed.data;
    logger.info(
      {
        userId,
        weight: data.weight,
        date: data.date,
        bodyFatPct: data.bodyFatPct,
      },
      "/measure saving",
    );

    await upsertMeasurement(deps.db, {
      userId,
      date: data.date,
      weight: data.weight,
      bodyFatPct: data.bodyFatPct,
      bodyFatMass: data.bodyFatMass,
      skeletalMuscleMass: data.skeletalMuscleMass,
      visceralFatLevel: data.visceralFatLevel,
      bmr: data.bmr,
      totalBodyWater: data.totalBodyWater,
      bmi: data.bmi,
      fatFreeMass: data.fatFreeMass,
      boneMass: data.boneMass,
      smi: data.smi,
      notes: data.notes,
    });

    syncGarminBodyComp({
      weight: data.weight,
      date: data.date,
      percentFat: data.bodyFatPct,
      muscleMass: data.skeletalMuscleMass,
      basalMet: data.bmr,
      visceralFatRating: data.visceralFatLevel,
      bmi: data.bmi,
      boneMass: data.boneMass,
    });
    logger.info({ userId, date: data.date }, "/measure saved");

    const recent = await getRecentMeasurements(deps.db, userId, 2);
    const current = recent[0];
    const previous = recent.length > 1 ? recent[1] : null;

    if (current) {
      await ctx.reply(formatMeasurementComparison(current, previous));
    } else {
      await ctx.reply("✅ Measurement saved.");
    }
  };
}
