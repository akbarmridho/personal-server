import type Database from "better-sqlite3";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import type { Context } from "grammy";
import type { DrizzleDB } from "../../db/index.js";
import { analyzeFavorite } from "../../llm/analyze-favorite.js";
import { createFavorite, listFavorites } from "../../repository/favorites.js";
import { fmt } from "../../utils/format.js";
import { logger } from "../../utils/logger.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = "Asia/Jakarta";

interface SaveFavDeps {
  db: DrizzleDB;
  foodDb: Database.Database;
}

export function createSaveFavHandler(deps: SaveFavDeps) {
  return async (contexts: Context[]) => {
    const ctx = contexts[0];
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const chatId = ctx.chat?.id;
    if (!chatId) return;

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

    if (!text && photos.length === 0) {
      await ctx.reply(
        "Send /savefav with a food description, photo, or both.\nExamples:\n• /savefav sereal pagi muesli 50g + susu\n• /savefav [photo of nutrition label]",
      );
      return;
    }

    logger.info(
      { userId, text: text.slice(0, 80), photoCount: photos.length },
      "/savefav started",
    );

    const processingMsg = await ctx.reply("⏳ Analyzing food for favorite...");

    try {
      const favorites = await listFavorites(deps.db, userId);

      const startTime = Date.now();
      const result = await analyzeFavorite({
        text: text || undefined,
        photos: photos.length > 0 ? photos : undefined,
        favorites,
        messageTimestamp: dayjs().tz(TZ).toDate(),
        foodDb: deps.foodDb,
      });
      const durationMs = Date.now() - startTime;

      if (result.error || !result.item) {
        logger.warn(
          { userId, reason: result.reason, durationMs },
          "/savefav LLM failed",
        );
        await ctx.api.editMessageText(
          chatId,
          processingMsg.message_id,
          `❌ ${result.reason || "Could not estimate nutrition for this input."}`,
        );
        return;
      }

      const { item, alias } = result;

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

      logger.info(
        { userId, alias, name: item.name, calories: item.calories, durationMs },
        "/savefav favorite saved",
      );

      await ctx.api.editMessageText(
        chatId,
        processingMsg.message_id,
        `⭐ Saved "${alias}" as favorite\n\n` +
          `• ${item.name}${item.portion ? ` (${item.portion})` : ""}\n` +
          `  ${fmt(item.calories)} kcal | P:${fmt(item.protein_g)}g C:${fmt(item.carbs_g)}g F:${fmt(item.fat_g)}g Fiber:${fmt(item.fiber_g)}g`,
      );
    } catch (err) {
      logger.error({ err, userId }, "/savefav handler error");
      await ctx.api.editMessageText(
        chatId,
        processingMsg.message_id,
        "❌ Something went wrong. Please try again.",
      );
      throw err;
    }
  };
}
