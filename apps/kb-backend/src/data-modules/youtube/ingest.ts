import { GoogleGenAI } from "@google/genai";
import { v5 as uuidv5 } from "uuid";
import { env } from "../../infrastructure/env.js";
import { inngest } from "../../infrastructure/inngest.js";
import { knowledgeService } from "../../infrastructure/knowledge-service.js";
import { extractSymbolFromTexts } from "../profiles/companies.js";
import { tagMetadata } from "../utils/tagging.js";
import { getYoutubeReconstructionSystemPrompt } from "./reconstruction-prompt.js";

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
          systemInstruction: getYoutubeReconstructionSystemPrompt(
            new Date().toISOString(),
          ),
        },
        contents: [
          {
            fileData: {
              fileUri: event.data.video.url,
            },
          },
          {
            text: `Video publish date: ${event.data.video.published}`,
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

    await step.sendEvent("notify-discord", [
      {
        name: "notify/discord-kb-ingestion",
        data: {
          payload: [payload],
        },
      },
    ]);
  },
);
