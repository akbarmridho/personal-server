import { type Browser, chromium, type Page } from "playwright";
import { env } from "../infrastructure/env.js";

let sharedBrowser: Browser | undefined;

export type AutomationPageSession = {
  page: Page;
  close: () => Promise<void>;
};

export async function ensureAutomationBrowserConnection(): Promise<void> {
  await getSharedBrowser(env.PLAYWRIGHT_CDP_URL);
}

export async function openAutomationPage(): Promise<AutomationPageSession> {
  const cdpUrl = env.PLAYWRIGHT_CDP_URL;
  let page: Page | undefined;

  try {
    const browser = await getSharedBrowser(cdpUrl);
    const context = browser.contexts().at(0);

    if (!context) {
      throw new Error("No browser context found from CDP connection");
    }

    page = await context.newPage();

    return {
      page,
      close: async () => {
        await page?.close({ runBeforeUnload: false }).catch(() => undefined);
      },
    };
  } catch (error) {
    await page?.close({ runBeforeUnload: false }).catch(() => undefined);

    if (
      error instanceof Error &&
      (error.message.includes("ECONNREFUSED") ||
        error.message.includes("retrieving websocket url"))
    ) {
      throw new Error(
        `Cannot connect to CDP endpoint at ${cdpUrl}. Start Brave/Chromium with remote debugging enabled (for example: --remote-debugging-port=9222).`,
      );
    }

    throw error;
  }
}

async function getSharedBrowser(cdpUrl: string): Promise<Browser> {
  if (sharedBrowser?.isConnected()) {
    return sharedBrowser;
  }

  const browser = await chromium.connectOverCDP(cdpUrl);
  browser.on("disconnected", () => {
    sharedBrowser = undefined;
  });
  sharedBrowser = browser;

  return browser;
}
