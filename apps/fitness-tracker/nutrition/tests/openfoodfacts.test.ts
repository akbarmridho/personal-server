import { describe, expect, it } from "vitest";
import { searchOpenFoodFacts } from "./helpers.js";

describe("OpenFoodFacts API", () => {
  it('search returns results with name containing "indomie"', async () => {
    // Try multiple queries since the API can be flaky
    const queries = ["mi goreng", "indomie", "Indomie Mi Goreng"];
    let results: Awaited<ReturnType<typeof searchOpenFoodFacts>> = [];
    for (const query of queries) {
      results = await searchOpenFoodFacts(query, 5);
      if (results.length > 0) break;
    }
    expect(results.length).toBeGreaterThan(0);
    const hasIndomie = results.some((r) =>
      r.name.toLowerCase().includes("indomie"),
    );
    expect(hasIndomie).toBe(true);
  });

  it("search nonsense returns empty array", async () => {
    const results = await searchOpenFoodFacts("xyzqwerty12345nonsense");
    expect(results).toEqual([]);
  });
});
