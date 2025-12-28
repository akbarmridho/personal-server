import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import pRetry from "p-retry";
import z from "zod";
import { KV } from "../../infrastructure/db/kv.js";
import { inngest } from "../../infrastructure/inngest.js";
import type { YoutubeChannel } from "./cron.js";

export interface YoutubeVideoEntry {
  title: string;
  url: string;
  published: string;
  description: string;
}

export const getVideosFromChannel = async (
  channel: YoutubeChannel,
): Promise<YoutubeVideoEntry[]> => {
  const parser = new XMLParser({
    ignoreAttributes: false, // Needed to read 'href'
    attributeNamePrefix: "", // Keeps properties clean (link.href)
    isArray: (name) => name === "entry", // Ensures 'entry' is always an array
  });

  const response = await axios.get(channel.channelRSS);
  const parsed = parser.parse(response.data);

  // Safety check: if the feed is empty or invalid
  const entries = parsed.feed?.entry || [];

  const videos: YoutubeVideoEntry[] = entries.map((entry: any) => {
    const mediaGroup = entry["media:group"];

    return {
      title: entry.title,
      // The XML structure for link is <link rel="alternate" href="..." />
      url: entry.link?.href || "",
      published: entry.published,
      description: mediaGroup ? mediaGroup["media:description"] : "",
    };
  });

  // filter empty url and url shorts
  return videos.filter((e) => !!e.url && !e.url.includes("shorts"));
};

const IngestionDecisionSchema = z.object({
  shouldIngest: z
    .boolean()
    .describe("Whether the video meets the criteria for ingestion"),
  reason: z
    .string()
    .describe("A brief explanation (max 10 words) based on the rules"),
});

// Type inference for your code
type IngestionDecision = z.infer<typeof IngestionDecisionSchema>;

const decideIngestion = async (
  video: YoutubeVideoEntry,
): Promise<IngestionDecision> => {
  const result = await pRetry(async () => {
    const { object } = await generateObject({
      model: openrouter("openai/gpt-5-mini", {
        models: ["google/gemini-3-flash-preview"],
      }),
      prompt: `
You are an Investment Content Gatekeeper for a "Vibe Investing" Knowledge Base (Indonesian Stock Market).
Your task is to analyze the video title and description to determine if it should be ingested.

### RULES
1. INGEST (true) if the content provides:
   - Specific Ticker Analysis (e.g., BBCA, UNVR, GOTO).
   - Specific Sector/Industry Analysis (e.g., Coal, Banking, Gold).
   - Macro/Market Outlook (e.g., IHSG, Fed Rate, 2026 Prediction).
   - Specific Stock Picks/Bocoran (e.g., "Undervalue stocks", "Second liner").
   - *EXCEPTION*: If title is generic (e.g., "Strategi...") BUT description contains specific clues (tickers, "bocoran", sector names), return true.

2. SKIP (false) if the content is:
   - General Education/Tutorials (e.g., "What is IPO", "Chart patterns").
   - Mindset/Lifestyle/Career (e.g., "Fulltime investor journey", "Interview").
   - Technical/Security Issues (e.g., "Hacking", "App tutorial").
   - Generic "Kungfu/Strategies" with no specific clues in description.

### EXAMPLES
Input:
Title: "Emas Lanjut ATH! ANTM ARCI Mana Paling Ngegas?"
Desc: "Analisa teknikal saham emas dan perbandingan valuasi..."
Output:
{"shouldIngest": true, "reason": "Specific sector (Gold) and tickers (ANTM, ARCI)"}

Input:
Title: "Modus Hacking Sekuritas & Tips Aman"
Desc: "Banyak akun bobol, ini cara amankan akun anda..."
Output:
{"shouldIngest": false, "reason": "Technical security issue, not investment analysis"}

Input:
Title: "Cara Mendapatkan Saham Jackpot di 2026"
Desc: "Kita bahas bocoran sektor dan saham second liner seperti SCMA dan BBYB..."
Output:
{"shouldIngest": true, "reason": "Generic title but description contains specific tickers (SCMA, BBYB) and sector clues"}

Input:
Title: "Belajar Kungfu IPO dari Henan"
Desc: "Podcast tentang perjalanan karir dan filosofi investasi..."
Output:
{"shouldIngest": false, "reason": "Career journey and general philosophy, no specific market analysis"}

### CURRENT INPUT
Title: ${video.title}
Description: ${video.description}

### OUTPUT FORMAT
Respond strictly with valid JSON matching this schema:
{
  "shouldIngest": boolean,
  "reason": "short string explanation"
}`,
      schema: IngestionDecisionSchema,
    });

    return object;
  });

  return result;
};

export interface YoutubeKVStructure {
  processedUrls: string[];
}

export const youtubeGetCacheKey = (rssURL: string) => {
  return `data-modules.youtube.processed-urls.${rssURL}`;
};

export const youtubeChannelCrawl = inngest.createFunction(
  {
    id: "youtube-channel-crawl",
    concurrency: 1,
  },
  { event: "data/youtube-crawl" },
  async ({ event, step }) => {
    const processedUrlsCacheKey = youtubeGetCacheKey(event.data.channelRSS);

    const videos = await step.run("fetch-videos", async () => {
      return await getVideosFromChannel(event.data);
    });

    const currentProgress = await step.run("fetch-progress", async () => {
      const result = await KV.get(processedUrlsCacheKey);

      return result as YoutubeKVStructure | null;
    });

    const alreadyProcessed: string[] = [];

    if (currentProgress) {
      alreadyProcessed.push(...currentProgress.processedUrls);
    }

    const toProcess = videos.filter(
      (video) => !alreadyProcessed.includes(video.url),
    );

    if (toProcess.length > 0) {
      // gate to classify
      const decisions = await Promise.all(
        toProcess.map(async (e) => {
          return await step.run(`decide-${e.url}`, async () => {
            return {
              video: e,
              decision: await decideIngestion(e),
            };
          });
        }),
      );

      const toIngest = decisions.filter((e) => e.decision.shouldIngest);
      const toIngestTips = decisions.filter((e) => !e.decision.shouldIngest);

      if (toIngest.length > 0) {
        await step.sendEvent(
          "send-ingest",
          toIngest.map((e) => {
            return {
              name: "data/youtube-ingest",
              data: {
                channel: event.data,
                video: e.video,
              },
            };
          }),
        );
      }

      if (toIngestTips.length > 0) {
        await step.sendEvent(
          "send-ingest-tips",
          toIngestTips.map((e) => {
            return {
              name: "data/youtube-ingest-tips",
              data: {
                channel: event.data,
                video: e.video,
              },
            };
          }),
        );
      }

      await step.run("update-progress", async () => {
        await KV.set(processedUrlsCacheKey, {
          processedUrls: [...alreadyProcessed, ...toProcess.map((e) => e.url)],
        });
      });
    }
  },
);
