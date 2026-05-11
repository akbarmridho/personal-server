import { createServer, type Server } from "node:http";
import { desc, eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { meals, measurements } from "./db/schema.js";
import { env } from "./infrastructure/env.js";
import { logger } from "./utils/logger.js";

const MEAL_FIELDS_META = {
  calories: { unit: "kcal" },
  proteinG: { unit: "g" },
  carbsG: { unit: "g" },
  fatG: { unit: "g" },
  fiberG: { unit: "g" },
} as const;

const MEASUREMENT_FIELDS_META = {
  weight: { unit: "kg" },
  bodyFatPct: { unit: "%" },
  bodyFatMass: { unit: "kg" },
  skeletalMuscleMass: { unit: "kg" },
  visceralFatLevel: { unit: "level" },
  bmr: { unit: "kcal" },
  totalBodyWater: { unit: "L" },
  bmi: { unit: "kg/m²" },
  fatFreeMass: { unit: "kg" },
  boneMass: { unit: "kg" },
  smi: { unit: "kg/m²" },
} as const;

function startExportServer(): Server {
  const server = createServer(async (req, res) => {
    if (req.method !== "GET" || req.url !== "/export") {
      res.writeHead(404);
      res.end();
      return;
    }

    try {
      const mealsQuery = db.select().from(meals);
      const measurementsQuery = db.select().from(measurements);

      if (env.EXPORT_USER_ID) {
        mealsQuery.where(eq(meals.userId, env.EXPORT_USER_ID));
        measurementsQuery.where(eq(measurements.userId, env.EXPORT_USER_ID));
      }

      const [allMeals, allMeasurements] = await Promise.all([
        mealsQuery.orderBy(desc(meals.mealTime)).limit(500),
        measurementsQuery.orderBy(desc(measurements.date)).limit(200),
      ]);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          meals: allMeals,
          measurements: allMeasurements,
          units: {
            meals: MEAL_FIELDS_META,
            measurements: MEASUREMENT_FIELDS_META,
          },
        }),
      );
    } catch (err) {
      logger.error(err, "Export endpoint error");
      res.writeHead(500);
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  });

  server.listen(env.PORT, () => {
    logger.info(`Export server listening on port ${env.PORT}`);
  });

  return server;
}

export { startExportServer };
