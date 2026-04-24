import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../infrastructure/env.js";
import { logger } from "../utils/logger.js";

type JsonObject = Record<string, unknown>;

type NormalizedPosition = {
  symbol: string;
  lots: number;
  shares: number;
  available_lots: number;
  available_shares: number;
  stock_on_hand: number;
  avg: number;
  last: number;
  market_value: number;
  amount_invested: number;
  unrealized_pnl: number;
  unrealized_gain: number;
};

type NormalizedPortfolio = {
  as_of: string;
  cash: number;
  equity: number;
  invested: number;
  net_pnl: number;
  unrealized_pnl: number;
  gain: number;
  positions: NormalizedPosition[];
};

type NormalizedTradeEvent = {
  event_id: string;
  command: string;
  symbol: string;
  date: string;
  time: string;
  shares: number;
  lots: number;
  price: number;
  amount: number;
  fee: number;
  netamount: number;
  realized_amount: number;
  realized_percentage: number;
  status: string;
  display_as: string;
};

type MaterializeResult = {
  latestPortfolioPath: string | null;
  tradesPath: string;
  latestSnapshotPath: string;
  backfillStatePath: string;
  tradeEventCount: number;
  backfillFileCount: number;
};

const IGNORED_COMMANDS = new Set(["DATA FEE", "METERAI", "BEA METERAI"]);
const HISTORY_ACTION_COMMANDS = new Set([
  "BUY",
  "SELL",
  "DIVIDEND",
  "RIGHTS",
  "SPLIT",
  "REVERSE SPLIT",
]);

export function getStockbitDataRoot(): string {
  return path.resolve(env.AI_CONNECTOR_DATA_ROOT, "stockbit");
}

export async function materializeStockbitNormalizedData(): Promise<MaterializeResult> {
  const root = getStockbitDataRoot();
  const rawRoot = path.resolve(root, "raw");
  const normalizedRoot = path.resolve(root, "normalized");
  await mkdir(normalizedRoot, { recursive: true });

  const latestPortfolioRaw = await findLatestJsonFile(
    path.resolve(rawRoot, "portfolio"),
  );
  let latestPortfolioPath: string | null = null;
  if (latestPortfolioRaw) {
    const normalizedPortfolio = normalizePortfolioSnapshot(
      await readJsonObject(latestPortfolioRaw),
      latestPortfolioRaw,
    );
    latestPortfolioPath = path.resolve(normalizedRoot, "latest_portfolio.json");
    await writeJsonFileIfChanged(latestPortfolioPath, normalizedPortfolio);
  }

  const historyFiles = [
    ...(await listJsonFiles(path.resolve(rawRoot, "history"))),
    ...(await listJsonFiles(path.resolve(rawRoot, "history-backfill"))),
  ];
  const tradeEvents = await normalizeHistoryEvents(historyFiles);
  const tradesPath = path.resolve(normalizedRoot, "trades.jsonl");
  await writeJsonlFileIfChanged(tradesPath, tradeEvents);

  const latestSnapshotPath = path.resolve(
    normalizedRoot,
    "latest_snapshot.json",
  );
  await writeJsonFileIfChanged(latestSnapshotPath, {
    raw_root: rawRoot,
    latest_portfolio_raw: latestPortfolioRaw,
    history_file_count: historyFiles.length,
    trade_event_count: tradeEvents.length,
  });

  const backfillFiles = await listJsonFiles(
    path.resolve(rawRoot, "history-backfill"),
  );
  const backfillStatePath = path.resolve(normalizedRoot, "backfill_state.json");
  const backfillState: Record<string, unknown> = {
    history_backfill_sources: backfillFiles.map((filePath) =>
      path.relative(root, filePath),
    ),
    trade_event_count: tradeEvents.length,
  };
  await writeJsonFileIfChanged(backfillStatePath, backfillState);

  return {
    latestPortfolioPath,
    tradesPath,
    latestSnapshotPath,
    backfillStatePath,
    tradeEventCount: tradeEvents.length,
    backfillFileCount: backfillFiles.length,
  };
}

export async function readLatestPortfolioSnapshot(): Promise<NormalizedPortfolio> {
  const portfolioPath = path.resolve(
    getStockbitDataRoot(),
    "normalized",
    "latest_portfolio.json",
  );
  return readJsonObject(portfolioPath) as Promise<NormalizedPortfolio>;
}

export function extractTradeEventKeysFromHistoryPayload(
  payload: JsonObject,
): string[] {
  const data = payload.data as JsonObject;
  const historyGroups = data.history as JsonObject[];
  const eventIds = new Set<string>();
  let totalRawEvents = 0;
  let skippedEvents = 0;

  for (const rawGroup of historyGroups) {
    const group = rawGroup as JsonObject;
    const historyList = group.history_list as JsonObject[];
    for (const rawEvent of historyList) {
      totalRawEvents++;
      const normalized = normalizeHistoryEvent(rawEvent as JsonObject);
      if (normalized) {
        eventIds.add(normalized.event_id);
      } else {
        skippedEvents++;
      }
    }
  }

  logger.debug(
    {
      historyGroupCount: historyGroups.length,
      totalRawEvents,
      skippedEvents,
      uniqueEventIds: eventIds.size,
    },
    "stockbit extractTradeEventKeys: parsed history payload",
  );

  return Array.from(eventIds).sort();
}

