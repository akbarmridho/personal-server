import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { tool } from "@opencode-ai/plugin";
import { readLatestPortfolio, withPortfolioWeights } from "./portfolio.ts";

type FrontmatterRecord = Record<string, unknown> & {
  id?: string;
  file: string;
  warnings?: string[];
};

type SymbolRecord = FrontmatterRecord & {
  id?: string;
  watchlist_status?: string;
  trade_classification?: string;
  holding_mode?: string;
  thesis_id?: string | null;
  last_reviewed?: string;
  next_review?: string | null;
  leader?: boolean;
  tags?: unknown[];
};

type ThesisRecord = FrontmatterRecord & {
  id?: string;
  scope?: string;
  title?: string;
  type?: string;
  parent_thesis_id?: string | null;
  status?: string;
  symbols?: unknown[];
  last_updated?: string;
  tags?: unknown[];
};

type RequestedType =
  | "symbols"
  | "symbol"
  | "theses"
  | "thesis"
  | "watchlist"
  | "portfolio-monitor";

const SYMBOL_REQUIRED_FIELDS = [
  "id",
  "watchlist_status",
  "trade_classification",
  "holding_mode",
  "thesis_id",
  "last_reviewed",
  "next_review",
  "leader",
  "tags",
];

const THESIS_REQUIRED_FIELDS = [
  "id",
  "scope",
  "title",
  "type",
  "parent_thesis_id",
  "status",
  "symbols",
  "last_updated",
  "tags",
];

export default tool({
  description:
    "Read durable symbol/thesis state from live markdown frontmatter and derive watchlist or portfolio-monitor views on demand.",
  args: {
    types: tool.schema
      .array(tool.schema.string())
      .default(["symbols", "theses"])
      .describe(
        "Requested state views. Supported values: symbols, symbol, theses, thesis, watchlist, portfolio-monitor.",
      ),
    ids: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe(
        "Optional symbol/thesis IDs to filter. Required when requesting singular symbol or thesis.",
      ),
  },
  async execute(args, context) {
    const requestedTypes = normalizeRequestedTypes(args.types);
    const ids = new Set(
      (args.ids ?? [])
        .map((id) => id.trim())
        .filter(Boolean)
        .map((id) => id.toUpperCase()),
    );

    if (
      requestedTypes.some((type) => type === "symbol" || type === "thesis") &&
      ids.size === 0
    ) {
      throw new Error("ids is required when requesting symbol or thesis");
    }

    const payload: Record<string, unknown> = {};

    const shouldReadSymbols = requestedTypes.some((type) =>
      ["symbols", "symbol", "watchlist", "portfolio-monitor"].includes(type),
    );
    const shouldReadTheses = requestedTypes.some((type) =>
      ["theses", "thesis"].includes(type),
    );

    const symbolRecords = shouldReadSymbols
      ? await loadSymbolRecords(context.directory)
      : [];
    const thesisRecords = shouldReadTheses
      ? await loadThesisRecords(context.directory)
      : [];

    for (const requestedType of requestedTypes) {
      if (requestedType === "symbols") {
        payload.symbols = ids.size
          ? symbolRecords.filter((record) =>
              ids.has((record.id ?? "").toUpperCase()),
            )
          : symbolRecords;
      }

      if (requestedType === "symbol") {
        payload.symbol = symbolRecords.filter((record) =>
          ids.has((record.id ?? "").toUpperCase()),
        );
      }

      if (requestedType === "theses") {
        payload.theses = ids.size
          ? thesisRecords.filter((record) =>
              ids.has((record.id ?? "").toUpperCase()),
            )
          : thesisRecords;
      }

      if (requestedType === "thesis") {
        payload.thesis = thesisRecords.filter((record) =>
          ids.has((record.id ?? "").toUpperCase()),
        );
      }

      if (requestedType === "watchlist") {
        payload.watchlist = deriveWatchlist(symbolRecords, ids);
      }

      if (requestedType === "portfolio-monitor") {
        payload["portfolio-monitor"] = await derivePortfolioMonitor(
          context.directory,
          symbolRecords,
        );
      }
    }

    return JSON.stringify(payload, null, 2);
  },
});

function normalizeRequestedTypes(types: string[]): RequestedType[] {
  const normalized = types
    .map((type) => type.trim().toLowerCase())
    .filter(Boolean);

  if (normalized.length === 0) {
    return ["symbols", "theses"];
  }

  const invalid = normalized.filter(
    (type) =>
      ![
        "symbols",
        "symbol",
        "theses",
        "thesis",
        "watchlist",
        "portfolio-monitor",
      ].includes(type),
  );
  if (invalid.length > 0) {
    throw new Error(`Unsupported state type(s): ${invalid.join(", ")}`);
  }

  return normalized as RequestedType[];
}

