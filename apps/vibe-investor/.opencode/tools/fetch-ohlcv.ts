import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { tool } from "@opencode-ai/plugin";

export default tool({
  description:
    "Fetch 3 years of OHLCV (Open, High, Low, Close, Volume) data for Indonesian stocks and save to file. Use this to get historical price data for technical analysis. The data includes daily OHLCV, foreign flow, trading frequency, and other metrics.",
  args: {
    ticker: tool.schema
      .string()
      .describe(
        "Stock ticker symbol (e.g., 'BBCA', 'TLKM', 'GOTO'). Must be uppercase Indonesian stock symbol.",
      ),
    output_path: tool.schema
      .string()
      .describe(
        "Path where the JSON file will be saved (e.g., 'data/BBCA_ohlcv.json'). Can be relative or absolute.",
      ),
  },
  async execute(args, context) {
    const { ticker, output_path } = args;

    // Validate ticker format
    const normalizedTicker = ticker.trim().toUpperCase();
    if (!normalizedTicker || !/^[A-Z]{4}$/.test(normalizedTicker)) {
      throw new Error(
        `Invalid ticker format: "${ticker}". Must be 4 uppercase letters (e.g., BBCA, TLKM).`,
      );
    }

    // Resolve output path relative to working directory
    const absolutePath = resolve(context.directory, output_path);

    try {
      // Fetch data from kb-backend
      const url = `https://kb.akbarmr.dev/stock-market-id/stock/${normalizedTicker}/chartbit/raw`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch data for ${normalizedTicker}: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(`API returned error: ${data.error || "Unknown error"}`);
      }

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

      return `✅ Successfully fetched and saved OHLCV data for ${normalizedTicker}

File: ${absolutePath}
Data points: ${dataPoints} days
Date range: ${dateRange}

The JSON file contains daily trading data with the following fields:
- OHLCV: open, high, low, close, volume
- Foreign flow: foreignbuy, foreignsell, foreignflow
- Trading metrics: frequency, value, soxclose
- Company data: shareoutstanding, dividend

You can now load this file for technical analysis using pandas or other tools.`;
    } catch (error) {
      throw new Error(
        `Failed to fetch OHLCV data for ${normalizedTicker}: ${(error as Error).message}`,
      );
    }
  },
});
