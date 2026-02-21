import makeWASocket, {
  type BinaryNode,
  DisconnectReason,
  getAllBinaryNodeChildren,
  getBinaryNodeChild,
  getBinaryNodeChildBuffer,
  getBinaryNodeChildren,
  proto,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import { env } from "../infrastructure/env.js";
import {
  getWhatsAppChannelLastSuccessAt,
  setWhatsAppChannelLastSuccessAt,
} from "../infrastructure/state.js";
import { logger } from "../utils/logger.js";

const WHATSAPP_CHANNEL_INTERVAL_MS = 60 * 60 * 1000;
const WHATSAPP_LOGIN_TIMEOUT_MS = 5 * 60 * 1000;
const WHATSAPP_MESSAGE_LIMIT = 10;
const WHATSAPP_CHANNEL_EVENT_NAME = "data/whatsapp-channel-crawl";
const WHATSAPP_MESSAGE_TEXT_BLACKLIST = ["indonesian coal index"];

type WhatsAppSocket = ReturnType<typeof makeWASocket>;

type WhatsAppChannelMessagePayload = {
  server_message_id: string;
  timestamp: number;
  text: string;
};

type WhatsAppChannelEventData = {
  channel_jid: string;
  channel_name: string | null;
  fetched_at: string;
  messages: WhatsAppChannelMessagePayload[];
};

type ResolvedChannel = {
  jid: string;
  name: string | null;
};

export async function runWhatsAppChannelTaskAtStartup(): Promise<void> {
  if (
    !env.INNGEST_URL ||
    (!env.WHATSAPP_CHANNEL_JID && !env.WHATSAPP_CHANNEL_INVITE_CODE)
  ) {
    logger.info(
      {
        hasInngestUrl: Boolean(env.INNGEST_URL),
        hasChannelJid: Boolean(env.WHATSAPP_CHANNEL_JID),
        hasChannelInviteCode: Boolean(env.WHATSAPP_CHANNEL_INVITE_CODE),
      },
      "whatsapp-channel task skipped (missing configuration)",
    );
    return;
  }

  const now = new Date();
  const lastSuccessAt = await getWhatsAppChannelLastSuccessAt();

  if (lastSuccessAt) {
    const elapsedMs = now.getTime() - new Date(lastSuccessAt).getTime();
    if (elapsedMs < WHATSAPP_CHANNEL_INTERVAL_MS) {
      const nextRunAt = new Date(
        new Date(lastSuccessAt).getTime() + WHATSAPP_CHANNEL_INTERVAL_MS,
      );

      logger.info(
        {
          lastSuccessAt,
          nextRunAt: nextRunAt.toISOString(),
          intervalMs: WHATSAPP_CHANNEL_INTERVAL_MS,
          elapsedMs,
        },
        "whatsapp-channel task skipped (interval not reached)",
      );
      return;
    }
  }

  logger.info(
    {
      runAt: now.toISOString(),
      authStateDir: env.WHATSAPP_AUTH_STATE_DIR,
      hasChannelJid: Boolean(env.WHATSAPP_CHANNEL_JID),
      hasChannelInviteCode: Boolean(env.WHATSAPP_CHANNEL_INVITE_CODE),
      messageLimit: WHATSAPP_MESSAGE_LIMIT,
    },
    "whatsapp-channel task started",
  );

  try {
    const payload = await collectWhatsAppChannelPayload();

    if (payload.messages.length > 0) {
      const response = await sendToInngest(payload, env.INNGEST_URL);

      logger.info(
        {
          channelJid: payload.channel_jid,
          channelName: payload.channel_name,
          payloadCount: payload.messages.length,
          inngestResponse: response,
        },
        "whatsapp-channel task completed",
      );
    } else {
      logger.info(
        {
          channelJid: payload.channel_jid,
          channelName: payload.channel_name,
        },
        "whatsapp-channel task completed (no message to dispatch)",
      );
    }

    await setWhatsAppChannelLastSuccessAt(new Date().toISOString());
  } catch (error) {
    logger.error({ err: error }, "whatsapp-channel task failed");
  }
}

async function collectWhatsAppChannelPayload(): Promise<WhatsAppChannelEventData> {
  const socket = await openWhatsAppSocket();

  try {
    const channel = await resolveChannel(socket);
    await ensureChannelFollowed(socket, channel.jid);

    const rawResponse = await socket.newsletterFetchMessages(
      channel.jid,
      WHATSAPP_MESSAGE_LIMIT,
      0,
      0,
    );
    const messages = normalizeNewsletterMessages(rawResponse);

    return {
      channel_jid: channel.jid,
      channel_name: channel.name,
      fetched_at: new Date().toISOString(),
      messages,
    };
  } finally {
    socket.end(undefined);
  }
}

async function openWhatsAppSocket(): Promise<WhatsAppSocket> {
  const { state, saveCreds } = await useMultiFileAuthState(
    env.WHATSAPP_AUTH_STATE_DIR,
  );
  const socket = makeWASocket({
    auth: state,
    logger: logger.child({ module: "baileys" }),
    printQRInTerminal: true,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    shouldSyncHistoryMessage: () => false,
  });

  socket.ev.on("creds.update", () => {
    void saveCreds().catch((error) => {
      logger.error({ err: error }, "failed to persist WhatsApp auth creds");
    });
  });

  await waitForWhatsAppConnection(socket, WHATSAPP_LOGIN_TIMEOUT_MS);
  return socket;
}

async function waitForWhatsAppConnection(
  socket: WhatsAppSocket,
  timeoutMs: number,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          `Timed out waiting for WhatsApp login after ${timeoutMs}ms. Scan the QR in terminal and retry.`,
        ),
      );
    }, timeoutMs);

    const onUpdate = (update: {
      connection?: "close" | "connecting" | "open";
      qr?: string;
      lastDisconnect?: { error?: unknown };
    }) => {
      if (update.qr) {
        logger.info(
          "WhatsApp QR received. Scan the QR code in this terminal to login.",
        );
      }

      if (update.connection === "open") {
        cleanup();
        resolve();
        return;
      }

      if (update.connection === "close") {
        cleanup();
        const statusCode = getDisconnectStatusCode(
          update.lastDisconnect?.error,
        );
        const reason =
          statusCode === DisconnectReason.loggedOut
            ? "logged out"
            : `status=${statusCode ?? "unknown"}`;
        reject(
          new Error(`WhatsApp connection closed before ready (${reason})`),
        );
      }
    };

    const cleanup = () => {
      clearTimeout(timeout);
      socket.ev.off("connection.update", onUpdate);
    };

    socket.ev.on("connection.update", onUpdate);
  });
}

