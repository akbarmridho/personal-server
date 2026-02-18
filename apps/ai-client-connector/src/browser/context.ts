import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { env } from "../infrastructure/env.js";

export async function launchAutomationContext() {
  const appRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
  );
  const fallbackUserDataDir = path.resolve(appRoot, ".playwright-user-data");
  const userDataDir =
    env.PLAYWRIGHT_USER_DATA_DIR.trim() || fallbackUserDataDir;

  const contextOptions: Parameters<typeof chromium.launchPersistentContext>[1] =
    {
      headless: env.PLAYWRIGHT_HEADLESS,
    };

  const browserPath = env.PLAYWRIGHT_BROWSER_PATH?.trim();
  if (browserPath) {
    contextOptions.executablePath = browserPath;
  }

  const profileDir = env.PLAYWRIGHT_PROFILE_DIR?.trim();
  if (profileDir) {
    contextOptions.args = [
      ...(contextOptions.args ?? []),
      `--profile-directory=${profileDir}`,
    ];
  }

  return chromium.launchPersistentContext(userDataDir, contextOptions);
}
