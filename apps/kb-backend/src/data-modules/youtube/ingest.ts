import { GoogleGenAI } from "@google/genai";
import { v5 as uuidv5 } from "uuid";
import { env } from "../../infrastructure/env.js";
import { inngest } from "../../infrastructure/inngest.js";
import { knowledgeService } from "../../infrastructure/knowledge-service.js";
import { extractSymbolFromTexts } from "../profiles/companies.js";
import { tagMetadata } from "../utils/tagging.js";

const ai = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY,
});

const namespace = "5574ae33-cf1d-4156-a0fa-93e5af7a940b";

export const youtubeChannelIngest = inngest.createFunction(
  {
    id: "youtube-channel-ingest",
    concurrency: 1,
  },
  { event: "data/youtube-ingest" },
  async ({ event, step }) => {
    const summary = await step.run("summarize", async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `
## System Information

Current datetime (UTC): ${new Date().toISOString()}

## ROLE

You are an expert **Investment Analyst** specializing in the Indonesian Stock Market (IDX/BEI). You operate within the "Stock Market 2.0" paradigm, with deep expertise in:

- **Bandarmology / Smart Money Analysis** — Accumulation, distribution, foreign flow (asing), and broker activity patterns
- **Thematic Narratives** — IKN, downstreaming, political catalysts, dividend plays, sector rotations
- **Technical & Fundamental Triggers** — Price targets, support/resistance zones, entry/exit levels

## TASK

Analyze the provided video transcript (Indonesian/English) and generate an **Investment Note** in professional English.

## WHAT TO EXTRACT

Focus on capturing the **substance** of the video:

- **Main thesis or market view** being presented
- **Stocks discussed** — company names, ticker symbols (if mentioned), and the context
- **Actionable information** — price levels, buy/sell zones, targets, warnings
- **Smart money signals** — foreign flow, broker activity, accumulation/distribution patterns
- **Catalysts and risks** — events, conditions, or triggers mentioned
- **Hidden or coded hints** — if the speaker alludes to stocks without naming them explicitly, capture the clue verbatim and flag it clearly

## OUTPUT GUIDELINES

**Adapt your format to match the video's structure and content.** There is no rigid template.

- If the video is a **single-stock deep dive**, structure your note around that stock's thesis.
- If it's a **market overview with multiple picks**, organize by theme or by stock as appropriate.
- If it's a **Q&A or reaction format**, follow that narrative flow.
- Use tables when they add clarity (e.g., listing multiple stocks with levels), but don't force them.
- Use bullet points, headers, or prose — whatever best represents the content.

**Always include:**
1. A brief summary of what the video is about
2. The key insights in narrative order
3. A clear list of stocks mentioned (with tickers if available)
4. Any undisclosed/coded stock hints (or state "none detected")

## RULES

1. **Output in English** — regardless of input language
2. **Filter noise** — remove intros, outros, sponsors, subscription reminders, pleasantries
3. **Preserve narrative order** — present insights as they unfold in the video
4. **Flag uncertainty** — if a ticker is unclear or unverifiable, say so
5. **Never fabricate** — only report what is stated or strongly implied
6. **Always check for hidden hints** — even if you can't decode them, report the clue
`,
        },
        contents: [
          {
            fileData: {
              fileUri: event.data.video.url,
            },
          },
        ],
      });

      if (response.promptFeedback?.blockReason) {
        throw new Error(`Blocked: ${response.promptFeedback.blockReason}`);
      }

      if (
        !response.candidates?.[0] ||
        response.candidates[0].finishReason !== "STOP"
      ) {
        throw new Error(
          `Failed: ${response.candidates?.[0]?.finishReason || "no candidates"}`,
        );
      }

      if (!response.text) {
        throw new Error("No response from AI");
      }

      return response.text;
    });

    // processing
    const payload = await step.run("process", async () => {
      const symbols = (
        await extractSymbolFromTexts([`${event.data.video.title}\n${summary}`])
      )[0];

      const taggedAnalysis = await tagMetadata([
        {
          date: event.data.video.published,
          content: summary,
          title: event.data.video.title,
          urls: [],
          subindustries: [],
          subsectors: [],
          symbols: symbols,
          indices: [],
        },
      ]);

      return {
        id: uuidv5(event.data.video.url, namespace),
        type: "analysis" as const,
        title: event.data.video.title,
        content: summary,
        document_date: event.data.video.published,
        source: {
          name: "youtube",
          channelName: event.data.channel.channelName,
          url: event.data.video.url,
        },
        urls: taggedAnalysis[0].urls,
        symbols: taggedAnalysis[0].symbols,
        subindustries: taggedAnalysis[0].subindustries,
        subsectors: taggedAnalysis[0].subsectors,
        indices: taggedAnalysis[0].indices,
      };
    });

    await step.run("ingest-document", async () => {
      return await knowledgeService.ingestDocuments({
        documents: [payload],
      });
    });
  },
);