async function resolveChannel(
  socket: WhatsAppSocket,
): Promise<ResolvedChannel> {
  if (env.WHATSAPP_CHANNEL_JID) {
    const channelJid = normalizeNewsletterJid(env.WHATSAPP_CHANNEL_JID);
    const metadata = await socket.newsletterMetadata("jid", channelJid);

    return {
      jid: channelJid,
      name: metadata?.name ?? null,
    };
  }

  if (!env.WHATSAPP_CHANNEL_INVITE_CODE) {
    throw new Error("WHATSAPP_CHANNEL_INVITE_CODE is required");
  }

  const inviteCode = normalizeInviteCode(env.WHATSAPP_CHANNEL_INVITE_CODE);
  const metadata = await socket.newsletterMetadata("invite", inviteCode);

  if (!metadata?.id) {
    throw new Error("Failed to resolve WhatsApp channel metadata from invite");
  }

  return {
    jid: normalizeNewsletterJid(metadata.id),
    name: metadata.name ?? null,
  };
}

async function ensureChannelFollowed(
  socket: WhatsAppSocket,
  channelJid: string,
): Promise<void> {
  try {
    await socket.newsletterFollow(channelJid);
  } catch (error) {
    logger.warn(
      { err: error, channelJid },
      "failed to follow channel; proceeding with fetch",
    );
  }
}

function normalizeInviteCode(raw: string): string {
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    throw new Error("WHATSAPP_CHANNEL_INVITE_CODE cannot be empty");
  }

  if (!trimmed.includes("://")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const channelIndex = parts.findIndex((part) => part === "channel");
    if (channelIndex >= 0 && parts[channelIndex + 1]) {
      return parts[channelIndex + 1];
    }
  } catch {
    // fall through and return raw value
  }

  return trimmed;
}

function normalizeNewsletterJid(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new Error("WHATSAPP_CHANNEL_JID cannot be empty");
  }

  if (trimmed.endsWith("@newsletter")) {
    return trimmed;
  }

  return `${trimmed}@newsletter`;
}

function normalizeNewsletterMessages(
  input: unknown,
): WhatsAppChannelMessagePayload[] {
  const byServerMessageId = new Map<string, WhatsAppChannelMessagePayload>();
  const messageNodes = collectMessageNodes(input);

  for (const node of messageNodes) {
    const parsed = parseNewsletterMessage(node);
    if (!parsed) {
      continue;
    }

    byServerMessageId.set(parsed.server_message_id, parsed);
  }

  return [...byServerMessageId.values()]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, WHATSAPP_MESSAGE_LIMIT);
}

function collectMessageNodes(input: unknown): BinaryNode[] {
  if (!isBinaryNode(input)) {
    return [];
  }

  const directMessages = getBinaryNodeChildren(input, "message");
  const nestedMessages = getAllBinaryNodeChildren(input).flatMap((child) =>
    collectMessageNodes(child),
  );

  return [...directMessages, ...nestedMessages];
}

