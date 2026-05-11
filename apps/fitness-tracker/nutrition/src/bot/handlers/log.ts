import type Database from "better-sqlite3";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import type { Context } from "grammy";
import type { DrizzleDB } from "../../db/index.js";
import { analyzeMeal } from "../../llm/analyzer.js";
import {
  createFavorite,
  findDuplicateByAlias,
  listFavorites,
} from "../../repository/favorites.js";
import { createMeals } from "../../repository/meals.js";
import { formatMealBreakdown } from "../../utils/format.js";
import { logger } from "../../utils/logger.js";
import { buildMealKeyboard } from "../keyboards.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = "Asia/Jakarta";

interface LogDeps {
  db: DrizzleDB;
  foodDb: Database.Database;
}

export function createLogHandler(deps: LogDeps) {
  return async (contexts: Context[]) => {
    const ctx = contexts[0];
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    const chatId = ctx.chat?.id;
    if (!chatId) return;

    logger.info(
      { userId, messageCount: contexts.length },
      "/log handler started",
    );

    const processingMsg = await ctx.reply("⏳ Analyzing your meal...");

    try {
      let text = "";
      for (const c of contexts) {
        const t =
          c.message?.text?.replace(/^\/log\s*/, "").trim() ||
          c.message?.caption?.replace(/^\/log\s*/, "").trim() ||
          "";
        if (t) {
          text = t;
          break;
        }
      }

      const photos: { data: Uint8Array; mediaType: string }[] = [];
      const photoFileIds: string[] = [];

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
            photoFileIds.push(photo.file_id);
            if (res.ok) {
              const buffer = new Uint8Array(await res.arrayBuffer());
              photos.push({ data: buffer, mediaType });
            }
          }
        }
      }

      logger.info(
        { userId, text: text.slice(0, 100), photoCount: photos.length },
        "/log input collected",
      );

      if (!text && photos.length === 0) {
        await ctx.api.editMessageText(
          chatId,
          processingMsg.message_id,
          "Please provide a food description, photo, or both.\nExample: /log nasi goreng ayam",
        );
        return;
      }

      const favorites = await listFavorites(deps.db, userId);

      logger.info({ userId, favCount: favorites.length }, "/log calling LLM");
      const startTime = Date.now();

      const result = await analyzeMeal({
        text: text || undefined,
        photos: photos.length > 0 ? photos : undefined,
        favorites,
        messageTimestamp: dayjs
          .unix(ctx.message?.date ?? Math.floor(Date.now() / 1000))
          .tz(TZ)
          .toDate(),
        foodDb: deps.foodDb,
      });

      const durationMs = Date.now() - startTime;

      if (result.error) {
        logger.warn(
          { userId, reason: result.reason, durationMs },
          "/log LLM returned error",
        );
        await ctx.api.editMessageText(
          chatId,
          processingMsg.message_id,
          `❌ ${result.reason || "Could not estimate nutrition for this input."}`,
        );
        return;
      }

      logger.info(
        {
          userId,
          itemCount: result.items.length,
          durationMs,
          saveAs: result.save_as,
        },
        "/log LLM analysis complete",
      );

      const mealTime = result.meal_time
        ? dayjs(result.meal_time).toDate()
        : dayjs
            .unix(ctx.message?.date ?? Math.floor(Date.now() / 1000))
            .toDate();

      const batchId = String(Date.now());

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
      logger.info(
        { userId, batchId, rowCount: mealRows.length },
        "/log meals saved to DB",
      );

      if (result.save_as && result.items.length > 0) {
        const firstItem = result.items[0];
        const duplicate = findDuplicateByAlias(favorites, [result.save_as]);
        if (duplicate) {
          logger.info(
            { userId, alias: result.save_as, existingName: duplicate.name },
            "/log save_as skipped — duplicate alias",
          );
        } else {
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
            logger.info(
              { userId, alias: result.save_as },
              "/log favorite saved",
            );
          } catch {
            // Ignore other errors
          }
        }
      }

      const message = formatMealBreakdown(result.items, mealTime);
      const savedNote = result.save_as
        ? findDuplicateByAlias(favorites, [result.save_as])
          ? `\n\n⚠️ "${result.save_as}" already exists as a favorite — skipped saving.`
          : `\n\n💾 Saved as "${result.save_as}"`
        : "";

      await ctx.api.editMessageText(
        chatId,
        processingMsg.message_id,
        message + savedNote,
        {
          reply_markup: buildMealKeyboard(batchId),
        },
      );

      logger.info({ userId, batchId }, "/log handler complete");
    } catch (err) {
      logger.error({ err, userId }, "/log handler error");
      await ctx.api.editMessageText(
        chatId,
        processingMsg.message_id,
        "❌ Something went wrong while processing your meal. Please try again.",
      );
      throw err;
    }
  };
}
