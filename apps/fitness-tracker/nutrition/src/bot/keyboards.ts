import { InlineKeyboard } from "grammy";

export function buildMealKeyboard(batchId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ OK", `ok:${batchId}`)
    .text("🗑 Delete", `delete:${batchId}`);
}
