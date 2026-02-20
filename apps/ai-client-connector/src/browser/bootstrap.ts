import { type ChildProcess, execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { env } from "../infrastructure/env.js";
import { logger } from "../utils/logger.js";
import { ensureAutomationBrowserConnection } from "./context.js";

const execFileAsync = promisify(execFile);
const BROWSER_STARTUP_TIMEOUT_MS = 20_000;
const BROWSER_SHUTDOWN_TIMEOUT_MS = 5_000;

let managedBrowserProcess: ChildProcess | null = null;

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

  await terminateExistingBrowser(browserPath, cdpPort, userDataDir);

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
      stdio: "ignore",
    },
  );

  managedBrowserProcess = child;
  child.once("exit", () => {
    if (managedBrowserProcess === child) {
      managedBrowserProcess = null;
    }
  });

  await waitForCdpEndpoint(cdpHealthUrl, BROWSER_STARTUP_TIMEOUT_MS);
  logger.info(
    { cdpUrl: env.PLAYWRIGHT_CDP_URL },
    "browser CDP endpoint is ready",
  );
}

export async function shutdownAutomationBrowser(): Promise<void> {
  const child = managedBrowserProcess;

  if (!child) {
    return;
  }

  const pid = child.pid;
  if (!pid) {
    managedBrowserProcess = null;
    return;
  }

  logger.info({ pid }, "stopping managed automation browser");

  child.kill("SIGTERM");
  const terminated = await waitForChildExit(child, BROWSER_SHUTDOWN_TIMEOUT_MS);

  if (!terminated) {
    logger.warn(
      { pid, timeoutMs: BROWSER_SHUTDOWN_TIMEOUT_MS },
      "managed automation browser did not stop in time, sending SIGKILL",
    );
    child.kill("SIGKILL");
    await waitForChildExit(child, BROWSER_SHUTDOWN_TIMEOUT_MS);
  }

  managedBrowserProcess = null;
}

async function terminateExistingBrowser(
  browserPath: string,
  cdpPort: number,
  userDataDir: string,
): Promise<void> {
  const debugFlag = `--remote-debugging-port=${cdpPort}`;
  const userDataFlag = `--user-data-dir=${userDataDir}`;

  logger.info(
    { browserPath, cdpPort, userDataDir },
    "checking existing automation browser process",
  );

  let stdout = "";
  try {
    const result = await execFileAsync("pgrep", ["-af", browserPath]);
    stdout = result.stdout;
  } catch (error) {
    if (isNoMatchingProcessError(error)) {
      return;
    }

    logger.warn(
      { err: error },
      "failed to inspect existing browser process, continuing",
    );
    return;
  }

  const pids = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const match = line.match(/^(\d+)\s+(.+)$/);
      if (!match) {
        return [];
      }

      const pid = match[1];
      const command = match[2].replaceAll("\\ ", " ");

      if (
        !command.includes(debugFlag) ||
        !command.includes(userDataFlag)
      ) {
        return [];
      }

      return [pid];
    });

  if (pids.length === 0) {
    return;
  }

  logger.info({ pids }, "terminating previous automation browser process");

  for (const pid of pids) {
    try {
      await execFileAsync("kill", [pid]);
    } catch (error) {
      logger.warn(
        { err: error, pid },
        "failed to terminate previous automation browser process",
      );
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

async function waitForChildExit(
  child: ChildProcess,
  timeoutMs: number,
): Promise<boolean> {
  if (child.exitCode !== null) {
    return true;
  }

  return await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);

    const onExit = () => {
      cleanup();
      resolve(true);
    };

    const cleanup = () => {
      clearTimeout(timeout);
      child.off("exit", onExit);
    };

    child.on("exit", onExit);
  });
}
