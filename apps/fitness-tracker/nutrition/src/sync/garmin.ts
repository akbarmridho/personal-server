import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { env } from "../infrastructure/env.js";
import { logger } from "../utils/logger.js";

export function syncGarminWeight(weight: number, date: string): void {
  const scriptPath =
    env.GARMIN_SYNC_SCRIPT ??
    resolve(process.cwd(), "scripts/sync_garmin_weight.py");

  const child = spawn("python3", [scriptPath, String(weight), date], {
    stdio: "ignore",
    detached: true,
  });

  child.unref();

  child.on("error", (err) => {
    logger.error(err, "Garmin sync spawn error");
  });
}
