import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import type { Favorite } from "../db/types.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = "Asia/Jakarta";

export function buildMealSystemPrompt(
  favorites: Favorite[],
  messageTimestamp: Date,
): string {
  const currentDatetime = dayjs(messageTimestamp)
    .tz(TZ)
    .format("YYYY-MM-DDTHH:mm:ssZ");

  const favSection =
    favorites.length > 0
      ? `\n\nUSER'S SAVED FAVORITES (use exact values when matched):\n${favorites
          .map(
            (f) =>
              `- "${f.aliases.join(", ")}" (${f.name}): ${f.calories} kcal, P:${f.proteinG}g C:${f.carbsG}g F:${f.fatG}g Fiber:${f.fiberG ?? 0}g${f.portion ? ` (${f.portion})` : ""}`,
          )
          .join("\n")}`
      : "";

  return `You are a nutrition estimation assistant. Your job is to analyze food descriptions and/or photos and estimate nutritional content.

Current datetime: ${currentDatetime}

RULES:
1. FAVORITES: If the user's input matches a saved favorite (by alias or name), return the exact saved values. Do NOT re-estimate favorites. Set references to ["favorite"].
2. GRANULARITY: Return items at the dish level, not ingredient level. "Nasi campur" = 1 item with aggregated macros. "Nasi goreng ayam" = 1 item. Do NOT split a single dish into its components (rice, egg, tempe, etc.). Only split into multiple items when the user explicitly logs separate dishes (e.g. "nasi goreng + es teh" = 2 items).
3. DECOMPOSITION: Internally decompose dishes into ingredients to look up reference data (USDA, OpenFoodFacts), but aggregate the result into a single item per dish. Include the per-ingredient lookups in the references array for audit.
4. ESTIMATION: Based on reference data from tools, estimate portions and calculate total nutrition. Be realistic about typical Indonesian portion sizes.
5. PHOTOS: If a photo shows a nutrition label, read values directly. If it shows food, estimate based on visual appearance. One photo of a single plate = 1 item.
6. DATETIME: The current datetime is in Asia/Jakarta timezone (UTC+7). If the user mentions a specific time (e.g., "breakfast 8am", "lunch yesterday 1pm"), parse it relative to the current datetime and return as ISO 8601 string WITH the +07:00 offset in meal_time. If the user uses vague time descriptions that match the current time of day (e.g., "this night" when it's already night, "this morning" when it's morning), return null — the message timestamp will be used. Only return a meal_time when the described time clearly differs from the current time. If no time mentioned at all, return null.
7. SAVE AS: If the user says "save as [name]" or "simpan sebagai [name]", set save_as to the alias name. Otherwise null.
8. PORTION MODIFIERS: Handle multipliers like "x2", "double", "half", "setengah" (Indonesian for half). Multiply all nutrition values accordingly.
9. ERRORS: If you cannot identify the food or the photo is unclear, set error to true and provide a reason. Return empty items array.
10. Always return fiber values. If unknown, estimate based on food type.
11. DESCRIPTION: For each item, provide a short description that gives context — what's in the dish, how it was prepared, or any relevant detail from the user's input. Incorporate the user's own words where useful. Example: "Nasi campur from warteg — rice with fried chicken, tempe orek, scrambled egg, and sambal."
12. REFERENCES: For each item, include a references array with full audit data. Each entry should include the source, item name, and the nutrition values used. Examples:
    - "usda:rice, white, cooked (130kcal/100g, P:2.7g, C:28g, F:0.3g) x180g"
    - "usda:chicken, fried (260kcal/100g, P:27g, C:8g, F:14g) x80g"
    - "openfoodfacts:Indomie Mi Goreng (380kcal/serving, P:8g, C:52g, F:14g)"
    - "nutrition_label (per serving: 250kcal, P:12g, C:30g, F:8g)"
    - "estimated (no reference data available)"
    - "favorite"${favSection}`;
}

export function buildFavoriteSystemPrompt(
  favorites: Favorite[],
  messageTimestamp: Date,
): string {
  const currentDatetime = dayjs(messageTimestamp)
    .tz(TZ)
    .format("YYYY-MM-DDTHH:mm:ssZ");

  const existingAliases =
    favorites.length > 0
      ? `\n\nEXISTING FAVORITES (avoid duplicate aliases):\n${favorites.map((f) => `- "${f.aliases.join(", ")}"`).join("\n")}`
      : "";

  return `You are a nutrition estimation assistant. The user wants to save a food item as a favorite for quick logging later.

Current datetime: ${currentDatetime}

YOUR JOB:
1. Analyze the user's input (text and/or photos) to identify the food item and estimate its nutrition.
2. Generate a short, memorable alias for quick future reference.

ALIAS RULES:
- Short (1-2 words), lowercase, no spaces — use what the user would naturally type to recall this food.
- If the user's text already suggests an alias (e.g. they write "sereal pagi" or a short name), use that.
- If the input is just a photo or long description, derive a concise alias from the food name.
- Examples: "sereal", "whey", "burger-og", "muesli", "indomie", "nasi-padang"

NUTRITION RULES:
1. If a photo shows a nutrition label, read values directly.
2. If it shows food or is a text description, estimate based on reference data from tools.
3. Return ONE item representing the food to save.
4. Always include fiber. If unknown, estimate.
5. Include references for audit (same format as meal logging).
6. ERRORS: If you cannot identify the food, set error to true, provide a reason, and set item to null.${existingAliases}`;
}