async function readJsonObject(filePath: string): Promise<JsonObject> {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Expected JSON object in ${filePath}`);
  }
  return parsed as JsonObject;
}

async function writeJsonFileIfChanged(
  filePath: string,
  payload: unknown,
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const body = `${JSON.stringify(payload, null, 2)}\n`;
  await writeTextFileIfChanged(filePath, body);
}

async function writeJsonlFileIfChanged(
  filePath: string,
  rows: unknown[],
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const body = rows.map((row) => JSON.stringify(row)).join("\n");
  await writeTextFileIfChanged(filePath, body ? `${body}\n` : "");
}

async function writeTextFileIfChanged(
  filePath: string,
  body: string,
): Promise<void> {
  const existing = await readOptionalUtf8(filePath);
  if (existing === body) {
    return;
  }
  await writeFile(filePath, body, "utf8");
}

async function readOptionalUtf8(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

async function findLatestJsonFile(directory: string): Promise<string | null> {
  const files = await listJsonFiles(directory);
  return files.length > 0 ? files[files.length - 1] : null;
}

async function listJsonFiles(directory: string): Promise<string[]> {
  try {
    const directoryStat = await stat(directory);
    if (!directoryStat.isDirectory()) {
      return [];
    }
  } catch {
    return [];
  }

  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const absolutePath = path.resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listJsonFiles(absolutePath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(absolutePath);
    }
  }

  files.sort();
  return files;
}

function normalizePortfolioSnapshot(
  payload: JsonObject,
  sourcePath: string,
): NormalizedPortfolio {
  const data = ensureObject(
    payload.data,
    "Portfolio payload missing `data` object",
  );
  const summary = ensureObject(
    data.summary,
    "Portfolio payload missing `summary` object",
  );
  const results = ensureArray(
    data.results,
    "Portfolio payload missing `results` array",
  );

  const trading = objectOrEmpty(summary.trading);
  const amount = objectOrEmpty(summary.amount);
  const profitLoss = objectOrEmpty(summary.profit_loss);
  const capturedAt = parseCaptureTimestampFromPath(sourcePath);
  const asOf = path.basename(path.dirname(sourcePath));

  const positions: NormalizedPosition[] = [];
  for (const rawItem of results) {
    if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) {
      continue;
    }
    const item = rawItem as JsonObject;
    const symbol = toUpperString(item.symbol);
    if (!symbol) {
      continue;
    }

    const qty = objectOrEmpty(item.qty);
    const price = objectOrEmpty(item.price);
    const asset = objectOrEmpty(item.asset);
    const unrealised = objectOrEmpty(asset.unrealised);
    const average = objectOrEmpty(price.average);
    const balance = objectOrEmpty(qty.balance);
    const available = objectOrEmpty(qty.available);

    positions.push({
      symbol,
      lots: toNumber(balance.lot),
      shares: toNumber(balance.share),
      available_lots: toNumber(available.lot),
      available_shares: toNumber(available.share),
      stock_on_hand: toNumber(qty.stock_on_hand),
      avg: toNumber(average.price),
      last: toNumber(price.latest),
      market_value: toNumber(unrealised.market_value),
      amount_invested: toNumber(asset.amount_invested),
      unrealized_pnl: toNumber(unrealised.profit_loss),
      unrealized_gain: toNumber(unrealised.gain),
    });
  }

  return {
    as_of: /^\d{4}-\d{2}-\d{2}$/.test(asOf) ? asOf : capturedAt.slice(0, 10),
    cash: toNumber(trading.balance),
    equity: toNumber(summary.equity),
    invested: toNumber(amount.invested),
    net_pnl: toNumber(profitLoss.net),
    unrealized_pnl: toNumber(profitLoss.unrealised),
    gain: toNumber(summary.gain),
    positions,
  };
}

async function normalizeHistoryEvents(
  historyFiles: string[],
): Promise<NormalizedTradeEvent[]> {
  const deduped = new Map<string, NormalizedTradeEvent>();

  for (const filePath of historyFiles) {
    const payload = await readJsonObject(filePath);
    const data = ensureObject(
      payload.data,
      `History payload missing \`data\`: ${filePath}`,
    );
    const historyGroups = ensureArray(
      data.history,
      `History payload missing \`history\`: ${filePath}`,
    );
    for (const rawGroup of historyGroups) {
      if (
        !rawGroup ||
        typeof rawGroup !== "object" ||
        Array.isArray(rawGroup)
      ) {
        continue;
      }
      const group = rawGroup as JsonObject;
      const historyList = Array.isArray(group.history_list)
        ? group.history_list
        : [];
      for (const rawEvent of historyList) {
        if (
          !rawEvent ||
          typeof rawEvent !== "object" ||
          Array.isArray(rawEvent)
        ) {
          continue;
        }
        const normalized = normalizeHistoryEvent(rawEvent as JsonObject);
        if (!normalized) {
          continue;
        }
        if (!deduped.has(normalized.event_id)) {
          deduped.set(normalized.event_id, normalized);
        }
      }
    }
  }

  return Array.from(deduped.values()).sort((a, b) => compareTradeEvents(a, b));
}

