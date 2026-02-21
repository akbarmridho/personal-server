import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import LinkifyIt from "linkify-it";
import { v5 as uuidv5 } from "uuid";
import { KV } from "../../infrastructure/db/kv.js";
import { inngest } from "../../infrastructure/inngest.js";
import {
  type InvestmentDocument,
  knowledgeService,
} from "../../infrastructure/knowledge-service.js";
import { extractSymbolFromTexts } from "../profiles/companies.js";
import { tagMetadata } from "../utils/tagging.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const namespace = "c8e9aea7-fde6-49c4-8be6-00c21f4971d1";
const markerPrefix = "data-modules.whatsapp-channel.marker";

type MarkerPayload = {
  lastServerMessageId: string;
  updatedAt: string;
};

type NormalizedMessage = {
  serverMessageId: string;
  serverMessageIdBigInt: bigint;
  timestamp: number;
  text: string;
};

export interface WhatsAppChannelEvent {
  channel_jid: string;
  channel_name?: string | null;
  fetched_at?: string;
  messages: Array<{
    server_message_id: string;
    timestamp: number;
    text: string;
  }>;
}

export const whatsAppChannelIngest = inngest.createFunction(
  {
    id: "whatsapp-channel-ingest",
    concurrency: 1,
  },
  { event: "data/whatsapp-channel-crawl" },
  async ({ event, step }) => {
    const channelJid = normalizeChannelJid(event.data.channel_jid);
    const channelName =
      typeof event.data.channel_name === "string" &&
      event.data.channel_name.trim().length > 0
        ? event.data.channel_name.trim()
        : null;
    const markerKey = `${markerPrefix}.${channelJid}`;

    const marker = await step.run("load-marker", async () => {
      return (await KV.get(markerKey)) as MarkerPayload | null;
    });

    const lastMarkerServerMessageId = marker?.lastServerMessageId
      ? parseServerMessageId(marker.lastServerMessageId)
      : null;

    const normalizedMessages = normalizeMessages(event.data.messages);
    const incomingCount = normalizedMessages.length;

    if (incomingCount === 0) {
      return {
        success: true,
        channelJid,
        incoming: 0,
        processed: 0,
      };
    }

    const freshMessages = normalizedMessages.filter((message) => {
      if (!lastMarkerServerMessageId) {
        return true;
      }

      return message.serverMessageIdBigInt > lastMarkerServerMessageId;
    });

    if (freshMessages.length === 0) {
      return {
        success: true,
        channelJid,
        incoming: incomingCount,
        processed: 0,
        marker: marker?.lastServerMessageId ?? null,
      };
    }

    const payload: InvestmentDocument[] = await step.run(
      "prepare-payload",
      async () => {
        const symbols = await extractSymbolFromTexts(
          freshMessages.map((message) => message.text),
        );

        const taggedPayloads = await tagMetadata(
          freshMessages.map((message, index) => ({
            date: formatDate(message.timestamp),
            content: message.text,
            title: buildTitle(message.text),
            urls: getURLsFromText(message.text),
            subindustries: [],
            subsectors: [],
            symbols: symbols[index],
            indices: [],
          })),
        );

        return taggedPayloads.map((tagged, index) => {
          const message = freshMessages[index];
          const source: Record<string, string> = {
            name: "whatsapp-channel",
          };

          if (channelName) {
            source.channel_name = channelName;
          }

          return {
            id: uuidv5(`${channelJid}:${message.serverMessageId}`, namespace),
            type: "news",
            title: tagged.title,
            content: tagged.content,
            document_date: tagged.date,
            source,
            urls: tagged.urls,
            symbols: tagged.symbols,
            subindustries: tagged.subindustries,
            subsectors: tagged.subsectors,
            indices: tagged.indices,
          } satisfies InvestmentDocument;
        });
      },
    );

    await step.run("ingest-documents", async () => {
      return await knowledgeService.ingestDocuments({
        documents: payload,
      });
    });

    const maxServerMessageId = freshMessages[freshMessages.length - 1];
    await step.run("update-marker", async () => {
      await KV.set(markerKey, {
        lastServerMessageId: maxServerMessageId.serverMessageId,
        updatedAt: new Date().toISOString(),
      } satisfies MarkerPayload);
    });

    return {
      success: true,
      channelJid,
      incoming: incomingCount,
      processed: freshMessages.length,
      marker: maxServerMessageId.serverMessageId,
    };
  },
);

function normalizeMessages(
  input: WhatsAppChannelEvent["messages"],
): NormalizedMessage[] {
  const byServerId = new Map<string, NormalizedMessage>();

  for (const item of input) {
    if (typeof item !== "object" || item === null) {
      continue;
    }

    if (typeof item.server_message_id !== "string") {
      continue;
    }

    const serverMessageId = item.server_message_id.trim();
    if (serverMessageId.length === 0) {
      continue;
    }

    const serverMessageIdBigInt = parseServerMessageId(serverMessageId);
    if (!serverMessageIdBigInt) {
      continue;
    }

    if (typeof item.text !== "string") {
      continue;
    }

    const text = normalizeWhitespace(item.text);
    if (text.length === 0) {
      continue;
    }

    const timestamp =
      typeof item.timestamp === "number" &&
      Number.isFinite(item.timestamp) &&
      item.timestamp > 0
        ? Math.floor(item.timestamp)
        : Math.floor(Date.now() / 1000);

    byServerId.set(serverMessageId, {
      serverMessageId,
      serverMessageIdBigInt,
      timestamp,
      text,
    });
  }

  return [...byServerId.values()].sort((a, b) => {
    if (a.serverMessageIdBigInt > b.serverMessageIdBigInt) {
      return 1;
    }

    if (a.serverMessageIdBigInt < b.serverMessageIdBigInt) {
      return -1;
    }

    return 0;
  });
}

function parseServerMessageId(value: string): bigint | null {
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function normalizeChannelJid(input: string): string {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    throw new Error("channel_jid is required");
  }

  if (trimmed.endsWith("@newsletter")) {
    return trimmed;
  }

  return `${trimmed}@newsletter`;
}

function formatDate(timestamp: number): string {
  return dayjs.unix(timestamp).tz("Asia/Jakarta").format("YYYY-MM-DD");
}

function buildTitle(text: string): string {
  const [firstLine = ""] = text.split("\n");
  const normalized = normalizeWhitespace(firstLine);
  if (normalized.length === 0) {
    return "WhatsApp Channel Update";
  }

  return normalized.slice(0, 180);
}

function getURLsFromText(text: string): string[] {
  const linkify = new LinkifyIt();
  linkify.normalize = (match) => {
    match.url = match.url.split("#")[0].split(":~:")[0];
    return match;
  };

  const matches = linkify.match(text) || [];
  return [...new Set<string>(matches.map((match) => match.url))];
}
