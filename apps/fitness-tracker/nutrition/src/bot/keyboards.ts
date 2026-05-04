import { InlineKeyboard } from "grammy";

export function buildMealKeyboard(mealId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ OK", `ok:${mealId}`)
    .text("🗑 Delete", `delete:${mealId}`);
}
