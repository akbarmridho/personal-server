import type Database from "better-sqlite3";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import type { Context } from "grammy";
import type { DrizzleDB } from "../../db/index.js";
import { analyzeMeal } from "../../llm/analyzer.js";
import { createFavorite, listFavorites } from "../../repository/favorites.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = "Asia/Jakarta";

interface SaveFavDeps {
  db: DrizzleDB;
  foodDb: Database.Database;
}

/**
 * /savefav <alias> <description or photo>
 * Analyzes food via LLM and saves as favorite without logging a meal.
 */
export function createSaveFavHandler(deps: SaveFavDeps) {
  return async (contexts: Context[]) => {
    const ctx = contexts[0];
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const chatId = ctx.chat?.id;
    if (!chatId) return;

    // Extract text — first token after /savefav is the alias
    let text = "";
    for (const c of contexts) {
      const t =
        c.message?.text?.replace(/^\/savefav\s*/, "").trim() ||
        c.message?.caption?.replace(/^\/savefav\s*/, "").trim() ||
        "";
      if (t) {
        text = t;
        break;
      }
    }

    if (!text) {
      await ctx.reply(
        "Usage: /savefav <alias> <food description>\nExample: /savefav sereal muesli 50g with dancow milk 25g",
      );
      return;
    }

    // First word is the alias, rest is the food description
    const spaceIdx = text.indexOf(" ");
    if (spaceIdx === -1) {
      await ctx.reply(
        "Please provide both an alias and a food description.\nExample: /savefav sereal muesli 50g with dancow milk 25g",
      );
      return;
    }

    const alias = text.slice(0, spaceIdx).trim();
    const foodDescription = text.slice(spaceIdx + 1).trim();

    const processingMsg = await ctx.reply("⏳ Analyzing food for favorite...");

    try {
      // Collect photos from all messages in the group
      const photos: { data: Uint8Array; mediaType: string }[] = [];

      for (const c of contexts) {
        if (c.message?.photo) {
          const photo = c.message.photo[c.message.photo.length - 1];
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
      }

      const favorites = await listFavorites(deps.db, userId);

      const result = await analyzeMeal({
        text: foodDescription || undefined,
        photos: photos.length > 0 ? photos : undefined,
        favorites,
        messageTimestamp: dayjs().tz(TZ).toDate(),
        foodDb: deps.foodDb,
      });

      if (result.error || result.items.length === 0) {
        await ctx.api.editMessageText(
          chatId,
          processingMsg.message_id,
          `❌ ${result.reason || "Could not estimate nutrition for this input."}`,
        );
        return;
      }

      const item = result.items[0];

      await createFavorite(deps.db, {
        userId,
        name: item.name,
        aliases: [alias],
        calories: item.calories,
        proteinG: item.protein_g,
        carbsG: item.carbs_g,
        fatG: item.fat_g,
        fiberG: item.fiber_g,
        portion: item.portion,
        references: item.references,
      });

      await ctx.api.editMessageText(
        chatId,
        processingMsg.message_id,
        `⭐ Saved "${alias}" as favorite\n\n` +
          `• ${item.name}${item.portion ? ` (${item.portion})` : ""}\n` +
          `  ${item.calories} kcal | P:${item.protein_g}g C:${item.carbs_g}g F:${item.fat_g}g`,
      );
    } catch (err) {
      await ctx.api.editMessageText(
        chatId,
        processingMsg.message_id,
        "❌ Something went wrong. Please try again.",
      );
      throw err;
    }
  };
}
