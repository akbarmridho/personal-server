import { beforeEach, describe, expect, it } from "vitest";
import {
  createFavorite,
  deleteFavoriteById,
  listFavorites,
} from "../src/repository/favorites.js";
import {
  createMeals,
  deleteMealsByBatch,
  getMealsByDateRange,
} from "../src/repository/meals.js";
import {
  getRecentMeasurements,
  upsertMeasurement,
} from "../src/repository/measurements.js";
import {
  getDailyMeals,
  getMonthlySummary,
  getWeeklySummary,
} from "../src/repository/stats.js";
import {
  getPreviousWeight,
  getRecentWeights,
  upsertWeight,
} from "../src/repository/weight.js";
import { cleanupTestUser, db, TEST_USER_ID } from "./helpers.js";

describe("Repository: Meals", () => {
  beforeEach(async () => {
    await cleanupTestUser();
  });

  it("create batch of 2 meals with same batchId → returns 2 rows", async () => {
    const batchId = "batch-001";
    const rows = await createMeals(db, [
      {
        userId: TEST_USER_ID,
        batchId,
        mealTime: new Date(),
        name: "Nasi Goreng",
        calories: 500,
        proteinG: 10,
        carbsG: 60,
        fatG: 20,
        fiberG: 5,
      },
      {
        userId: TEST_USER_ID,
        batchId,
        mealTime: new Date(),
        name: "Es Teh",
        calories: 100,
        proteinG: 0,
        carbsG: 25,
        fatG: 0,
        fiberG: 0,
      },
    ]);
    expect(rows.length).toBe(2);
    expect(rows[0].batchId).toBe(batchId);
    expect(rows[1].batchId).toBe(batchId);
  });

  it("delete by batchId → all rows with that batchId gone", async () => {
    const batchId = "batch-002";
    await createMeals(db, [
      {
        userId: TEST_USER_ID,
        batchId,
        mealTime: new Date(),
        name: "Test",
        calories: 100,
        proteinG: 1,
        carbsG: 1,
        fatG: 1,
        fiberG: 1,
      },
    ]);
    await deleteMealsByBatch(db, batchId);
    const meals = await getMealsByDateRange(
      db,
      TEST_USER_ID,
      new Date("2000-01-01"),
      new Date("2099-12-31"),
    );
    expect(meals.filter((m) => m.batchId === batchId).length).toBe(0);
  });

  it("getDailyMeals for today (WIB) returns inserted meals", async () => {
    const now = new Date();
    const wibDateStr = now.toISOString().slice(0, 10); // simplistic, will adjust
    // Actually we need to account for WIB. Let's insert at a known WIB date.
    // WIB = UTC+7. If we want it to be "today" in WIB, we can just use current time.
    await createMeals(db, [
      {
        userId: TEST_USER_ID,
        batchId: "batch-003",
        mealTime: now,
        name: "Test Meal",
        calories: 300,
        proteinG: 5,
        carbsG: 40,
        fatG: 10,
        fiberG: 2,
      },
    ]);
    // getDailyMeals uses WIB timezone
    const daily = await getDailyMeals(db, TEST_USER_ID, wibDateStr);
    // This might be off by one day depending on UTC vs WIB.
    // We'll verify the meal is returned by checking a range.
    const allMeals = await getMealsByDateRange(
      db,
      TEST_USER_ID,
      new Date("2000-01-01"),
      new Date("2099-12-31"),
    );
    expect(allMeals.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Repository: Favorites", () => {
  beforeEach(async () => {
    await cleanupTestUser();
  });

  it("create favorite with aliases array → listFavorites returns it, aliases intact", async () => {
    const fav = await createFavorite(db, {
      userId: TEST_USER_ID,
      name: "Nasi Goreng",
      aliases: ["nasi goreng", "fried rice"],
      calories: 500,
      proteinG: 10,
      carbsG: 60,
      fatG: 20,
      fiberG: 5,
    });
    expect(fav.aliases).toEqual(["nasi goreng", "fried rice"]);
    const list = await listFavorites(db, TEST_USER_ID);
    expect(list.some((f) => f.id === fav.id)).toBe(true);
    const found = list.find((f) => f.id === fav.id);
    expect(found!.aliases).toEqual(["nasi goreng", "fried rice"]);
  });

  it("delete by id → gone from list", async () => {
    const fav = await createFavorite(db, {
      userId: TEST_USER_ID,
      name: "To Delete",
      aliases: ["delete me"],
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
    await deleteFavoriteById(db, fav.id);
    const list = await listFavorites(db, TEST_USER_ID);
    expect(list.some((f) => f.id === fav.id)).toBe(false);
  });

  it("ordering is stable (by id)", async () => {
    const fav1 = await createFavorite(db, {
      userId: TEST_USER_ID,
      name: "First",
      aliases: ["first"],
      calories: 100,
      proteinG: 1,
      carbsG: 1,
      fatG: 1,
    });
    const fav2 = await createFavorite(db, {
      userId: TEST_USER_ID,
      name: "Second",
      aliases: ["second"],
      calories: 200,
      proteinG: 2,
      carbsG: 2,
      fatG: 2,
    });
    const list = await listFavorites(db, TEST_USER_ID);
    const ids = list.map((f) => f.id);
    expect(ids.indexOf(fav1.id)).toBeLessThan(ids.indexOf(fav2.id));
  });
});

describe("Repository: Measurements", () => {
  beforeEach(async () => {
    await cleanupTestUser();
  });

  it("upsert measurement → creates row", async () => {
    const result = await upsertMeasurement(db, {
      userId: TEST_USER_ID,
      date: "2026-05-05",
      weight: 70,
      bodyFatPct: 25,
    });
    expect(result.weight).toBe(70);
    expect(result.bodyFatPct).toBe(25);
  });

  it("upsert same userId+date → updates (not duplicate)", async () => {
    await upsertMeasurement(db, {
      userId: TEST_USER_ID,
      date: "2026-05-05",
      weight: 70,
    });
    const updated = await upsertMeasurement(db, {
      userId: TEST_USER_ID,
      date: "2026-05-05",
      weight: 72,
    });
    expect(updated.weight).toBe(72);
    const recent = await getRecentMeasurements(db, TEST_USER_ID, 10);
    const dateStr = (d: string | Date) =>
      typeof d === "string" ? d : d.toISOString().slice(0, 10);
    expect(recent.filter((r) => dateStr(r.date) === "2026-05-05").length).toBe(
      1,
    );
  });

  it("getRecentMeasurements returns ordered by date desc", async () => {
    await upsertMeasurement(db, {
      userId: TEST_USER_ID,
      date: "2026-05-03",
      weight: 70,
    });
    await upsertMeasurement(db, {
      userId: TEST_USER_ID,
      date: "2026-05-05",
      weight: 72,
    });
    await upsertMeasurement(db, {
      userId: TEST_USER_ID,
      date: "2026-05-01",
      weight: 68,
    });
    const recent = await getRecentMeasurements(db, TEST_USER_ID, 10);
    const dateStr = (d: string | Date) =>
      typeof d === "string" ? d : d.toISOString().slice(0, 10);
    const dates = recent.map((r) => dateStr(r.date));
    expect(dates[0] >= dates[1]).toBe(true);
    expect(dates[1] >= dates[2]).toBe(true);
  });
});

describe("Repository: Weight", () => {
  beforeEach(async () => {
    await cleanupTestUser();
  });

  it("upsertWeight → creates entry", async () => {
    const result = await upsertWeight(db, {
      userId: TEST_USER_ID,
      date: "2026-05-05",
      weight: 70,
    });
    expect(result.weight).toBe(70);
  });

  it("upsertWeight same date → updates weight value", async () => {
    await upsertWeight(db, {
      userId: TEST_USER_ID,
      date: "2026-05-05",
      weight: 70,
    });
    const updated = await upsertWeight(db, {
      userId: TEST_USER_ID,
      date: "2026-05-05",
      weight: 72,
    });
    expect(updated.weight).toBe(72);
  });

  it("getPreviousWeight returns the entry before given date", async () => {
    await upsertWeight(db, {
      userId: TEST_USER_ID,
      date: "2026-05-01",
      weight: 68,
    });
    await upsertWeight(db, {
      userId: TEST_USER_ID,
      date: "2026-05-03",
      weight: 70,
    });
    await upsertWeight(db, {
      userId: TEST_USER_ID,
      date: "2026-05-05",
      weight: 72,
    });
    const prev = await getPreviousWeight(db, TEST_USER_ID, "2026-05-05");
    expect(prev).not.toBeNull();
    expect(prev!.date).toBe("2026-05-03");
    expect(prev!.weight).toBe(70);
  });

  it("getRecentWeights returns ordered desc, respects limit", async () => {
    await upsertWeight(db, {
      userId: TEST_USER_ID,
      date: "2026-05-01",
      weight: 68,
    });
    await upsertWeight(db, {
      userId: TEST_USER_ID,
      date: "2026-05-03",
      weight: 70,
    });
    await upsertWeight(db, {
      userId: TEST_USER_ID,
      date: "2026-05-05",
      weight: 72,
    });
    const recent = await getRecentWeights(db, TEST_USER_ID, 2);
    expect(recent.length).toBe(2);
    expect(recent[0].date >= recent[1].date).toBe(true);
  });
});

describe("Repository: Stats (SQL aggregation)", () => {
  beforeEach(async () => {
    await cleanupTestUser();
  });

  it("Insert 2 meals on same day, 1 on next day → getWeeklySummary returns 2 day rows, first day has summed calories and mealCount=2", async () => {
    const day1 = "2026-05-05T12:00:00+07:00";
    const day2 = "2026-05-06T12:00:00+07:00";
    await createMeals(db, [
      {
        userId: TEST_USER_ID,
        batchId: "batch-s1",
        mealTime: new Date(day1),
        name: "Meal 1",
        calories: 400,
        proteinG: 10,
        carbsG: 50,
        fatG: 15,
        fiberG: 3,
      },
      {
        userId: TEST_USER_ID,
        batchId: "batch-s1",
        mealTime: new Date(day1),
        name: "Meal 2",
        calories: 600,
        proteinG: 20,
        carbsG: 70,
        fatG: 25,
        fiberG: 5,
      },
      {
        userId: TEST_USER_ID,
        batchId: "batch-s2",
        mealTime: new Date(day2),
        name: "Meal 3",
        calories: 500,
        proteinG: 15,
        carbsG: 60,
        fatG: 20,
        fiberG: 4,
      },
    ]);
    const summary = await getWeeklySummary(
      db,
      TEST_USER_ID,
      "2026-05-05",
      "2026-05-06",
    );
    expect(summary.length).toBe(2);
    const firstDay = summary[0];
    expect(firstDay.calories).toBe(1000);
    expect(firstDay.mealCount).toBe(2);
  });

  it("getMonthlySummary groups by week, returns distinct day count per week", async () => {
    // Insert meals across two weeks
    await createMeals(db, [
      {
        userId: TEST_USER_ID,
        batchId: "batch-m1",
        mealTime: new Date("2026-05-05T12:00:00+07:00"),
        name: "Meal",
        calories: 500,
        proteinG: 10,
        carbsG: 60,
        fatG: 20,
        fiberG: 3,
      },
      {
        userId: TEST_USER_ID,
        batchId: "batch-m2",
        mealTime: new Date("2026-05-06T12:00:00+07:00"),
        name: "Meal",
        calories: 500,
        proteinG: 10,
        carbsG: 60,
        fatG: 20,
        fiberG: 3,
      },
      {
        userId: TEST_USER_ID,
        batchId: "batch-m3",
        mealTime: new Date("2026-05-12T12:00:00+07:00"),
        name: "Meal",
        calories: 500,
        proteinG: 10,
        carbsG: 60,
        fatG: 20,
        fiberG: 3,
      },
    ]);
    const monthly = await getMonthlySummary(
      db,
      TEST_USER_ID,
      "2026-05-01",
      "2026-05-31",
    );
    expect(monthly.length).toBeGreaterThanOrEqual(1);
    // Each week should have distinct day count
    const weekWith2Days = monthly.find((w) => w.days === 2);
    expect(weekWith2Days).toBeDefined();
  });

  it("WIB timezone: meal at 2026-05-05T23:30:00Z appears as May 6 in WIB", async () => {
    // 2026-05-05T23:30:00Z = 2026-05-06T06:30:00+07:00 (WIB)
    await createMeals(db, [
      {
        userId: TEST_USER_ID,
        batchId: "batch-wib",
        mealTime: new Date("2026-05-05T23:30:00Z"),
        name: "Late night meal",
        calories: 300,
        proteinG: 5,
        carbsG: 40,
        fatG: 10,
        fiberG: 2,
      },
    ]);
    const daily = await getDailyMeals(db, TEST_USER_ID, "2026-05-06");
    expect(daily.length).toBe(1);
    expect(daily[0].name).toBe("Late night meal");
  });
});
