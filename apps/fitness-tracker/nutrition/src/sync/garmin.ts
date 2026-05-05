import { spawn } from "node:child_process";
import { resolve } from "node:path";

export function syncGarminWeight(weight: number, date: string): void {
  const scriptPath = resolve(
    import.meta.dirname,
    "../../scripts/sync_garmin_weight.py",
  );

  const child = spawn("python3", [scriptPath, String(weight), date], {
    stdio: "ignore",
    detached: true,
  });

  child.unref();

  child.on("error", (err) => {
    console.error("Garmin sync spawn error:", err.message);
  });
}
