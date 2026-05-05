import type { Context } from "grammy";
import type { DrizzleDB } from "../../db/index.js";
import { deleteMealsByBatch } from "../../repository/meals.js";
import { logger } from "../../utils/logger.js";

interface CallbackDeps {
  db: DrizzleDB;
}

export function createCallbackHandler(deps: CallbackDeps) {
  return async (ctx: Context) => {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    const userId = ctx.from?.id?.toString();

    if (data.startsWith("ok:")) {
      logger.info(
        { userId, batchId: data.slice(3) },
        "callback: meal confirmed",
      );
      await ctx.editMessageReplyMarkup({
        reply_markup: { inline_keyboard: [] },
      });
      await ctx.answerCallbackQuery();
      return;
    }

    if (data.startsWith("delete:")) {
      const batchId = data.slice("delete:".length);
      if (!batchId) return;

      try {
        await deleteMealsByBatch(deps.db, batchId);
        logger.info({ userId, batchId }, "callback: meal deleted");
        await ctx.editMessageText("🗑 Deleted.");
      } catch {
        try {
          await ctx.editMessageText("🗑 Deleted.");
        } catch {
          // Message may already be edited
        }
      }
      await ctx.answerCallbackQuery();
      return;
    }
  };
}
