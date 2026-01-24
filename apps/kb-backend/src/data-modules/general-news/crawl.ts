import bigInt from "big-integer";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import LinkifyIt from "linkify-it";
import { Api, TelegramClient } from "telegram";
import { KV } from "../../infrastructure/db/kv.js";
import { env } from "../../infrastructure/env.js";
import { inngest } from "../../infrastructure/inngest.js";
import { telegramSession } from "../../infrastructure/telegram.js";
import { logger } from "../../utils/logger.js";

dayjs.extend(utc);
dayjs.extend(timezone);

// Hostname blacklist for URL filtering
const HOSTNAME_BLACKLIST = [
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "m.youtube.com",
  "bloomberg.com", // a hassle to scrape so skip
  "bloombergtechnoz.com", // a hassle to scrape
];

const getURLsFromText = (text: string): string[] => {
  const linkify = new LinkifyIt();
  linkify.normalize = (match) => {
    match.url = match.url.split("#")[0].split(":~:")[0];
    return match;
  };

  const matches = linkify.match(text) || [];

  return [...new Set<string>(matches.map((m) => m.url))];
};

const keystoneKey = "data-modules.general-news-kg";

interface Keystone {
  latestTimestamp: number;
}

interface TelegramMessage {
  id: number;
  date: number;
  message: string;
}

export const generalNewsKGCrawl = inngest.createFunction(
  {
    id: "general-news-kg-crawl",
    concurrency: 1,
  },
  // daily at 09:05 from monday to friday
  { cron: "TZ=Asia/Jakarta 55 8 * * 1-5" },
  async ({ step }) => {
    const messages = await step.run("fetch-messages", async () => {
      const latestCrawl = (await KV.get(keystoneKey)) as Keystone | null;

      const channelConfig = env.TELEGRAM_KG_CONFIG.split(",");

      const channelId = bigInt(channelConfig[0]);
      const accessHash = bigInt(channelConfig[1]);
      const topicId = Number.parseInt(channelConfig[2], 10);

      const client = new TelegramClient(
        telegramSession,
        env.TELEGRAM_API_ID,
        env.TELEGRAM_API_HASH,
        {},
      );

      if (!client.connected) {
        await client.connect();
      }

      // Fetch messages
      const result: TelegramMessage[] = [];
      const BATCH_SIZE = 100;

      // If no previous crawl, fetch all messages; otherwise fetch recent messages
      const shouldFetchAll = !latestCrawl?.latestTimestamp;
      let offsetId = 0;
      let offsetDate = 0;
      let hasMore = true;

      while (hasMore) {
        try {
          const response = await client.invoke(
            new Api.messages.GetReplies({
              peer: new Api.InputChannel({
                channelId: channelId,
                accessHash: accessHash,
              }),
              msgId: topicId,
              offsetId: offsetId,
              offsetDate: offsetDate,
              addOffset: 0,
              limit: BATCH_SIZE,
              maxId: 0,
              minId: 0,
              hash: bigInt(0),
            }),
          );

          if (!("messages" in response)) {
            break;
          }

          const messages = response.messages;

          if (messages.length === 0) {
            break;
          }

          // Process messages
          for (const msg of messages) {
            if (!("id" in msg) || !("date" in msg)) continue;

            const messageDate = msg.date;

            // If we have a previous crawl, stop when we reach older messages
            if (
              !shouldFetchAll &&
              latestCrawl?.latestTimestamp &&
              messageDate <= latestCrawl.latestTimestamp
            ) {
              hasMore = false;
              break;
            }

            const messageData: TelegramMessage = {
              id: msg.id,
              date: messageDate,
              message: "message" in msg ? msg.message : "",
            };

            result.push(messageData);
          }

          // Update pagination parameters
          const lastMessage = messages[messages.length - 1];
          if ("id" in lastMessage && "date" in lastMessage) {
            offsetId = lastMessage.id;
            offsetDate = lastMessage.date;
          }

          // If we got fewer messages than requested, we've reached the end
          if (messages.length < BATCH_SIZE) {
            hasMore = false;
          }

          // If fetching recent only and we've hit the stop condition, exit
          if (!shouldFetchAll && !hasMore) {
            break;
          }

          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          logger.error({ error }, "Error fetching messages:");
          hasMore = false;
        }
      }

      if (!client.disconnected) {
        await client.disconnect();
      }

      // Sort messages by date (oldest first) and filter out empty messages
      return result.filter((m) => !!m.message).sort((a, b) => a.date - b.date);
    });

    if (messages.length > 0) {
      // extract urls
      const messageUrls = await step.run("extract-urls", async () => {
        return messages.flatMap((message) => {
          const urls = getURLsFromText(message.message);

          // Filter out blacklisted hostnames
          const filteredUrls = urls.filter((url) => {
            try {
              const hostname = new URL(url).hostname.toLowerCase();
              return !HOSTNAME_BLACKLIST.some((blacklisted) =>
                hostname.includes(blacklisted),
              );
            } catch {
              // Invalid URL, skip it
              return false;
            }
          });

          return filteredUrls.map((e) => {
            return {
              url: e,
              message: message,
            };
          });
        });
      });

      // emit events
      if (messageUrls.length > 0) {
        await step.sendEvent(
          "queue-ingest",
          messageUrls.map((message) => {
            return {
              name: "data/general-news",
              data: {
                url: message.url,
                referenceDate: dayjs(message.message.date)
                  .tz("Asia/Jakarta")
                  .format("YYYY-MM-DD"),
              },
            };
          }),
        );
      }

      // update keystone
      await step.run("update-keystone", async () => {
        const latestTimestamp = Math.max(...messages.map((m) => m.date));
        await KV.set(keystoneKey, { latestTimestamp } satisfies Keystone);
      });
    }
  },
);
