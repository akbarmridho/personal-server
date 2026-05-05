import { beforeEach, describe, expect, it } from "vitest";
import { analyzeMeal } from "../src/llm/analyzer.js";
import { createFavorite, listFavorites } from "../src/repository/favorites.js";
import { createMeals, deleteMealsByBatch } from "../src/repository/meals.js";
import { getDailyMeals } from "../src/repository/stats.js";
import {
  cleanupTestUser,
  db,
  getFoodDb,
  retry,
  TEST_USER_ID,
} from "./helpers.js";

const foodDb = getFoodDb();

describe("Full Flow (no Telegram)", () => {
  beforeEach(async () => {
    await cleanupTestUser();
  });

  it("simulate /log: analyzeMeal → createMeals → getDailyMeals → deleteMealsByBatch", async () => {
    const result = await retry(() =>
      analyzeMeal({
        text: "nasi goreng ayam",
        favorites: [],
        messageTimestamp: new Date("2026-05-05T12:00:00+07:00"),
        foodDb,
      }),
    );
    expect(result.error).toBe(false);
    expect(result.items.length).toBeGreaterThan(0);

    const batchId = "flow-batch-001";
    const mealRows = result.items.map((item) => ({
      userId: TEST_USER_ID,
      batchId,
      mealTime: new Date("2026-05-05T12:00:00+07:00"),
      name: item.name,
      description: item.description,
      portion: item.portion,
      photoFileIds: null,
      calories: item.calories,
      proteinG: item.protein_g,
      carbsG: item.carbs_g,
      fatG: item.fat_g,
      fiberG: item.fiber_g,
      references: item.references,
    }));
    await createMeals(db, mealRows);

    const daily = await getDailyMeals(db, TEST_USER_ID, "2026-05-05");
    expect(daily.length).toBe(result.items.length);

    await deleteMealsByBatch(db, batchId);
    const afterDelete = await getDailyMeals(db, TEST_USER_ID, "2026-05-05");
    expect(afterDelete.length).toBe(0);
  });

  it("simulate /log with save_as: analyzeMeal returns save_as → createFavorite → listFavorites confirms it", async () => {
    const result = await retry(() =>
      analyzeMeal({
        text: "indomie goreng, save as indomie",
        favorites: [],
        messageTimestamp: new Date(),
        foodDb,
      }),
    );
    expect(result.error).toBe(false);
    expect(result.save_as).toBeTruthy();
    expect(result.items.length).toBeGreaterThan(0);

    const firstItem = result.items[0];
    await createFavorite(db, {
      userId: TEST_USER_ID,
      name: firstItem.name,
      aliases: [result.save_as!],
      calories: firstItem.calories,
      proteinG: firstItem.protein_g,
      carbsG: firstItem.carbs_g,
      fatG: firstItem.fat_g,
      fiberG: firstItem.fiber_g,
      portion: firstItem.portion,
      references: firstItem.references,
    });

    const favorites = await listFavorites(db, TEST_USER_ID);
    expect(favorites.some((f) => f.aliases.includes(result.save_as!))).toBe(
      true,
    );
  });
});