function parseNewsletterMessage(
  node: BinaryNode,
): WhatsAppChannelMessagePayload | null {
  const serverMessageId =
    node.attrs.server_id ?? node.attrs.message_id ?? node.attrs.id;

  if (!serverMessageId) {
    return null;
  }

  const message = decodeNewsletterMessage(node);
  if (isImageOnlyMessage(message)) {
    return null;
  }

  const text = extractMessageText(message);

  if (!text) {
    return null;
  }

  if (shouldSkipTextContent(text)) {
    return null;
  }

  return {
    server_message_id: serverMessageId,
    timestamp: parseMessageTimestamp(node.attrs.t),
    text,
  };
}

function shouldSkipTextContent(input: string): boolean {
  const normalized = input.toLowerCase();
  return WHATSAPP_MESSAGE_TEXT_BLACKLIST.some((phrase) =>
    normalized.includes(phrase),
  );
}

function isImageOnlyMessage(message: Record<string, unknown> | null): boolean {
  if (!message) {
    return false;
  }

  const imageMessage = getNestedObject(message, ["imageMessage"]);
  if (!imageMessage) {
    return false;
  }

  const hasText = Boolean(
    getNestedString(message, ["conversation"]) ||
      getNestedString(message, ["extendedTextMessage", "text"]),
  );

  return !hasText;
}

function decodeNewsletterMessage(
  node: BinaryNode,
): Record<string, unknown> | null {
  const plaintextMessage = decodePlaintextMessage(node);
  if (plaintextMessage) {
    return plaintextMessage;
  }

  if (node.content instanceof Uint8Array || Buffer.isBuffer(node.content)) {
    const webMessage = proto.WebMessageInfo.decode(
      Buffer.from(node.content),
    ).toJSON() as Record<string, unknown>;
    const nestedMessage = webMessage.message;
    if (typeof nestedMessage === "object" && nestedMessage !== null) {
      return nestedMessage as Record<string, unknown>;
    }
  }

  return null;
}

function decodePlaintextMessage(
  node: BinaryNode,
): Record<string, unknown> | null {
  const plaintextBuffer = getBinaryNodeChildBuffer(node, "plaintext");
  if (plaintextBuffer) {
    return proto.Message.decode(
      Buffer.from(plaintextBuffer),
    ).toJSON() as Record<string, unknown>;
  }

  const plaintextNode = getBinaryNodeChild(node, "plaintext");
  if (plaintextNode && typeof plaintextNode.content === "string") {
    return proto.Message.decode(
      Buffer.from(plaintextNode.content, "binary"),
    ).toJSON() as Record<string, unknown>;
  }

  return null;
}

function extractMessageText(
  message: Record<string, unknown> | null,
): string | null {
  if (!message) {
    return null;
  }

  const candidates = [
    getNestedString(message, ["conversation"]),
    getNestedString(message, ["extendedTextMessage", "text"]),
  ];

  const nestedMessage =
    getNestedObject(message, ["ephemeralMessage", "message"]) ??
    getNestedObject(message, ["viewOnceMessage", "message"]) ??
    getNestedObject(message, ["viewOnceMessageV2", "message"]) ??
    getNestedObject(message, ["viewOnceMessageV2Extension", "message"]);

  if (nestedMessage) {
    const nestedText = extractMessageText(nestedMessage);
    if (nestedText) {
      candidates.push(nestedText);
    }
  }

  for (const candidate of candidates) {
    if (typeof candidate !== "string") {
      continue;
    }

    const normalized = normalizeWhitespace(candidate);
    if (normalized.length > 0) {
      return normalized;
    }
  }

  return null;
}

function getNestedString(
  input: Record<string, unknown>,
  path: string[],
): string | undefined {
  const value = getNestedValue(input, path);
  return typeof value === "string" ? value : undefined;
}

function getNestedObject(
  input: Record<string, unknown>,
  path: string[],
): Record<string, unknown> | undefined {
  const value = getNestedValue(input, path);
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function getNestedValue(
  input: Record<string, unknown>,
  path: string[],
): unknown {
  let current: unknown = input;

  for (const key of path) {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

function parseMessageTimestamp(raw: string | undefined): number {
  if (!raw) {
    return Math.floor(Date.now() / 1000);
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return Math.floor(Date.now() / 1000);
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

async function sendToInngest(
  payload: WhatsAppChannelEventData,
  inngestUrl: string,
): Promise<unknown> {
  const response = await fetch(inngestUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: WHATSAPP_CHANNEL_EVENT_NAME,
      data: payload,
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Failed to send event: ${response.status} ${response.statusText}. Response: ${responseText}`,
    );
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return responseText;
  }
}

function getDisconnectStatusCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  if (
    "output" in error &&
    typeof error.output === "object" &&
    error.output !== null &&
    "statusCode" in error.output &&
    typeof error.output.statusCode === "number"
  ) {
    return error.output.statusCode;
  }

  return undefined;
}

function isBinaryNode(input: unknown): input is BinaryNode {
  return (
    typeof input === "object" &&
    input !== null &&
    "tag" in input &&
    "attrs" in input &&
    typeof (input as { tag?: unknown }).tag === "string" &&
    typeof (input as { attrs?: unknown }).attrs === "object"
  );
}
