import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";

const BASE_URL = "https://kb.akbarmr.dev";
const MARKET_MOOD_DIR = "./";

async function loadMarketMoodData() {
  const files = await readdir(MARKET_MOOD_DIR);
  const mdFiles = files.filter((f) => f.endsWith(".md")).sort();

  const data = await Promise.all(
    mdFiles.map(async (file) => {
      const content = await readFile(join(MARKET_MOOD_DIR, file), "utf-8");
      const date = basename(file, ".md");
      return { date, content };
    }),
  );

  return data;
}

async function ingestMarketMood() {
  const data = await loadMarketMoodData();

  const response = await fetch(
    `${BASE_URL}/stock-market-id/weekly-mood/merge`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to ingest: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

ingestMarketMood().then(console.log).catch(console.error);
