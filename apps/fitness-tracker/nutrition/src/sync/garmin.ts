import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { env } from "../infrastructure/env.js";
import { logger } from "../utils/logger.js";

export interface BodyCompData {
  weight: number;
  date: string;
  percentFat?: number | null;
  percentHydration?: number | null;
  visceralFatMass?: number | null;
  boneMass?: number | null;
  muscleMass?: number | null;
  basalMet?: number | null;
  visceralFatRating?: number | null;
  bmi?: number | null;
}

export function syncGarminBodyComp(data: BodyCompData): void {
  const scriptPath =
    env.GARMIN_SYNC_SCRIPT ??
    resolve(process.cwd(), "scripts/sync_garmin_weight.py");

  const bodyComp: Record<string, number> = {};
  if (data.percentFat != null) bodyComp.percent_fat = data.percentFat;
  if (data.percentHydration != null)
    bodyComp.percent_hydration = data.percentHydration;
  if (data.visceralFatMass != null)
    bodyComp.visceral_fat_mass = data.visceralFatMass;
  if (data.boneMass != null) bodyComp.bone_mass = data.boneMass;
  if (data.muscleMass != null) bodyComp.muscle_mass = data.muscleMass;
  if (data.basalMet != null) bodyComp.basal_met = data.basalMet;
  if (data.visceralFatRating != null)
    bodyComp.visceral_fat_rating = data.visceralFatRating;
  if (data.bmi != null) bodyComp.bmi = data.bmi;

  const args = [scriptPath, String(data.weight), data.date];
  if (Object.keys(bodyComp).length > 0) {
    args.push(JSON.stringify(bodyComp));
  }

  logger.info(
    { weight: data.weight, date: data.date, bodyComp, scriptPath },
    "garmin-sync: spawning",
  );

  const child = spawn("python3", args, {
    stdio: "ignore",
    detached: true,
  });

  child.unref();

  child.on("error", (err) => {
    logger.error({ err, data }, "garmin-sync: spawn error");
  });
}

/** Convenience wrapper for weight-only sync (backwards compat) */
export function syncGarminWeight(weight: number, date: string): void {
  syncGarminBodyComp({ weight, date });
}
