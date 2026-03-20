import bigInt from "big-integer";
import LinkifyIt from "linkify-it";
import { Api, TelegramClient } from "telegram";
import { KV } from "../../infrastructure/db/kv.js";
import { env } from "../../infrastructure/env.js";
import { inngest } from "../../infrastructure/inngest.js";
import { telegramSession } from "../../infrastructure/telegram.js";
import { logger } from "../../utils/logger.js";
import { PHINTRACO_TELEGRAM_CRAWL_CRON } from "../schedule.js";

export interface PhintracoTelegramMessage {
  id: number;
  date: string;
  editDate: string | null;
  text: string;
  urls: string[];
  views: number | null;
  forwards: number | null;
  groupedId: string | null;
  replyToMsgId: number | null;
  hasMedia: boolean;
}

export type PhintracoTelegramFilterReason =
  | "keep_broker_research"
  | "keep_market_commentary"
  | "keep_tactical_setup"
  | "skip_empty_media"
  | "skip_ticker_only"
  | "skip_short_stub"
  | "skip_first_session_update"
  | "skip_fixed_income_report"
  | "skip_economic_calendar"
  | "skip_ca_reminder"
  | "skip_stock_information"
  | "skip_reminder_noise"
  | "skip_title_card"
  | "skip_marketing"
  | "skip_unclassified";

export interface PhintracoTelegramEvaluatedMessage
  extends PhintracoTelegramMessage {
  firstLine: string;
  contentUrls: string[];
  canonicalUrls: string[];
  include: boolean;
  filterReason: PhintracoTelegramFilterReason;
}

const SELF_HOST_URL_BLACKLIST = [
  "www.phintracosekuritas.com",
  "phintracosekuritas.com",
  "www.profits.co.id",
  "profits.co.id",
];

