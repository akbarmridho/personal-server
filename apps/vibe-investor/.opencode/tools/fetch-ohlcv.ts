import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { tool } from "@opencode-ai/plugin";

export default tool({
  description:
    "Fetch 3 years of OHLCV (Open, High, Low, Close, Volume) data for Indonesian stocks and save to file. Use this to get historical price data for technical analysis. The data includes daily OHLCV, foreign flow, trading frequency, and other metrics.",
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

      const dataPoints = Array.isArray(data.data) ? data.data.length : 0;
      const dateRange =
        dataPoints > 0
          ? `${data.data[0].date} to ${data.data[dataPoints - 1].date}`
          : "unknown range";

      return `✅ Successfully fetched and saved OHLCV data for ${normalizedSymbol}

File: ${absolutePath}
Data points: ${dataPoints} days
Date range: ${dateRange}
Format: JSON array of objects (NOT CSV)

The JSON file contains daily trading data with the following fields:
- OHLCV: open, high, low, close, volume
- Foreign flow: foreignbuy, foreignsell, foreignflow
- Trading metrics: frequency, value, soxclose
- Company data: shareoutstanding, dividend

Load this file with JSON parsers (e.g., pd.read_json / json.load), not CSV parsers.`;
    } catch (error) {
      throw new Error(
        `Failed to fetch OHLCV data for ${normalizedSymbol}: ${(error as Error).message}`,
      );
    }
  },
});
