import type { NonSharedBuffer } from "node:buffer";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { promisify } from "node:util";
import { tool } from "@opencode-ai/plugin";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { type FilePart, generateText, type ImagePart } from "ai";
import { lookup } from "mime-types";

const DEFAULT_MODEL = "google/gemini-2.5-flash-lite-preview-09-2025";
const FALLBACK_MODEL = "google/gemini-3-flash-preview";
const PDF_COMPRESSION_THRESHOLD_BYTES = 10 * 1024 * 1024;

const execFileAsync = promisify(execFile);
let ghostscriptBinary: string | null = null;

async function resolveGhostscriptBinary(): Promise<string> {
  if (ghostscriptBinary) {
    return ghostscriptBinary;
  }

  const candidates =
    process.platform === "win32" ? ["gswin64c", "gswin32c", "gs"] : ["gs"];

  for (const binary of candidates) {
    try {
      await execFileAsync(binary, ["--version"]);
      ghostscriptBinary = binary;
      return binary;
    } catch {
      // try next candidate
    }
  }

  throw new Error(
    "Ghostscript is required for PDF compression but was not found in PATH. Install it and ensure the `gs` command is available.",
  );
}

async function runGhostscriptPdfCompression(
  inputPath: string,
  outputPath: string,
): Promise<void> {
  const binary = await resolveGhostscriptBinary();

  try {
    await execFileAsync(binary, [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.6",
      "-dPDFSETTINGS=/ebook",
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      "-dDetectDuplicateImages=true",
      "-dCompressFonts=true",
      `-sOutputFile=${outputPath}`,
      inputPath,
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Ghostscript failed to compress PDF (${inputPath}): ${message}`,
    );
  }
}

async function compressPdfBufferIfNeeded(
  inputBuffer: NonSharedBuffer,
  sourceLabel: string,
): Promise<NonSharedBuffer> {
  if (inputBuffer.byteLength <= PDF_COMPRESSION_THRESHOLD_BYTES) {
    return inputBuffer;
  }

  const tempDir = await mkdtemp(join(tmpdir(), "deep-doc-extract-"));
  const tempInputPath = join(tempDir, "input.pdf");
  const tempOutputPath = join(tempDir, "output.pdf");

  try {
    await writeFile(tempInputPath, inputBuffer);
    await runGhostscriptPdfCompression(tempInputPath, tempOutputPath);
    const compressed = await readFile(tempOutputPath);

    if (compressed.byteLength === 0) {
      throw new Error("compressed output is empty");
    }

    // Keep the original if compression is not beneficial.
    if (compressed.byteLength >= inputBuffer.byteLength) {
      return inputBuffer;
    }

    return compressed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to compress PDF source (${sourceLabel}): ${message}`,
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

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
          if (mediaType === "application/pdf") {
            const response = await fetch(url);

            if (!response.ok) {
              throw new Error(
                `Failed to download remote PDF ${source}: ${response.status} ${response.statusText}`,
              );
            }

            const rawBuffer = Buffer.from(await response.arrayBuffer());
            const pdfBuffer = await compressPdfBufferIfNeeded(
              rawBuffer,
              source,
            );

            fileParts.push({
              type: "file",
              data: pdfBuffer,
              mediaType,
              filename: guessedPath,
            });
            continue;
          }

          fileParts.push({
            type: "file",
            data: url,
            mediaType,
            filename: guessedPath,
          });
        }
      } else {
        const absolutePath = resolve(context.directory, source);
        const mediaType = lookup(absolutePath);

        if (!mediaType) {
          throw new Error(`Cannot infer mime type for ${source}`);
        }

        if (mediaType.startsWith("image/")) {
          const fileBuffer = await readFile(absolutePath);
          fileParts.push({
            type: "image",
            image: fileBuffer,
            mediaType,
          });
        } else {
          let fileBuffer = await readFile(absolutePath);

          if (mediaType === "application/pdf") {
            const fileStats = await stat(absolutePath);
            if (fileStats.size > PDF_COMPRESSION_THRESHOLD_BYTES) {
              fileBuffer = await compressPdfBufferIfNeeded(fileBuffer, source);
            }
          }

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
