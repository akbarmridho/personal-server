import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { tool } from "@opencode-ai/plugin";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { type FilePart, generateText, type ImagePart } from "ai";
import { lookup } from "mime-types";

const DEFAULT_MODEL = "google/gemini-2.5-flash-lite-preview-09-2025";
const FALLBACK_MODEL = "google/gemini-3-flash-preview";

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function sanitizeFileName(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const trimmed = cleaned.replace(/^-+|-+$/g, "");
  return trimmed || "input.bin";
}

export default tool({
  description:
    "Case-by-case extraction worker for large PDFs/images (financial statements, public expose, keterbukaan informasi, long filings). Extracts only what the goal asks from one or more sources.",
  args: {
    goal: tool.schema
      .string()
      .describe("What specific information to extract from the file."),
    sources: tool.schema
      .array(tool.schema.string())
      .min(1)
      .max(5)
      .describe(
        "Array of sources to analyze. Each source must be either a downloadable http(s) URL or a local file path (relative/absolute).",
      ),
  },
  async execute(rawArgs, context) {
    const goal = rawArgs.goal.trim();

    if (!goal) {
      throw new Error("Missing required goal.");
    }

    const sources = rawArgs.sources
      .map((source) => source.trim())
      .filter(Boolean);

    if (sources.length === 0) {
      throw new Error("sources must contain at least one non-empty item.");
    }

    if (sources.length > 5) {
      throw new Error("sources supports up to 5 items per call.");
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;

    if (!openRouterApiKey) {
      throw new Error("OPENROUTER_API_KEY is missing in runtime environment.");
    }

    const fileParts: Array<FilePart | ImagePart> = [];

    // sort the sources to make subsequent tool calls with exact parameter have deterministic sources order
    // thus make the cache read hit
    for (const source of sources.sort()) {
      if (isHttpUrl(source)) {
        const url = new URL(source);
        const guessedPath = sanitizeFileName(
          basename(decodeURIComponent(url.pathname || "")) || "remote-file",
        );

        const mediaType = lookup(guessedPath);

        if (!mediaType) {
          throw new Error(`Cannot infer mime type for ${source}`);
        }

        if (mediaType.startsWith("image/")) {
          fileParts.push({
            type: "image",
            image: url,
            mediaType,
          });
        } else {
          fileParts.push({
            type: "file",
            data: url,
            mediaType,
            filename: guessedPath,
          });
        }
      } else {
        const absolutePath = resolve(context.directory, source);
        const fileBuffer = await readFile(absolutePath);
        const mediaType = lookup(absolutePath);

        if (!mediaType) {
          throw new Error(`Cannot infer mime type for ${source}`);
        }

        if (mediaType.startsWith("image/")) {
          fileParts.push({
            type: "image",
            image: fileBuffer,
            mediaType,
          });
        } else {
          fileParts.push({
            type: "file",
            data: fileBuffer,
            mediaType,
            filename: basename(absolutePath),
          });
        }
      }
    }

    const { text } = await generateText({
      model: openrouter(DEFAULT_MODEL, {
        models: [FALLBACK_MODEL],
      }),
      maxRetries: 2,
      providerOptions: {
        openrouter: {
          reasoning: {
            effort: "high",
          },
        },
      },
      messages: [
        {
          role: "system",
          content: `You interpret media files that cannot be read as plain text.

Your job: examine the attached source files and extract ONLY what was requested.

When to use you:
- Large, manual-heavy documents (laporan keuangan, public expose, keterbukaan informasi, long filings)
- Extracting specific information or summaries from PDFs/images/diagrams
- When analyzed/extracted data is needed, not literal raw file contents

When NOT to use you:
- Source code or plain text files needing exact contents (use Read)
- Files that need literal copy for editing
- Simple file reading where no interpretation is needed

How you work:
1. Receive a goal describing what to extract
2. Read and analyze the attached files deeply
3. Return ONLY the relevant extracted information

Response rules:
- Return extracted information directly, no preamble
- If information is not found, state clearly what is missing
- Match the request language
- Be thorough on the goal, concise on everything else

Your output goes straight to the main agent for continued work.`,
        },
        {
          role: "user",
          content: [
            ...fileParts,
            // order is important. put the file parts first, then the user query.
            // to ensure the cache read is HIT.
            {
              type: "text",
              text: `Analyze ${fileParts.length} source file(s) and extract the requested information.

Goal: ${goal}

Provide ONLY the extracted information that matches the goal.
Be thorough on what was requested, concise on everything else.
If the requested information is not found, clearly state what is missing.`,
            },
          ],
        },
      ],
    });

    const answer = text?.trim();

    if (!answer) {
      return `No answer generated.`;
    }

    return answer;
  },
});
