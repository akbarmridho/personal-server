import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { env } from "../infrastructure/env.js";
import { logger } from "../utils/logger.js";
import { ensureAutomationBrowserConnection } from "./context.js";

const execFileAsync = promisify(execFile);
const BROWSER_STARTUP_TIMEOUT_MS = 20_000;

export async function ensureAutomationBrowserReady(): Promise<void> {
  try {
    await ensureAutomationBrowserConnection();
    logger.info(
      { cdpUrl: env.PLAYWRIGHT_CDP_URL },
      "cdp is reachable, skipping browser restart",
    );
    return;
  } catch (error) {
    logger.info(
      { err: error, cdpUrl: env.PLAYWRIGHT_CDP_URL },
      "cdp is not reachable, restarting browser",
    );
  }

  await restartAutomationBrowser();
  await ensureAutomationBrowserConnection();
}

async function restartAutomationBrowser(): Promise<void> {
  const browserPath = env.PLAYWRIGHT_BROWSER_PATH?.trim();
  const userDataDir = env.PLAYWRIGHT_USER_DATA_DIR?.trim();
  const profileDir = env.PLAYWRIGHT_PROFILE_DIR?.trim();

  if (!browserPath || !userDataDir || !profileDir) {
    throw new Error(
      "Missing browser restart config: PLAYWRIGHT_BROWSER_PATH, PLAYWRIGHT_USER_DATA_DIR, and PLAYWRIGHT_PROFILE_DIR are required when CDP is unavailable.",
    );
  }

  const cdpPort = getCdpPortFromUrl(env.PLAYWRIGHT_CDP_URL);
  const cdpHealthUrl = new URL(
    "/json/version",
    env.PLAYWRIGHT_CDP_URL,
  ).toString();

  await terminateExistingBrowser(browserPath);

  logger.info(
    { browserPath, userDataDir, profileDir, cdpPort },
    "starting browser with remote debugging enabled",
  );

  const child = spawn(
    browserPath,
    [
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${userDataDir}`,
      `--profile-directory=${profileDir}`,
      "about:blank",
    ],
    {
      detached: true,
      stdio: "ignore",
    },
  );

  child.unref();

  await waitForCdpEndpoint(cdpHealthUrl, BROWSER_STARTUP_TIMEOUT_MS);
  logger.info(
    { cdpUrl: env.PLAYWRIGHT_CDP_URL },
    "browser CDP endpoint is ready",
  );
}

async function terminateExistingBrowser(browserPath: string): Promise<void> {
  logger.info({ browserPath }, "closing existing browser process");

  try {
    await execFileAsync("pkill", ["-f", browserPath]);
  } catch (error) {
    if (!isNoMatchingProcessError(error)) {
      logger.warn(
        { err: error },
        "failed to terminate browser process cleanly, continuing",
      );
      return;
    }
  }

  await sleep(1_000);
}

async function waitForCdpEndpoint(
  url: string,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.ok) {
        return;
      }
    } catch {
      // Endpoint not ready yet.
    }

    await sleep(500);
  }

  throw new Error(
    `CDP endpoint did not become ready within ${timeoutMs}ms: ${url}`,
  );
}

function getCdpPortFromUrl(url: string): number {
  const parsedUrl = new URL(url);
  if (parsedUrl.port) {
    return Number.parseInt(parsedUrl.port, 10);
  }

  return parsedUrl.protocol === "https:" ? 443 : 80;
}

function isNoMatchingProcessError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number | string }).code === 1
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
