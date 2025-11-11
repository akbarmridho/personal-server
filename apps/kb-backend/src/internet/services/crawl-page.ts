import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import axios, { type AxiosError } from "axios";
import pRetry, { AbortError } from "p-retry";
import sharp from "sharp";
import z from "zod";
import { env } from "../../env.js";
import { logger } from "../../utils/logger.js";

interface FetchParams {
  url: string;
  returnFormat: "pageshot" | "markdown";
}

async function autoCrop(inputBuffer: Buffer): Promise<Buffer> {
  const image = sharp(inputBuffer).trim({
    threshold: 20,
  });

  return await image.toFormat("png").toBuffer();
}

export const fetchRawUrlContent = async ({
  url,
  returnFormat,
}: FetchParams): Promise<string | Buffer> => {
  const request = async (useAuth: boolean): Promise<string | Buffer> => {
    try {
      const headers: Record<string, string> = {
        "X-Return-Format": returnFormat,
      };
      if (useAuth) headers.Authorization = `Bearer ${env.JINA_AI_API_KEY}`;

      const response = await axios.get(`https://r.jina.ai/${url}`, {
        headers,
        responseType: returnFormat === "pageshot" ? "arraybuffer" : "text",
      });

      if (returnFormat === "markdown") {
        return response.data as string;
      } else {
        return Buffer.from(response.data);
      }
    } catch (err) {
      const error = err as AxiosError;
      const status = error.response?.status;

      // retry later with API key if unauthorized or rate-limited
      if (!useAuth && (status === 401 || status === 403 || status === 429)) {
        throw new AbortError("Need to retry with API key");
      }

      throw error;
    }
  };

  try {
    // Try once (with retry) WITHOUT API key
    return await pRetry(() => request(false), {
      retries: 1,
    });
  } catch (err) {
    // If failed due to auth/rate-limit — retry WITH API key
    if (err instanceof AbortError) {
      return await pRetry(() => request(true), {
        retries: 2,
      });
    }
    logger.error({ err }, "request failed");
    throw err;
  }
};

const readImageContent = async (rawBuffer: Buffer): Promise<string> => {
  // crop image first
  const buffer = await autoCrop(rawBuffer);

  const response = await generateText({
    model: openrouter("qwen/qwen3-vl-8b-instruct", {
      models: ["google/gemini-2.5-flash-preview-09-2025"],
    }),
    messages: [
      {
        role: "system",
        content: `
You are a vision-language model that converts webpage screenshots into structured, readable Markdown text.

Your goal:
- Extract and convert visible text, layout, and visual hierarchy into Markdown.
- Exclude repetitive or irrelevant elements such as headers, footers, ads, watermarks, and logos.
- For graphs, tables, or images that contain meaningful data, describe their content clearly in natural language.
- Preserve the original language of the text in the image.
- If the content is a news article, blog post, or any content with a published date, preserve the date information.
- Do not add your own commentary or translation.
- Return only the final Markdown output without additional explanation or formatting outside the content itself.
        `.trim(),
      },
      {
        role: "user",
        content: [
          {
            type: "image",
            image: buffer,
          },
        ],
      },
    ],
    maxRetries: 3,
  });

  if (!response.text) {
    logger.error(
      `[read image] Empty text response. Finish reason ${response.finishReason}`,
    );
    throw new Error(
      `[read image] Empty text response. Finish reason ${response.finishReason}`,
    );
  }

  return response.text;
};

export const FetchUrlContentSchema = z.object({
  url: z.url(),
  readImage: z.boolean().default(false),
});

export const fetchUrlContent = async (
  params: z.infer<typeof FetchUrlContentSchema>,
): Promise<string> => {
  const { url, readImage } = params;

  try {
    const returnFormat = readImage ? "pageshot" : "markdown";

    const raw = await fetchRawUrlContent({
      url,
      returnFormat,
    });

    let result: string;
    if (readImage && Buffer.isBuffer(raw)) {
      // Process pageshot image buffer with vision model
      result = await readImageContent(raw);
    } else if (typeof raw === "string") {
      // Return markdown as-is
      result = raw;
    } else {
      throw new Error("Unexpected data type from fetchRawUrlContent");
    }

    logger.info(
      { url, readImage, result: result.slice(0, 1000) },
      "Fetched URL content",
    );
    return result;
  } catch (err) {
    logger.error({ err, url }, "Failed to fetch and process URL content");
    throw err;
  }
};
