import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import type { Context } from "grammy";
import type MiniSearch from "minisearch";
import type { DrizzleDB } from "../../db/index.js";
import { analyzeMeal } from "../../llm/analyzer.js";
import { createFavorite, listFavorites } from "../../repository/favorites.js";
import { createMeals } from "../../repository/meals.js";
import type { FoodResult } from "../../search/openfoodfacts.js";
import type { UsdaFood } from "../../search/usda.js";
import { formatMealBreakdown } from "../../utils/format.js";
import { buildMealKeyboard } from "../keyboards.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = "Asia/Jakarta";

interface LogDeps {
  db: DrizzleDB;
  usdaIndex: MiniSearch<UsdaFood>;
  searchOpenFoodFacts: (query: string, limit?: number) => Promise<FoodResult[]>;
}

export function createLogHandler(deps: LogDeps) {
  return async (ctx: Context) => {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const text =
      ctx.message?.text?.replace(/^\/log\s*/, "").trim() ||
      ctx.message?.caption?.replace(/^\/log\s*/, "").trim() ||
      "";

    // Collect photos
    const photos: { data: Uint8Array; mediaType: string }[] = [];
    const photoFileIds: string[] = [];

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
        photoFileIds.push(photo.file_id);
        if (res.ok) {
          const buffer = new Uint8Array(await res.arrayBuffer());
          photos.push({ data: buffer, mediaType });
        }
      }
    }

    // Validate input
    if (!text && photos.length === 0) {
      await ctx.reply(
        "Please provide a food description, photo, or both.\nExample: /log nasi goreng ayam",
      );
      return;
    }

    // Fetch user favorites
    const favorites = await listFavorites(deps.db, userId);

    // Call LLM
    const result = await analyzeMeal({
      text: text || undefined,
      photos: photos.length > 0 ? photos : undefined,
      favorites,
      messageTimestamp: dayjs
        .unix(ctx.message?.date ?? Math.floor(Date.now() / 1000))
        .tz(TZ)
        .toDate(),
      usdaIndex: deps.usdaIndex,
      searchOpenFoodFacts: deps.searchOpenFoodFacts,
    });

    // Handle error
    if (result.error) {
      await ctx.reply(
        `❌ ${result.reason || "Could not estimate nutrition for this input."}`,
      );
      return;
    }

    // Determine meal time
    const mealTime = result.meal_time
      ? dayjs(result.meal_time).tz(TZ).toDate()
      : dayjs
          .unix(ctx.message?.date ?? Math.floor(Date.now() / 1000))
          .tz(TZ)
          .toDate();

    // Generate batch ID
    const batchId = String(Date.now());

    // Create one meal row per item
    const mealRows = result.items.map((item) => ({
      userId,
      batchId,
      mealTime,
      name: item.name,
      description: item.description,
      portion: item.portion,
      photoFileIds: photoFileIds.length > 0 ? photoFileIds : null,
      calories: item.calories,
      proteinG: item.protein_g,
      carbsG: item.carbs_g,
      fatG: item.fat_g,
      fiberG: item.fiber_g,
      references: item.references,
    }));

    await createMeals(deps.db, mealRows);

    // Handle save_as (create favorite)
    if (result.save_as && result.items.length > 0) {
      const firstItem = result.items[0];
      try {
        await createFavorite(deps.db, {
          userId,
          name: firstItem.name,
          aliases: [result.save_as],
          calories: firstItem.calories,
          proteinG: firstItem.protein_g,
          carbsG: firstItem.carbs_g,
          fatG: firstItem.fat_g,
          fiberG: firstItem.fiber_g,
          portion: firstItem.portion,
          references: firstItem.references,
        });
      } catch {
        // Ignore duplicate errors
      }
    }

    // Reply with formatted breakdown + inline buttons
    const message = formatMealBreakdown(result.items);
    const savedNote = result.save_as
      ? `\n\n💾 Saved as "${result.save_as}"`
      : "";

    await ctx.reply(message + savedNote, {
      reply_markup: buildMealKeyboard(batchId),
    });
  };
}