const MARKETING_PATTERNS = [
  /^live now/i,
  /^market preview/i,
  /^phintar\b/i,
  /phintar/i,
  /^produktif\b/i,
  /^exist\b/i,
  /^bisa\b/i,
  /^\[hari ini/i,
  /^\[satu hari lagi/i,
  /^halo, sahabat profits/i,
  /^telah hadir/i,
  /^penasaran dengan single stock futures/i,
  /mini bootcamp/i,
  /ingin belajar/i,
  /profits anywhere/i,
];

const BROKER_RESEARCH_PATTERNS = [
  /^phintraco sekuritas company update/i,
  /^phintraco sekuritas company flash/i,
  /^phintraco sekuritas initiate report/i,
  /^phintraco sekuritas sector update/i,
  /^macro flash/i,
  /^phintraco sekuritas notes\b/i,
];

const MARKET_COMMENTARY_PATTERNS = [
  /^good morning[,!]?/i,
  /^phintas daily : domestic market review/i,
  /^phintas daily : global market review/i,
  /^phintas weekly : market review/i,
  /^ihsg ditutup/i,
  /^sentimen /i,
  /^kenaikan harga minyak/i,
  /^harga minyak/i,
  /^kekhawatiran/i,
];

const TACTICAL_SETUP_PATTERNS = [
  /\btrading buy\b/i,
  /\bbuy on support\b/i,
  /\bon support\b/i,
  /\bentry area\b/i,
  /\bre-?test ma20\b/i,
  /\bbase formation potential\b/i,
  /\bre[\s-]?entry\b/i,
];

function parsePhConfig(config: string): {
  channelId: ReturnType<typeof bigInt>;
  accessHash: ReturnType<typeof bigInt>;
} {
  const trimmed = config.trim();

  if (!trimmed) {
    throw new Error("TELEGRAM_PH_CONFIG is required");
  }

  const [channelIdRaw, accessHashRaw] = trimmed.split(",").map((v) => v.trim());

  if (!channelIdRaw || !accessHashRaw) {
    throw new Error(
      "TELEGRAM_PH_CONFIG must be formatted as <channel_id>,<access_hash>",
    );
  }

  return {
    channelId: bigInt(channelIdRaw),
    accessHash: bigInt(accessHashRaw),
  };
}

function extractUrls(text: string): string[] {
  if (!text) {
    return [];
  }

  const linkify = new LinkifyIt();
  linkify.normalize = (match) => {
    match.url = match.url.split("#")[0].split(":~:")[0];
    return match;
  };

  return [...new Set((linkify.match(text) || []).map((match) => match.url))];
}

function normalizeText(value: string): string {
  return value.replace(/\u00a0/g, " ").trim();
}

function getFirstLine(text: string): string {
  return normalizeText(text.split("\n")[0] || "");
}

function getContentUrls(urls: string[]): string[] {
  return urls.filter((url) => {
    try {
      const normalized = url.startsWith("http") ? url : `https://${url}`;
      const hostname = new URL(normalized).hostname.toLowerCase();
      return !SELF_HOST_URL_BLACKLIST.includes(hostname);
    } catch {
      return false;
    }
  });
}

function getCanonicalUrls(urls: string[]): string[] {
  return urls.filter((url) => {
    try {
      const normalized = url.startsWith("http") ? url : `https://${url}`;
      const parsed = new URL(normalized);
      return (
        parsed.hostname.toLowerCase().includes("phintracosekuritas.com") &&
        parsed.pathname !== "/" &&
        parsed.pathname !== ""
      );
    } catch {
      return false;
    }
  });
}

function isTickerOnly(text: string): boolean {
  const normalized = normalizeText(text);
  return /^[A-Za-z]{4,5}$/.test(normalized);
}

export function evaluatePhintracoTelegramMessage(
  message: PhintracoTelegramMessage,
): PhintracoTelegramEvaluatedMessage {
  const text = normalizeText(message.text);
  const firstLine = getFirstLine(text);
  const contentUrls = getContentUrls(message.urls);
  const canonicalUrls = getCanonicalUrls(message.urls);

  let include = false;
  let filterReason: PhintracoTelegramFilterReason = "skip_unclassified";

  if (!text && message.hasMedia) {
    filterReason = "skip_empty_media";
  } else if (!text || text.length <= 8) {
    filterReason = isTickerOnly(text) ? "skip_ticker_only" : "skip_short_stub";
  } else if (/^https?:\/\//i.test(firstLine)) {
    filterReason = "skip_short_stub";
  } else if (/^ihsg - first session update/i.test(firstLine)) {
    filterReason = "skip_first_session_update";
  } else if (/fixed income report/i.test(firstLine)) {
    filterReason = "skip_fixed_income_report";
  } else if (
    /^(update economic calendar|upcoming (global )?economic calendar)/i.test(
      firstLine,
    )
  ) {
    filterReason = "skip_economic_calendar";
  } else if (/^phintas daily : ca reminder/i.test(firstLine)) {
    filterReason = "skip_ca_reminder";
  } else if (/^stock information/i.test(firstLine)) {
    filterReason = "skip_stock_information";
  } else if (
    /^update\b[:! ]*/i.test(firstLine) &&
    /(target|support|resistance|achieved|disclaimer on)/i.test(text)
  ) {
    filterReason = "skip_reminder_noise";
  } else if (
    /(on track|target achieved|first target|second target)/i.test(firstLine)
  ) {
    filterReason = "skip_reminder_noise";
  } else if (/^reminder\b/i.test(firstLine)) {
    filterReason = "skip_reminder_noise";
  } else if (/^today'?s selective shares\b/i.test(firstLine)) {
    filterReason = "skip_title_card";
  } else if (MARKETING_PATTERNS.some((pattern) => pattern.test(firstLine))) {
    filterReason = "skip_marketing";
  } else if (
    BROKER_RESEARCH_PATTERNS.some((pattern) => pattern.test(firstLine))
  ) {
    include = true;
    filterReason = "keep_broker_research";
  } else if (
    TACTICAL_SETUP_PATTERNS.some((pattern) => pattern.test(text)) &&
    text.length >= 120
  ) {
    include = true;
    filterReason = "keep_tactical_setup";
  } else if (
    MARKET_COMMENTARY_PATTERNS.some((pattern) => pattern.test(firstLine)) ||
    text.length >= 700
  ) {
    include = true;
    filterReason = "keep_market_commentary";
  }

  return {
    ...message,
    firstLine,
    contentUrls,
    canonicalUrls,
    include,
    filterReason,
  };
}

export function evaluatePhintracoTelegramMessages(
  messages: PhintracoTelegramMessage[],
): PhintracoTelegramEvaluatedMessage[] {
  return messages.map(evaluatePhintracoTelegramMessage);
}

export async function fetchLatestPhintracoTelegramMessages(
  limit = 400,
): Promise<PhintracoTelegramMessage[]> {
  const { channelId, accessHash } = parsePhConfig(env.TELEGRAM_PH_CONFIG);

  const client = new TelegramClient(
    telegramSession,
    env.TELEGRAM_API_ID,
    env.TELEGRAM_API_HASH,
    {
      connectionRetries: 5,
    },
  );

  try {
    await client.connect();

    const peer = new Api.InputChannel({
      channelId,
      accessHash,
    });

    const collected: Api.Message[] = [];
    let page = 0;

    for await (const message of client.iterMessages(peer, { limit })) {
      if (!(message instanceof Api.Message)) {
        continue;
      }

      collected.push(message);

      if (collected.length % 100 === 0 || collected.length === limit) {
        page += 1;
        logger.info(
          {
            page,
            collected: collected.length,
            latestMessageId: collected[0]?.id ?? null,
            oldestMessageId: collected.at(-1)?.id ?? null,
          },
          "Fetched Phintraco Telegram messages via iterMessages",
        );
      }
    }

    return collected.map((message) => {
      const text = message.message || "";

      return {
        id: message.id,
        date: new Date(message.date * 1000).toISOString(),
        editDate: message.editDate
          ? new Date(message.editDate * 1000).toISOString()
          : null,
        text,
        urls: extractUrls(text),
        views: message.views ?? null,
        forwards: message.forwards ?? null,
        groupedId: message.groupedId ? message.groupedId.toString() : null,
        replyToMsgId: message.replyTo?.replyToMsgId ?? null,
        hasMedia: Boolean(message.media),
      };
    });
  } finally {
    if (!client.disconnected) {
      await client.disconnect();
    }
  }
}

const keystoneKey = "data-modules.phintraco-telegram";

interface Keystone {
  latestMessageId: number;
}

export const phintracoTelegramCrawl = inngest.createFunction(
  {
    id: "phintraco-telegram-crawl",
    concurrency: 1,
  },
  { cron: PHINTRACO_TELEGRAM_CRAWL_CRON },
  async ({ step }) => {
    const latestCrawl = await step.run("load-keystone", async () => {
      return (await KV.get(keystoneKey)) as Keystone | null;
    });

    const evaluatedMessages = await step.run("fetch-and-filter", async () => {
      const messages = await fetchLatestPhintracoTelegramMessages(
        latestCrawl === null ? 400 : 100,
      );
      return evaluatePhintracoTelegramMessages(messages);
    });

    const freshIncludedMessages = evaluatedMessages
      .filter((message) => message.include)
      .filter((message) => {
        if (!latestCrawl?.latestMessageId) {
          return true;
        }
        return message.id! > latestCrawl.latestMessageId;
      })
      .sort((a, b) => a.id! - b.id!);

    if (freshIncludedMessages.length > 0) {
      await step.sendEvent(
        "queue-ingest",
        freshIncludedMessages.map((message) => {
          return {
            name: "data/phintraco-telegram-ingest",
            data: {
              message: { ...message, id: message.id! },
            },
          };
        }),
      );
    }

    const latestSeenMessageId = evaluatedMessages[0]?.id ?? null;

    if (latestSeenMessageId) {
      await step.run("update-keystone", async () => {
        await KV.set(keystoneKey, {
          latestMessageId: latestSeenMessageId,
        } satisfies Keystone);
      });
    }
  },
);
