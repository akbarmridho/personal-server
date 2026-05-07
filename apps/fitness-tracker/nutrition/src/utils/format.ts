import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import type { FoodItem, Meal, Measurement } from "../db/types.js";
import type { DaySummary, WeekSummary } from "../repository/stats.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = "Asia/Jakarta";

export function formatMealBreakdown(
  items: FoodItem[],
  mealTime?: Date,
): string {
  if (items.length === 0) return "No items.";

  const lines: string[] = [];

  if (mealTime) {
    const timeStr = dayjs(mealTime).tz(TZ).format("YYYY-MM-DD HH:mm");
    lines.push(`🕐 ${timeStr}`);
    lines.push("");
  }

  for (const item of items) {
    lines.push(
      `• ${item.name} (${item.portion})\n  ${item.calories} kcal | P:${item.protein_g}g C:${item.carbs_g}g F:${item.fat_g}g Fiber:${item.fiber_g}g`,
    );
  }

  const totals = items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein_g,
      carbs: acc.carbs + item.carbs_g,
      fat: acc.fat + item.fat_g,
      fiber: acc.fiber + item.fiber_g,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );

  lines.push("");
  lines.push(
    `Total: ${Math.round(totals.calories)} kcal | P:${Math.round(totals.protein)}g C:${Math.round(totals.carbs)}g F:${Math.round(totals.fat)}g Fiber:${Math.round(totals.fiber)}g`,
  );

  return lines.join("\n");
}

export function formatDailySummary(meals: Meal[], dateLabel: string): string {
  if (meals.length === 0) return `No meals logged for ${dateLabel}.`;

  const lines: string[] = [`📊 ${dateLabel}`, ""];

  let totalCal = 0,
    totalP = 0,
    totalC = 0,
    totalF = 0,
    totalFib = 0;

  for (const meal of meals) {
    const time = dayjs(meal.mealTime).tz(TZ).format("HH:mm");
    const cal = meal.calories ?? 0;
    lines.push(`${time} — ${meal.name}`);
    lines.push(
      `  ${Math.round(cal)} kcal | P:${Math.round(meal.proteinG ?? 0)}g C:${Math.round(meal.carbsG ?? 0)}g F:${Math.round(meal.fatG ?? 0)}g Fiber:${Math.round(meal.fiberG ?? 0)}g`,
    );
    totalCal += cal;
    totalP += meal.proteinG ?? 0;
    totalC += meal.carbsG ?? 0;
    totalF += meal.fatG ?? 0;
    totalFib += meal.fiberG ?? 0;
  }

  lines.push("");
  lines.push(
    `Total: ${Math.round(totalCal)} kcal | P:${Math.round(totalP)}g C:${Math.round(totalC)}g F:${Math.round(totalF)}g Fiber:${Math.round(totalFib)}g`,
  );

  return lines.join("\n");
}

export function formatWeeklySummary(
  days: DaySummary[],
  weekLabel: string,
): string {
  if (days.length === 0) return `No meals logged for ${weekLabel}.`;

  const lines: string[] = [`📊 ${weekLabel}`, ""];

  let totalCal = 0,
    totalP = 0,
    totalC = 0,
    totalF = 0,
    totalFib = 0;

  for (const day of days) {
    totalCal += day.calories;
    totalP += day.proteinG;
    totalC += day.carbsG;
    totalF += day.fatG;
    totalFib += day.fiberG;
    lines.push(
      `${day.date}: ${Math.round(day.calories)} kcal | P:${Math.round(day.proteinG)}g C:${Math.round(day.carbsG)}g F:${Math.round(day.fatG)}g Fiber:${Math.round(day.fiberG)}g`,
    );
  }

  lines.push("");
  lines.push(
    `Avg/day: ${Math.round(totalCal / days.length)} kcal | P:${Math.round(totalP / days.length)}g C:${Math.round(totalC / days.length)}g F:${Math.round(totalF / days.length)}g Fiber:${Math.round(totalFib / days.length)}g`,
  );

  return lines.join("\n");
}

