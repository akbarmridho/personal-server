import { describe, expect, it } from "vitest";
import { searchFoods } from "../src/search/food-db.js";
import { getFoodDb } from "./helpers.js";

describe("USDA Search (SQLite FTS5)", () => {
  const db = getFoodDb();

  it('search "rice white cooked" returns results with calories 100-200/100g', () => {
    const results = searchFoods(db, "rice white cooked", {
      limit: 10,
      source: "usda",
    });
    expect(results.length).toBeGreaterThan(0);
    const match = results.find((r) => r.calories >= 100 && r.calories <= 200);
    expect(match).toBeDefined();
  });

  it('search "chicken breast" returns results with protein > 20g/100g', () => {
    const results = searchFoods(db, "chicken breast", {
      limit: 5,
      source: "usda",
    });
    expect(results.length).toBeGreaterThan(0);
    const first = results[0];
    expect(first.protein).toBeGreaterThan(20);
  });

  it("search gibberish returns empty array", () => {
    const results = searchFoods(db, "xyzqwerty12345nonsense", {
      source: "usda",
    });
    expect(results).toEqual([]);
  });
});
