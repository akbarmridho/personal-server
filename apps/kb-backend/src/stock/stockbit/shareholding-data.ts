import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { KV } from "../../infrastructure/db/kv.js";
import type { JsonArray } from "../../infrastructure/db/types.js";
import { getHolderTypeLabel } from "../shareholder-type.js";
import { stockbitPublicGetText } from "./client.js";

dayjs.extend(customParseFormat);

const SHAREHOLDING_DATA_URL = "https://stockbit.com/data/shareholding_data.csv";
const SHAREHOLDING_DATA_CACHE_KEY = "stock.shareholding-data.v1";
const SHAREHOLDING_DATA_CACHE_TTL_MS = 24 * 60 * 60 * 1_000;

const SHAREHOLDING_DATA_HEADERS = {
  referer: "https://stockbit.com/ownership",
  "sec-ch-ua":
    '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
};

const REQUIRED_HEADERS = [
  "DATE",
  "SHARE_CODE",
  "ISSUER_NAME",
  "INVESTOR_NAME",
  "INVESTOR_TYPE",
  "LOCAL_FOREIGN",
  "NATIONALITY",
  "DOMICILE",
  "HOLDINGS_SCRIPLESS",
  "HOLDINGS_SCRIP",
  "TOTAL_HOLDING_SHARES",
  "PERCENTAGE",
] as const;

export interface ShareholdingDataRow {
  snapshot_date: string;
  symbol: string;
  issuer_name: string;
  investor_name: string;
  investor_type_code: string | null;
  investor_type_label: string | null;
  local_foreign: "local" | "foreign" | null;
  nationality: string | null;
  domicile: string | null;
  holdings_scripless: number;
  holdings_scrip: number;
  total_holding_shares: number;
  percentage: number;
}

const parseCsvLine = (line: string) => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
};

const parseCsvTable = (content: string) => {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    throw new Error("Shareholding CSV is empty");
  }

  const header = parseCsvLine(lines[0]);
  for (const requiredHeader of REQUIRED_HEADERS) {
    if (!header.includes(requiredHeader)) {
      throw new Error(
        `Shareholding CSV is missing required header: ${requiredHeader}`,
      );
    }
  }

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    if (values.length !== header.length) {
      throw new Error(
        `Shareholding CSV row ${index + 2} has ${values.length} columns, expected ${header.length}`,
      );
    }

    return Object.fromEntries(
      header.map((key, valueIndex) => [key, values[valueIndex]]),
    );
  });
};

const normalizeString = (value: string | undefined) => {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeNumber = (value: string | undefined) => {
  const normalized = (value ?? "").replace(/,/g, "").trim();
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric value in shareholding CSV: ${value}`);
  }
  return parsed;
};

const normalizeSnapshotDate = (value: string | undefined) => {
  const raw = (value ?? "").trim();
  const parsed = dayjs(raw, "DD-MMM-YYYY", true);
  if (!parsed.isValid()) {
    throw new Error(`Invalid DATE value in shareholding CSV: ${value}`);
  }
  return parsed.format("YYYY-MM-DD");
};

const normalizeLocalForeign = (
  value: string | undefined,
): "local" | "foreign" | null => {
  const normalized = (value ?? "").trim().toUpperCase();
  if (normalized === "L") return "local";
  if (normalized === "F") return "foreign";
  return null;
};

const normalizeRow = (row: Record<string, string>): ShareholdingDataRow => {
  const investorTypeCode = normalizeString(row.INVESTOR_TYPE)?.toUpperCase() ?? null;

  return {
    snapshot_date: normalizeSnapshotDate(row.DATE),
    symbol: (row.SHARE_CODE ?? "").trim().toUpperCase(),
    issuer_name: (row.ISSUER_NAME ?? "").trim(),
    investor_name: (row.INVESTOR_NAME ?? "").trim(),
    investor_type_code: investorTypeCode,
    investor_type_label: investorTypeCode
      ? getHolderTypeLabel(investorTypeCode)
      : null,
    local_foreign: normalizeLocalForeign(row.LOCAL_FOREIGN),
    nationality: normalizeString(row.NATIONALITY),
    domicile: normalizeString(row.DOMICILE),
    holdings_scripless: normalizeNumber(row.HOLDINGS_SCRIPLESS),
    holdings_scrip: normalizeNumber(row.HOLDINGS_SCRIP),
    total_holding_shares: normalizeNumber(row.TOTAL_HOLDING_SHARES),
    percentage: normalizeNumber(row.PERCENTAGE),
  };
};

const fetchShareholdingDataRows = async (): Promise<ShareholdingDataRow[]> => {
  const rawCsv = await stockbitPublicGetText(
    SHAREHOLDING_DATA_URL,
    SHAREHOLDING_DATA_HEADERS,
  );
  const table = parseCsvTable(rawCsv);
  return table.map(normalizeRow);
};

export const getShareholdingDataRows = async (): Promise<ShareholdingDataRow[]> => {
  const expiresAt = new Date(Date.now() + SHAREHOLDING_DATA_CACHE_TTL_MS);
  const cached = await KV.getOrSet(
    SHAREHOLDING_DATA_CACHE_KEY,
    async () => (await fetchShareholdingDataRows()) as unknown as JsonArray,
    expiresAt,
  );

  if (!Array.isArray(cached)) {
    throw new Error("Invalid cached shareholding CSV payload");
  }

  return cached as unknown as ShareholdingDataRow[];
};
