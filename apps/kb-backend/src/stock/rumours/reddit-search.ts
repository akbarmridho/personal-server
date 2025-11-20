import "@dotenvx/dotenvx/config";
import { Impit } from "impit";
import pRetry from "p-retry";
import { CookieJar } from "tough-cookie";
import { env } from "../../env.js";
import type { RedditDataType } from "./reddit-types.js";

const impit = new Impit({
  browser: "chrome",
  proxyUrl: env.STOCK_HTTP_PROXY_URL,
  ignoreTlsErrors: true,
  vanillaFallback: true,
  cookieJar: new CookieJar(),
});

export const getSubredditOverview = async () => {
  const data = await pRetry(
    async () => {
      const response = await impit.fetch(
        "https://www.reddit.com/r/JudiSaham/top.json?t=day",
      );

      if (response.status >= 300) {
        throw new Error(
          `[reddit] HTTP ${response.status} ${response.statusText}`,
        );
      }

      return await response.json();
    },
    { retries: 3 },
  );

  return data as RedditDataType;
};

export const getSubmission = async (permalink: string) => {
  const data = await pRetry(
    async () => {
      // Build the URL by removing trailing slash and appending .json
      const cleanPermalink = permalink.replace(/\/$/, "");
      const url = `https://www.reddit.com${cleanPermalink}.json`;
      const response = await impit.fetch(url);

      if (response.status >= 300) {
        throw new Error(
          `[reddit] HTTP ${response.status} ${response.statusText}`,
        );
      }

      return await response.json();
    },
    { retries: 3 },
  );

  return data as RedditDataType;
};
