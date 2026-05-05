import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeMeal } from "../src/llm/analyzer.js";
import {
  getUsdaIndex,
  retry,
  searchOpenFoodFacts,
  TEST_USER_ID,
} from "./helpers.js";

const usdaIndex = getUsdaIndex();

function loadSample(name: string): { data: Uint8Array; mediaType: string } {
  const path = resolve(import.meta.dirname, "../samples", name);
  const data = new Uint8Array(readFileSync(path));
  const ext = name.split(".").pop()?.toLowerCase();
  const mediaType =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return { data, mediaType };
}

describe("LLM Meal Analysis", () => {
  it('text "nasi goreng ayam" → error=false, 1 item, calories 300-900, references non-empty', async () => {
    const result = await retry(() =>
      analyzeMeal({
        text: "nasi goreng ayam",
        favorites: [],
        messageTimestamp: new Date(),
        usdaIndex,
        searchOpenFoodFacts,
      }),
    );
    expect(result.error).toBe(false);
    expect(result.items.length).toBe(1);
    expect(result.items[0].calories).toBeGreaterThanOrEqual(300);
    expect(result.items[0].calories).toBeLessThanOrEqual(900);
    expect(result.items[0].references.length).toBeGreaterThan(0);
  });

  it('text "nasi goreng, es teh manis" → error=false, 2 items', async () => {
    const result = await retry(() =>
      analyzeMeal({
        text: "nasi goreng, es teh manis",
        favorites: [],
        messageTimestamp: new Date(),
        usdaIndex,
        searchOpenFoodFacts,
      }),
    );
    expect(result.error).toBe(false);
    expect(result.items.length).toBe(2);
  });

  it("text with favorite match → returns exact saved values, references=['favorite']", async () => {
    const favorite = {
      id: 1,
      userId: TEST_USER_ID,
      name: "Nasi Goreng Special",
      aliases: ["nasi goreng special", "ngs"],
      calories: 550,
      proteinG: 15,
      carbsG: 70,
      fatG: 20,
      fiberG: 5,
      portion: "1 piring",
      references: ["favorite"],
      createdAt: new Date(),
    };
    const result = await retry(() =>
      analyzeMeal({
        text: "nasi goreng special",
        favorites: [favorite],
        messageTimestamp: new Date(),
        usdaIndex,
        searchOpenFoodFacts,
      }),
    );
    expect(result.error).toBe(false);
    expect(result.items.length).toBeGreaterThanOrEqual(1);
    const item = result.items.find((i) => i.name === favorite.name);
    expect(item).toBeDefined();
    expect(item!.calories).toBe(550);
    expect(item!.references).toContain("favorite");
  });

  it('text "nasi goreng lunch yesterday" with today timestamp → meal_time should be yesterday', async () => {
    const today = new Date("2026-05-05T10:00:00+07:00");
    const result = await retry(() =>
      analyzeMeal({
        text: "nasi goreng lunch yesterday",
        favorites: [],
        messageTimestamp: today,
        usdaIndex,
        searchOpenFoodFacts,
      }),
    );
    expect(result.error).toBe(false);
    expect(result.meal_time).not.toBeNull();
    const mealDate = new Date(result.meal_time!);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    expect(mealDate.getDate()).toBe(yesterday.getDate());
    expect(mealDate.getMonth()).toBe(yesterday.getMonth());
    expect(mealDate.getFullYear()).toBe(yesterday.getFullYear());
  });

  it('text "indomie goreng, save as indomie" → save_as="indomie"', async () => {
    const result = await retry(() =>
      analyzeMeal({
        text: "indomie goreng, save as indomie",
        favorites: [],
        messageTimestamp: new Date(),
        usdaIndex,
        searchOpenFoodFacts,
      }),
    );
    expect(result.error).toBe(false);
    expect(result.save_as).toBe("indomie");
  });

  it("text gibberish → error=true, reason non-empty", async () => {
    const result = await retry(() =>
      analyzeMeal({
        text: "xyzqwerty12345nonsense blabla",
        favorites: [],
        messageTimestamp: new Date(),
        usdaIndex,
        searchOpenFoodFacts,
      }),
    );
    expect(result.error).toBe(true);
    expect(result.reason).toBeTruthy();
    expect(result.items.length).toBe(0);
  });

  it("food photo from samples → error=false, items with calories > 0, references non-empty", async () => {
    const samples = [
      "20250505_131030_preview.jpeg",
      "20260428_192638_preview.jpeg",
      "20260504_182648_preview.jpeg",
    ];
    for (const sample of samples) {
      const photo = loadSample(sample);
      const result = await retry(() =>
        analyzeMeal({
          photos: [photo],
          favorites: [],
          messageTimestamp: new Date(),
          usdaIndex,
          searchOpenFoodFacts,
        }),
      );
      expect(result.error).toBe(false);
      expect(result.items.length).toBeGreaterThan(0);
      for (const item of result.items) {
        expect(item.calories).toBeGreaterThan(0);
        expect(item.references.length).toBeGreaterThan(0);
      }
    }
  });
});
