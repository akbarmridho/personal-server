import { GoogleGenAI } from "@google/genai";
import { discordService } from "../../infrastructure/discord.js";
import { env } from "../../infrastructure/env.js";
import { inngest } from "../../infrastructure/inngest.js";
import { getYoutubeReconstructionSystemPrompt } from "./reconstruction-prompt.js";

const ai = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY,
});

export const youtubeChannelIngestTips = inngest.createFunction(
  {
    id: "youtube-channel-ingest-tips",
    concurrency: 1,
  },
  { event: "data/youtube-ingest-tips" },
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

    await step.run("notify-discord", async () => {
      await discordService.createThread(
        env.DISCORD_CHANNEL_YOUTUBE_SUMMARY_TIPS,
        event.data.video.title.slice(0, 100),
        summary,
        {
          channel: event.data.channel.channelName,
          url: event.data.video.url,
          published: event.data.video.published,
        },
      );
    });
  },
);
