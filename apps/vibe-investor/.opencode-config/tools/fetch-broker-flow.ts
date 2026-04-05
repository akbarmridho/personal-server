import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { tool } from "@opencode-ai/plugin";

type BrokerRow = {
  broker?: string;
  value?: number;
  lots?: number;
  avg_price?: number;
};

type BrokerFlowSeriesDay = {
  date?: string;
  buy_rows?: BrokerRow[];
  sell_rows?: BrokerRow[];
};

type BrokerFlowPayload = {
  symbol?: string;
  window?: {
    requested_trading_days?: number;
    actual_trading_days?: number;
    from?: string;
    to?: string;
  };
  filters?: {
    transaction_type?: string;
    market_board?: string;
    investor_type?: string;
    limit?: number;
  };
  series?: BrokerFlowSeriesDay[];
};

type BrokerFlowResponse = {
  success: boolean;
  error?: string;
  data?: BrokerFlowPayload;
};

const DEFAULT_TRADING_DAYS = 60;
const MIN_TRADING_DAYS = 1;
const MAX_TRADING_DAYS = 60;

export default tool({
  description:
    "Fetch normalized broker-flow daily series for Indonesian stocks and save to file. The output includes one trading-day snapshot per day, derived from OHLCV trading dates, using gross regular-market all-investor broker data.",
  args: {
    symbol: tool.schema
      .string()
      .describe(
        "Stock symbol (e.g., 'BBCA', 'TLKM', 'GOTO'). Must be uppercase Indonesian stock symbol.",
      ),
    output_path: tool.schema
      .string()
      .describe(
        "Path where the JSON file will be saved (e.g., 'data/BBCA_broker_flow.json'). Can be relative or absolute.",
      ),
    as_of_date: tool.schema
      .string()
      .optional()
      .describe(
        "Optional Jakarta snapshot date in YYYY-MM-DD. When provided, the trading-day series ends on or before that date.",
      ),
    trading_days: tool.schema
      .number()
      .int()
      .min(MIN_TRADING_DAYS)
      .max(MAX_TRADING_DAYS)
      .optional()
      .describe(
        "Optional number of trading days to fetch. Use an integer from 1 to 60. Defaults to 60.",
      ),
  },
  async execute(args, context) {
    const { symbol, output_path, as_of_date } = args;
    const tradingDays = args.trading_days ?? DEFAULT_TRADING_DAYS;

    const normalizedSymbol = symbol.trim().toUpperCase();
    if (!normalizedSymbol || !/^[A-Z]{4}$/.test(normalizedSymbol)) {
      throw new Error(
        `Invalid symbol format: "${symbol}". Must be 4 uppercase letters (e.g., BBCA, TLKM).`,
      );
    }

    if (!output_path.trim().toLowerCase().endsWith(".json")) {
      throw new Error(
        `Invalid output_path: "${output_path}". fetch-broker-flow writes JSON only, so use a .json file path (e.g., work/${normalizedSymbol}_broker_flow.json).`,
      );
    }

    if (as_of_date && !/^\d{4}-\d{2}-\d{2}$/.test(as_of_date)) {
      throw new Error(
        `Invalid as_of_date: "${as_of_date}". Use YYYY-MM-DD (e.g., 2026-02-01).`,
      );
    }

    if (
      !Number.isInteger(tradingDays) ||
      tradingDays < MIN_TRADING_DAYS ||
      tradingDays > MAX_TRADING_DAYS
    ) {
      throw new Error(
        `Invalid trading_days: "${tradingDays}". Use an integer between ${MIN_TRADING_DAYS} and ${MAX_TRADING_DAYS}.`,
      );
    }

    const absolutePath = resolve(context.directory, output_path);

    try {
      const url = new URL(
        `https://kb.akbarmr.dev/stock-market-id/stock/${normalizedSymbol}/broker-flow/raw`,
      );
      url.searchParams.set("trading_days", String(tradingDays));
      if (as_of_date) {
        url.searchParams.set("as_of_date", as_of_date);
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch broker flow for ${normalizedSymbol}: ${response.status} ${response.statusText}`,
        );
      }

      const raw = (await response.json()) as unknown;
      const data = raw as BrokerFlowResponse;

      if (!data.success) {
        throw new Error(`API returned error: ${data.error || "Unknown error"}`);
      }

      if (!data.data) {
        throw new Error("API returned success without broker-flow payload");
      }

      const directory = dirname(absolutePath);
      await mkdir(directory, { recursive: true });

      await writeFile(
        absolutePath,
        JSON.stringify(data.data, null, 2),
        "utf-8",
      );

      const payload = data.data;
      const series = Array.isArray(payload.series) ? payload.series : [];
      const firstDay = series[0]?.date ?? "unknown";
      const lastDay = series[series.length - 1]?.date ?? "unknown";

      return `Saved broker-flow data for ${normalizedSymbol}
File: ${absolutePath}
Trading days: ${series.length} (${firstDay} to ${lastDay})${as_of_date ? `\nSnapshot as_of_date: ${as_of_date}` : ""}${payload.window?.requested_trading_days ? `\nRequested trading days: ${payload.window.requested_trading_days}` : ""}`;
    } catch (error) {
      throw new Error(
        `Failed to fetch broker-flow data for ${normalizedSymbol}: ${(error as Error).message}`,
      );
    }
  },
});
