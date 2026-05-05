import { desc, eq } from "drizzle-orm";
import type { DrizzleDB } from "../db/index.js";
import { measurements } from "../db/schema.js";

export async function upsertMeasurement(
  db: DrizzleDB,
  data: typeof measurements.$inferInsert,
) {
  const [result] = await db
    .insert(measurements)
    .values(data)
    .onConflictDoUpdate({
      target: [measurements.userId, measurements.date],
      set: {
        weight: data.weight,
        bodyFatPct: data.bodyFatPct,
        bodyFatMass: data.bodyFatMass,
        skeletalMuscleMass: data.skeletalMuscleMass,
        visceralFatLevel: data.visceralFatLevel,
        bmr: data.bmr,
        totalBodyWater: data.totalBodyWater,
        bmi: data.bmi,
        fatFreeMass: data.fatFreeMass,
        smi: data.smi,
        notes: data.notes,
        updatedAt: new Date(),
      },
    })
    .returning();
  return result;
}

export async function getRecentMeasurements(
  db: DrizzleDB,
  userId: string,
  limit = 2,
) {
  return db
    .select()
    .from(measurements)
    .where(eq(measurements.userId, userId))
    .orderBy(desc(measurements.date))
    .limit(limit);
}