async function loadSymbolRecords(directory: string): Promise<SymbolRecord[]> {
  const symbolsRoot = path.resolve(directory, "memory", "symbols");
  const symbolDirs = await safeListDirectory(symbolsRoot);
  const records = await Promise.all(
    symbolDirs.map(async (symbolDir) => {
      const filePath = path.resolve(symbolsRoot, symbolDir, "plan.md");
      return loadFrontmatterRecord<SymbolRecord>(
        filePath,
        SYMBOL_REQUIRED_FIELDS,
        symbolDir.toUpperCase(),
        { legacyField: "scope" },
      );
    }),
  );

  return records
    .filter((record) => record.id)
    .sort((left, right) => (left.id ?? "").localeCompare(right.id ?? ""));
}

async function loadThesisRecords(directory: string): Promise<ThesisRecord[]> {
  const thesesRoot = path.resolve(directory, "memory", "theses");
  const thesisFiles = await listMarkdownFiles(thesesRoot);
  const records = await Promise.all(
    thesisFiles.map(async (filePath) => {
      const fallbackId = path.basename(filePath, ".md").toLowerCase();
      return loadFrontmatterRecord<ThesisRecord>(
        filePath,
        THESIS_REQUIRED_FIELDS,
        fallbackId,
      );
    }),
  );

  return records
    .filter((record) => record.id)
    .sort((left, right) => (left.id ?? "").localeCompare(right.id ?? ""));
}

function deriveWatchlist(symbolRecords: SymbolRecord[], ids: Set<string>) {
  return symbolRecords
    .filter((record) => {
      const symbolId = (record.id ?? "").toUpperCase();
      if (ids.size > 0 && !ids.has(symbolId)) {
        return false;
      }
      return record.watchlist_status === "READY" || record.leader === true;
    })
    .map((record) => {
      const {
        id,
        watchlist_status,
        trade_classification,
        holding_mode,
        thesis_id,
        last_reviewed,
        next_review,
        leader,
        tags,
        file,
        warnings,
      } = record;

      const watchlistRecord: Record<string, unknown> = {
        id,
        watchlist_status,
        trade_classification,
        holding_mode,
        thesis_id,
        last_reviewed,
        next_review,
        leader,
        tags,
        file,
      };
      if (warnings && warnings.length > 0) {
        watchlistRecord.warnings = warnings;
      }
      return watchlistRecord;
    });
}

async function derivePortfolioMonitor(
  directory: string,
  symbolRecords: SymbolRecord[],
) {
  const snapshot = await readLatestPortfolio(directory);
  const recordsById = new Map(
    symbolRecords
      .filter((record) => record.id)
      .map((record) => [(record.id ?? "").toUpperCase(), record]),
  );
  const positions = withPortfolioWeights(snapshot)
    .sort((left, right) => right.weight - left.weight)
    .map((position) => {
      const plan = recordsById.get(position.symbol.toUpperCase());
      return {
        symbol: position.symbol,
        weight: position.weight,
        market_value: position.market_value,
        unrealized_pnl: position.unrealized_pnl,
        unrealized_gain: position.unrealized_gain,
        watchlist_status: plan?.watchlist_status,
        trade_classification: plan?.trade_classification,
        holding_mode: plan?.holding_mode,
        thesis_id: plan?.thesis_id,
        last_reviewed: plan?.last_reviewed,
        next_review: plan?.next_review,
        leader: plan?.leader,
        tags: plan?.tags,
        file: plan?.file,
        warnings: plan?.warnings,
      };
    })
    .map((position) =>
      Object.fromEntries(
        Object.entries(position).filter(([, value]) => value !== undefined),
      ),
    );

  const healthFlags: string[] = [];
  if (positions.some((position) => Number(position.weight) > 0.3)) {
    healthFlags.push("PM-W01");
  }

  const speculationWeight = positions.reduce((sum, position) => {
    return position.trade_classification === "SPECULATION"
      ? sum + Number(position.weight)
      : sum;
  }, 0);
  if (speculationWeight > 0.1) {
    healthFlags.push("PM-W02");
  }

  if (
    positions.some(
      (position) =>
        typeof position.next_review === "string" &&
        position.next_review < snapshot.as_of,
    )
  ) {
    healthFlags.push("PM-W10");
  }

  return {
    as_of: snapshot.as_of,
    captured_at: snapshot.captured_at,
    cash: snapshot.cash,
    equity: snapshot.equity,
    cash_ratio: snapshot.equity > 0 ? snapshot.cash / snapshot.equity : 0,
    position_count: positions.length,
    positions,
    health_flags: healthFlags,
  };
}

