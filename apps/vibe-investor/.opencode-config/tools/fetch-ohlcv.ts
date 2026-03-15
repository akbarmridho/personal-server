import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { tool } from "@opencode-ai/plugin";

type ChartPayload = {
  daily?: Array<{ date?: string; is_partial?: boolean }>;
  intraday_1m?: Array<{ date?: string; datetime?: string; is_partial?: boolean }>;
  corp_actions?: unknown[];
};

type ChartResponse = {
  success: boolean;
  error?: string;
  data?: ChartPayload;
};

export default tool({
  description:
    "Fetch unified chart data for Indonesian stocks and save to file. The output includes: 3 years daily OHLCV, 7 calendar days raw 1-minute intraday OHLCV, and corporate action events. Optional as_of_date truncates all returned data to that Jakarta calendar date; when omitted, the snapshot defaults to now in Asia/Jakarta.",
  args: {
    symbol: tool.schema
      .string()
      .describe(
        "Stock symbol (e.g., 'BBCA', 'TLKM', 'GOTO'). Must be uppercase Indonesian stock symbol.",
      ),
    output_path: tool.schema
      .string()
      .describe(
        "Path where the JSON file will be saved (e.g., 'data/BBCA_ohlcv.json'). Can be relative or absolute.",
      ),
    as_of_date: tool.schema
      .string()
      .optional()
      .describe(
        "Optional Jakarta snapshot date in YYYY-MM-DD. When provided, only data on or before that calendar date is returned. When omitted, the snapshot defaults to now in Asia/Jakarta.",
      ),
  },
  async execute(args, context) {
    const { symbol, output_path, as_of_date } = args;

    // Validate symbol format
    const normalizedSymbol = symbol.trim().toUpperCase();
    if (!normalizedSymbol || !/^[A-Z]{4}$/.test(normalizedSymbol)) {
      throw new Error(
        `Invalid symbol format: "${symbol}". Must be 4 uppercase letters (e.g., BBCA, TLKM).`,
      );
    }
    if (!output_path.trim().toLowerCase().endsWith(".json")) {
      throw new Error(
        `Invalid output_path: "${output_path}". fetch-ohlcv writes JSON only, so use a .json file path (e.g., work/${normalizedSymbol}_ohlcv.json).`,
      );
    }
    if (as_of_date && !/^\d{4}-\d{2}-\d{2}$/.test(as_of_date)) {
      throw new Error(
        `Invalid as_of_date: "${as_of_date}". Use YYYY-MM-DD (e.g., 2026-02-01).`,
      );
    }

    // Resolve output path relative to working directory
    const absolutePath = resolve(context.directory, output_path);

    try {
      // Fetch data from kb-backend
      const url = new URL(
        `https://kb.akbarmr.dev/stock-market-id/stock/${normalizedSymbol}/chartbit/raw`,
      );
      if (as_of_date) {
        url.searchParams.set("as_of_date", as_of_date);
      }
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch data for ${normalizedSymbol}: ${response.status} ${response.statusText}`,
        );
      }

      const raw = (await response.json()) as unknown;
      const data = raw as ChartResponse;

      if (!data.success) {
        throw new Error(`API returned error: ${data.error || "Unknown error"}`);
      }

      if (!data.data) {
        throw new Error("API returned success without chart payload");
      }

      // Ensure directory exists
      const directory = dirname(absolutePath);
      await mkdir(directory, { recursive: true });

      // Save to file
      await writeFile(
        absolutePath,
        JSON.stringify(data.data, null, 2),
        "utf-8",
      );

      const payload = data.data;

      const dailyPoints = Array.isArray(payload.daily)
        ? payload.daily.length
        : 0;
      const intradayPoints = Array.isArray(payload.intraday_1m)
        ? payload.intraday_1m.length
        : 0;
      const corpActionPoints = Array.isArray(payload.corp_actions)
        ? payload.corp_actions.length
        : 0;
      const partialIntradayBars = Array.isArray(payload.intraday_1m)
        ? payload.intraday_1m.filter((bar) => bar.is_partial).length
        : 0;
      const dailyFrom =
        dailyPoints > 0 ? (payload.daily?.[0]?.date ?? "unknown") : "unknown";
      const dailyTo =
        dailyPoints > 0
          ? (payload.daily?.[dailyPoints - 1]?.date ?? "unknown")
          : "unknown";
      const intradayFrom =
        intradayPoints > 0
          ? (payload.intraday_1m?.[0]?.datetime ??
            payload.intraday_1m?.[0]?.date ??
            "unknown")
          : "unknown";
      const intradayTo =
        intradayPoints > 0
          ? (payload.intraday_1m?.[intradayPoints - 1]?.datetime ??
            payload.intraday_1m?.[intradayPoints - 1]?.date ??
            "unknown")
          : "unknown";

      return `Saved unified chart data for ${normalizedSymbol}
File: ${absolutePath}
Daily: ${dailyPoints} (${dailyFrom} to ${dailyTo})
Intraday 1m: ${intradayPoints} (${intradayFrom} to ${intradayTo}, partial: ${partialIntradayBars})
Corp actions: ${corpActionPoints}${as_of_date ? `\nSnapshot as_of_date: ${as_of_date}` : ""}`;
    } catch (error) {
      throw new Error(
        `Failed to fetch OHLCV data for ${normalizedSymbol}: ${(error as Error).message}`,
      );
    }
  },
});
