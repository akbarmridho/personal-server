import type { Context } from "grammy";
import type { DrizzleDB } from "../../db/index.js";
import { deleteMealsByBatch } from "../../repository/meals.js";

interface CallbackDeps {
  db: DrizzleDB;
}

export function createCallbackHandler(deps: CallbackDeps) {
  return async (ctx: Context) => {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    if (data.startsWith("ok:")) {
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