async function loadFrontmatterRecord<T extends FrontmatterRecord>(
  filePath: string,
  requiredFields: string[],
  fallbackId: string,
  options?: { legacyField?: string },
): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = parseFrontmatter(raw);
    const data = parsed.data as T;
    const warnings = [...parsed.warnings];

    if (!data.id) {
      data.id = fallbackId;
    }

    for (const requiredField of requiredFields) {
      if (!(requiredField in data)) {
        warnings.push(`Missing required field: ${requiredField}`);
      }
    }

    if (options?.legacyField && options.legacyField in data) {
      warnings.push(`Legacy frontmatter field present: ${options.legacyField}`);
    }

    data.file = toMemoryPath(filePath);
    if (warnings.length > 0) {
      data.warnings = warnings;
    }
    return data;
  } catch (error) {
    return {
      id: fallbackId,
      file: toMemoryPath(filePath),
      warnings: [`Failed to read or parse frontmatter: ${(error as Error).message}`],
    } as T;
  }
}

function parseFrontmatter(raw: string): {
  data: Record<string, unknown>;
  warnings: string[];
} {
  if (!raw.startsWith("---\n")) {
    return {
      data: {},
      warnings: ["Missing YAML frontmatter block"],
    };
  }

  const closingIndex = raw.indexOf("\n---", 4);
  if (closingIndex === -1) {
    return {
      data: {},
      warnings: ["Unclosed YAML frontmatter block"],
    };
  }

  const lines = raw.slice(4, closingIndex).split("\n");
  const data: Record<string, unknown> = {};
  const warnings: string[] = [];
  let activeListKey: string | null = null;
  let activeListValues: unknown[] = [];

  const flushList = () => {
    if (activeListKey) {
      data[activeListKey] = activeListValues;
      activeListKey = null;
      activeListValues = [];
    }
  };

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    const listItemMatch = line.match(/^\s{2}-\s+(.*)$/);
    if (listItemMatch && activeListKey) {
      activeListValues.push(parseScalarValue(listItemMatch[1].trim()));
      continue;
    }

    flushList();

    const keyValueMatch = line.match(/^([A-Za-z0-9_-]+):(.*)$/);
    if (!keyValueMatch) {
      warnings.push(`Unsupported frontmatter line: ${line}`);
      continue;
    }

    const key = keyValueMatch[1];
    const rawValue = keyValueMatch[2].trim();
    if (!rawValue) {
      activeListKey = key;
      activeListValues = [];
      continue;
    }

    data[key] = parseValue(rawValue);
  }

  flushList();
  return { data, warnings };
}

function parseValue(rawValue: string): unknown {
  if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
    const inner = rawValue.slice(1, -1).trim();
    if (!inner) {
      return [];
    }
    return splitInlineList(inner).map((item) => parseScalarValue(item.trim()));
  }

  return parseScalarValue(rawValue);
}

function parseScalarValue(rawValue: string): unknown {
  if (rawValue === "null" || rawValue === "~") {
    return null;
  }
  if (rawValue === "true") {
    return true;
  }
  if (rawValue === "false") {
    return false;
  }
  if (
    (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
    (rawValue.startsWith("'") && rawValue.endsWith("'"))
  ) {
    return rawValue.slice(1, -1);
  }
  if (/^-?\d+(?:\.\d+)?$/.test(rawValue)) {
    return Number(rawValue);
  }
  return rawValue;
}

function splitInlineList(rawValue: string): string[] {
  const values: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;

  for (const char of rawValue) {
    if ((char === '"' || char === "'") && !quote) {
      quote = char;
      current += char;
      continue;
    }
    if (char === quote) {
      quote = null;
      current += char;
      continue;
    }
    if (char === "," && !quote) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  if (current) {
    values.push(current);
  }

  return values;
}

async function safeListDirectory(directory: string): Promise<string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

async function listMarkdownFiles(directory: string): Promise<string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.resolve(directory, entry.name);
        if (entry.name === "archive" || entry.name === "README.md") {
          return [];
        }
        if (entry.isDirectory()) {
          return listMarkdownFiles(entryPath);
        }
        if (entry.isFile() && entry.name.endsWith(".md")) {
          return [entryPath];
        }
        return [];
      }),
    );
    return files.flat().sort();
  } catch {
    return [];
  }
}

function toMemoryPath(filePath: string): string {
  const memoryIndex = filePath.indexOf(`${path.sep}memory${path.sep}`);
  if (memoryIndex === -1) {
    return filePath;
  }
  return filePath.slice(memoryIndex + 1).replaceAll(path.sep, "/");
}
