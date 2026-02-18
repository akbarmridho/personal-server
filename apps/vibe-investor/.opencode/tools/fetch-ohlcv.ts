import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { tool } from "@opencode-ai/plugin";

export default tool({
  description:
    "Fetch unified chart data for Indonesian stocks and save to file. The output includes: 3 years daily OHLCV, 7 calendar days intraday OHLCV (resampled to 60-minute bars, partial bar kept), and corporate action events.",
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
  },
  async execute(args, context) {
    const { symbol, output_path } = args;

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

    // Resolve output path relative to working directory
    const absolutePath = resolve(context.directory, output_path);

    try {
      // Fetch data from kb-backend
      const url = `https://kb.akbarmr.dev/stock-market-id/stock/${normalizedSymbol}/chartbit/raw`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch data for ${normalizedSymbol}: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(`API returned error: ${data.error || "Unknown error"}`);
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

      const payload = data.data as {
        daily?: Array<{ date?: string; is_partial?: boolean }>;
        intraday?: Array<{ is_partial?: boolean }>;
        corp_actions?: unknown[];
      };

      const dailyPoints = Array.isArray(payload.daily)
        ? payload.daily.length
        : 0;
      const intradayPoints = Array.isArray(payload.intraday)
        ? payload.intraday.length
        : 0;
      const corpActionPoints = Array.isArray(payload.corp_actions)
        ? payload.corp_actions.length
        : 0;
      const partialIntradayBars = Array.isArray(payload.intraday)
        ? payload.intraday.filter((bar) => bar.is_partial).length
        : 0;
      const dailyFrom =
        dailyPoints > 0 ? (payload.daily?.[0]?.date ?? "unknown") : "unknown";
      const dailyTo =
        dailyPoints > 0
          ? (payload.daily?.[dailyPoints - 1]?.date ?? "unknown")
          : "unknown";

      return `Saved unified chart data for ${normalizedSymbol}
File: ${absolutePath}
Daily: ${dailyPoints} (${dailyFrom} to ${dailyTo})
Intraday 60m: ${intradayPoints} (partial: ${partialIntradayBars})
Corp actions: ${corpActionPoints}`;
    } catch (error) {
      throw new Error(
        `Failed to fetch OHLCV data for ${normalizedSymbol}: ${(error as Error).message}`,
      );
    }
  },
});