function normalizeHistoryEvent(
  rawEvent: JsonObject,
): NormalizedTradeEvent | null {
  const command = toUpperString(rawEvent.command);
  const symbol = toUpperString(rawEvent.symbol);

  if (IGNORED_COMMANDS.has(command)) {
    return null;
  }

  if (!symbol && !HISTORY_ACTION_COMMANDS.has(command)) {
    return null;
  }

  const normalized: Omit<NormalizedTradeEvent, "event_id"> = {
    command,
    symbol,
    date: parseStockbitDate(rawEvent.date),
    time: toTrimmedString(rawEvent.time),
    shares: Math.trunc(toNumber(rawEvent.shares)),
    lots: Math.trunc(toNumber(rawEvent.lot)),
    price: toNumber(rawEvent.price),
    amount: toNumber(rawEvent.amount),
    fee: toNumber(rawEvent.fee),
    netamount: toNumber(rawEvent.netamount),
    realized_amount: toNumber(rawEvent.realized_amount),
    realized_percentage: toNumber(rawEvent.realized_percentage),
    status: toUpperString(rawEvent.status),
    display_as: toTrimmedString(rawEvent.display_as),
  };

  return {
    ...normalized,
    event_id: buildEventId(normalized),
  };
}

function buildEventId(event: Omit<NormalizedTradeEvent, "event_id">): string {
  const key = [
    event.command,
    event.symbol,
    event.date,
    event.time,
    event.shares,
    event.price,
    event.netamount,
  ].join("|");

  return createHash("sha256").update(key).digest("hex").slice(0, 20);
}

function compareTradeEvents(
  a: NormalizedTradeEvent,
  b: NormalizedTradeEvent,
): number {
  const aKey = `${a.date}|${a.time}|${a.event_id}`;
  const bKey = `${b.date}|${b.time}|${b.event_id}`;
  return aKey.localeCompare(bKey);
}

function parseStockbitDate(value: unknown): string {
  const raw = toTrimmedString(value);
  if (!raw) {
    return "";
  }

  const match = raw.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (!match) {
    throw new Error(`Unsupported Stockbit date format: ${raw}`);
  }

  const [, day, monthLabel, year] = match;
  const monthMap: Record<string, string> = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12",
  };
  const month = monthMap[monthLabel];
  if (!month) {
    throw new Error(`Unsupported Stockbit month label: ${monthLabel}`);
  }

  return `${year}-${month}-${day.padStart(2, "0")}`;
}

function parseCaptureTimestampFromPath(filePath: string): string {
  const fileName = path.basename(filePath, ".json");
  const stamp = fileName.split("_")[0];
  const parentDate = path.basename(path.dirname(filePath));
  const directoryDate = parseDirectoryDate(parentDate);

  if (directoryDate && /^\d{6}$/.test(stamp)) {
    return buildUtcTimestamp(
      directoryDate.year,
      directoryDate.month,
      directoryDate.day,
      Number.parseInt(stamp.slice(0, 2), 10),
      Number.parseInt(stamp.slice(2, 4), 10),
      Number.parseInt(stamp.slice(4, 6), 10),
    );
  }

  if (directoryDate) {
    const pageMatch = fileName.match(/page-(\d+)/i);
    if (pageMatch) {
      const pageNumber = Number.parseInt(pageMatch[1], 10);
      const secondOffset =
        Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber - 1 : 0;
      return buildUtcTimestamp(
        directoryDate.year,
        directoryDate.month,
        directoryDate.day,
        0,
        0,
        secondOffset,
      );
    }

    return buildUtcTimestamp(
      directoryDate.year,
      directoryDate.month,
      directoryDate.day,
      0,
      0,
      0,
    );
  }

  const hashedSeconds =
    Number.parseInt(
      createHash("sha256").update(filePath).digest("hex").slice(0, 8),
      16,
    ) % 86_400;
  return buildUtcTimestamp(2000, 1, 1, 0, 0, hashedSeconds);
}

function parseDirectoryDate(
  value: string,
): { year: number; month: number; day: number } | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  return {
    year: Number.parseInt(match[1], 10),
    month: Number.parseInt(match[2], 10),
    day: Number.parseInt(match[3], 10),
  };
}

function buildUtcTimestamp(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): string {
  return new Date(
    Date.UTC(year, month - 1, day, hour, minute, second),
  ).toISOString();
}

function ensureObject(value: unknown, message: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(message);
  }
  return value as JsonObject;
}

function ensureArray(value: unknown, message: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(message);
  }
  return value;
}

function objectOrEmpty(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toUpperString(value: unknown): string {
  return toTrimmedString(value).toUpperCase();
}
