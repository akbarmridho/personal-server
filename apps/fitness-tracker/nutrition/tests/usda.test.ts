import { describe, expect, it } from "vitest";
import { searchUsda } from "../src/search/usda.js";
import { getUsdaIndex } from "./helpers.js";

describe("USDA Search (in-memory MiniSearch)", () => {
  const usdaIndex = getUsdaIndex();

  it('search "rice white cooked" returns results with calories 100-200/100g', () => {
    const results = searchUsda(usdaIndex, "rice white cooked", 10);
    expect(results.length).toBeGreaterThan(0);
    const match = results.find((r) => r.calories >= 100 && r.calories <= 200);
    expect(match).toBeDefined();
  });

  it('search "chicken breast" returns results with protein > 20g/100g', () => {
    const results = searchUsda(usdaIndex, "chicken breast");
    expect(results.length).toBeGreaterThan(0);
    const first = results[0];
    expect(first.protein).toBeGreaterThan(20);
  });

  it("search gibberish returns empty array", () => {
    const results = searchUsda(usdaIndex, "xyzqwerty12345nonsense");
    expect(results).toEqual([]);
  });
});
