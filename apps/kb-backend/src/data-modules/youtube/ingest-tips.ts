import { GoogleGenAI } from "@google/genai";
import { discordService } from "../../infrastructure/discord.js";
import { env } from "../../infrastructure/env.js";
import { inngest } from "../../infrastructure/inngest.js";

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
          systemInstruction: `
## System Information

Current datetime (UTC): ${new Date().toISOString()}

## ROLE

You are an expert **Investment Education Analyst** specializing in the Indonesian Stock Market (IDX/BEI). You focus on extracting educational content, tips, strategies, and general investing wisdom.

## TASK

Analyze the provided video transcript (Indonesian/English) and generate an **Educational Summary** in professional English. Write as if presenting the insights directly, not as a summary of a video.

## WHAT TO EXTRACT

Focus on capturing the **educational substance** of the video:

- **Main educational topic or lesson** being taught
- **Key strategies or frameworks** discussed
- **Tips and best practices** for investors
- **Mindset and psychology** insights
- **General market wisdom** and principles
- **Tools and techniques** mentioned
- **Common mistakes** to avoid

## OUTPUT GUIDELINES

**Adapt your format to match the video's educational structure.**

- If the video is a **tutorial**, structure your note as a step-by-step guide
- If it's a **strategy discussion**, organize by key principles
- If it's a **mindset/philosophy piece**, capture the main themes
- Use bullet points, headers, or prose — whatever best represents the content

**Always include:**
1. A brief summary of the main educational topic
2. The key lessons or takeaways
3. Any actionable tips or frameworks

**DO NOT include:**
- Formal document headers
- References to "the video", "the speaker", etc.
- Write as a direct educational note
- Start directly with the content

## RULES

1. **Output in English** — regardless of input language
2. **Filter noise** — remove intros, outros, sponsors, subscription reminders
3. **Preserve narrative order** — present insights as they unfold
4. **Never fabricate** — only report what is stated or strongly implied
`,
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
      const markdownContent = `**${event.data.video.title}**\n\n${summary}`;

      await discordService.createThread(
        env.DISCORD_CHANNEL_YOUTUBE_SUMMARY_TIPS,
        event.data.video.title,
        markdownContent,
        {
          channel: event.data.channel.channelName,
          url: event.data.video.url,
          published: event.data.video.published,
          type: "tips",
        },
      );
    });
  },
);