export function formatMonthlySummary(weeks: WeekSummary[]): string {
  if (weeks.length === 0) return "No meals logged this month.";

  const lines: string[] = ["📊 Monthly Summary", ""];

  let totalCal = 0,
    totalDays = 0;

  for (const week of weeks) {
    if (week.days === 0) continue;
    const weekDate = dayjs(week.weekStart).format("YYYY-MM-DD");
    const avg = Math.round(week.calories / week.days);
    const avgP = Math.round(week.proteinG / week.days);
    const avgC = Math.round(week.carbsG / week.days);
    const avgF = Math.round(week.fatG / week.days);
    const avgFib = Math.round(week.fiberG / week.days);
    lines.push(
      `${weekDate}: avg ${avg} kcal/day | P:${avgP}g C:${avgC}g F:${avgF}g Fiber:${avgFib}g (${week.days} days)`,
    );
    totalCal += week.calories;
    totalDays += week.days;
  }

  if (totalDays > 0) {
    lines.push("");
    lines.push(`Overall avg: ${Math.round(totalCal / totalDays)} kcal/day`);
  }

  return lines.join("\n");
}

export function formatWeightDelta(
  weight: number,
  previousWeight: number | null,
): string {
  let msg = `⚖️ ${weight.toFixed(1)} kg`;
  if (previousWeight !== null) {
    const delta = weight - previousWeight;
    const sign = delta >= 0 ? "+" : "";
    msg += ` (${sign}${delta.toFixed(1)} kg)`;
  }
  return msg;
}

export function formatWeightTrend(
  entries: { date: string; weight: number }[],
): string {
  if (entries.length === 0) return "No weight entries logged.";

  const lines: string[] = ["⚖️ Recent Weight", ""];
  for (const entry of entries) {
    lines.push(`${entry.date}: ${entry.weight.toFixed(1)} kg`);
  }
  return lines.join("\n");
}

export function formatMeasurementComparison(
  current: Measurement,
  previous: Measurement | null,
): string {
  const lines: string[] = [`📏 Body Composition (${current.date})`, ""];

  const metrics: {
    label: string;
    value: number | null;
    prevValue: number | null;
    unit: string;
    lowerIsBetter: boolean;
  }[] = [
    {
      label: "Weight",
      value: current.weight,
      prevValue: previous?.weight ?? null,
      unit: "kg",
      lowerIsBetter: true,
    },
    {
      label: "Body Fat",
      value: current.bodyFatPct,
      prevValue: previous?.bodyFatPct ?? null,
      unit: "%",
      lowerIsBetter: true,
    },
    {
      label: "Fat Mass",
      value: current.bodyFatMass,
      prevValue: previous?.bodyFatMass ?? null,
      unit: "kg",
      lowerIsBetter: true,
    },
    {
      label: "Muscle",
      value: current.skeletalMuscleMass,
      prevValue: previous?.skeletalMuscleMass ?? null,
      unit: "kg",
      lowerIsBetter: false,
    },
    {
      label: "Visceral Fat",
      value: current.visceralFatLevel,
      prevValue: previous?.visceralFatLevel ?? null,
      unit: "",
      lowerIsBetter: true,
    },
    {
      label: "BMR",
      value: current.bmr,
      prevValue: previous?.bmr ?? null,
      unit: "kcal",
      lowerIsBetter: false,
    },
    {
      label: "BMI",
      value: current.bmi,
      prevValue: previous?.bmi ?? null,
      unit: "",
      lowerIsBetter: true,
    },
    {
      label: "Fat-Free Mass",
      value: current.fatFreeMass,
      prevValue: previous?.fatFreeMass ?? null,
      unit: "kg",
      lowerIsBetter: false,
    },
  ];

  for (const m of metrics) {
    if (m.value === null) continue;
    let line = `${m.label}: ${m.value}${m.unit ? ` ${m.unit}` : ""}`;
    if (m.prevValue !== null) {
      const delta = m.value - m.prevValue;
      if (delta === 0) {
        line += " ➖";
      } else {
        const sign = delta > 0 ? "+" : "";
        const improved = m.lowerIsBetter ? delta < 0 : delta > 0;
        line += ` (${sign}${delta.toFixed(1)}) ${improved ? "✅" : "⚠️"}`;
      }
    }
    lines.push(line);
  }

  return lines.join("\n");
}
