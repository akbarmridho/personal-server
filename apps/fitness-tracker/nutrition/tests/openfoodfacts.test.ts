import { describe, expect, it } from "vitest";
import { searchFoods } from "../src/search/food-db.js";
import { getFoodDb } from "./helpers.js";

describe("OpenFoodFacts Search (SQLite FTS5)", () => {
  const db = getFoodDb();

  it('search "indomie" returns results with name containing "indomie"', () => {
    const results = searchFoods(db, "indomie", {
      limit: 5,
      source: "openfoodfacts",
    });
    expect(results.length).toBeGreaterThan(0);
    const hasIndomie = results.some((r) =>
      r.name.toLowerCase().includes("indomie"),
    );
    expect(hasIndomie).toBe(true);
  });

  it("search with country filter returns only matching country", () => {
    const results = searchFoods(db, "pocari", {
      limit: 5,
      source: "openfoodfacts",
      country: "Indonesia",
    });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.country).toContain("Indonesia");
    }
  });

  it("search nonsense returns empty array", () => {
    const results = searchFoods(db, "xyzqwerty12345nonsense", {
      source: "openfoodfacts",
    });
    expect(results).toEqual([]);
  });
});
