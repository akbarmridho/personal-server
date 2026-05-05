import { describe, expect, it } from "vitest";
import type { FoodItem } from "../src/db/types.js";
import type { DaySummary, WeekSummary } from "../src/repository/stats.js";
import {
  formatMealBreakdown,
  formatMonthlySummary,
  formatWeeklySummary,
  formatWeightDelta,
} from "../src/utils/format.js";

describe("Formatters (pure functions)", () => {
  it("formatMealBreakdown with 2 items → output contains both names and correct total", () => {
    const items: FoodItem[] = [
      {
        name: "Nasi Goreng",
        description: "Fried rice",
        portion: "1 piring",
        calories: 500,
        protein_g: 10,
        carbs_g: 60,
        fat_g: 20,
        fiber_g: 5,
        references: ["usda"],
      },
      {
        name: "Es Teh",
        description: "Iced tea",
        portion: "1 gelas",
        calories: 100,
        protein_g: 0,
        carbs_g: 25,
        fat_g: 0,
        fiber_g: 0,
        references: ["estimated"],
      },
    ];
    const output = formatMealBreakdown(items);
    expect(output).toContain("Nasi Goreng");
    expect(output).toContain("Es Teh");
    expect(output).toContain("600"); // total calories
  });

  it("formatWeightDelta with previous → shows signed delta", () => {
    const output = formatWeightDelta(72, 70);
    expect(output).toContain("72.0 kg");
    expect(output).toContain("+2.0");
  });

  it("formatWeightDelta without previous → no delta shown", () => {
    const output = formatWeightDelta(72, null);
    expect(output).toContain("72.0 kg");
    expect(output).not.toContain("+");
    expect(output).not.toContain("-");
  });

  it("formatWeeklySummary → shows per-day breakdown and average", () => {
    const days: DaySummary[] = [
      {
        date: "2026-05-05",
        calories: 2000,
        proteinG: 80,
        carbsG: 250,
        fatG: 70,
        fiberG: 25,
        mealCount: 3,
      },
      {
        date: "2026-05-06",
        calories: 1800,
        proteinG: 70,
        carbsG: 220,
        fatG: 65,
        fiberG: 20,
        mealCount: 3,
      },
    ];
    const output = formatWeeklySummary(days, "Week 1");
    expect(output).toContain("2026-05-05");
    expect(output).toContain("2026-05-06");
    expect(output).toContain("Avg/day");
    expect(output).toContain("1900"); // (2000+1800)/2
  });

  it("formatMonthlySummary → shows per-week average and overall average", () => {
    const weeks: WeekSummary[] = [
      {
        weekStart: "2026-04-28",
        calories: 14000,
        proteinG: 560,
        carbsG: 1750,
        fatG: 490,
        fiberG: 150,
        days: 7,
      },
      {
        weekStart: "2026-05-05",
        calories: 10000,
        proteinG: 400,
        carbsG: 1250,
        fatG: 350,
        fiberG: 100,
        days: 5,
      },
    ];
    const output = formatMonthlySummary(weeks);
    expect(output).toContain("2026-04-28");
    expect(output).toContain("2026-05-05");
    expect(output).toContain("Overall avg");
  });
});
