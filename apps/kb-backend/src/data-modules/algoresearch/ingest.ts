import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import * as cheerio from "cheerio";
import dayjs from "dayjs";
import type { Element } from "domhandler";
import normalizeUrl from "normalize-url";
import TurndownService from "turndown";
import { v5 as uuidv5 } from "uuid";
import { inngest } from "../../infrastructure/inngest.js";
import {
  type InvestmentDocument,
  knowledgeService,
} from "../../infrastructure/knowledge-service.js";
import { extractSymbolFromTexts } from "../profiles/companies.js";
import { tagMetadata } from "../utils/tagging.js";

const namespace = "b2ddd6a6-c23b-4ce2-8d0b-762f505bc051";

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function truncate(input: string, maxChars: number): string {
  if (input.length <= maxChars) return input;
  return `${input.slice(0, Math.max(0, maxChars - 1))}…`;
}

function isBase64DataImage(src: string | undefined | null): src is string {
  if (!src) return false;
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(src);
}

function parseDataUrlImage(dataUrl: string): {
  mimeType: string;
  bytes: Uint8Array;
} {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid data URL image format");
  }
  const mimeType = match[1];
  const base64 = match[2];
  const bytes = Buffer.from(base64, "base64");
  return { mimeType, bytes };
}

function getNearestHeadingText($: cheerio.CheerioAPI, imgEl: Element): string {
  const candidates = ["h1", "h2", "h3", "h4", "h5", "h6"];
  const $img = $(imgEl);

  // Look backwards in the DOM for the nearest heading within a reasonable scope.
  let $cur = $img.parent();
  for (let depth = 0; depth < 4; depth++) {
    let $prev = $cur.prev();
    let steps = 0;

    while ($prev.length && steps < 8) {
      for (const tag of candidates) {
        const $h = $prev.is(tag) ? $prev : $prev.find(tag).first();
        if ($h.length) {
          const t = normalizeWhitespace($h.text());
          if (t) return t;
        }
      }
      $prev = $prev.prev();
      steps++;
    }

    $cur = $cur.parent();
    if (!$cur.length) break;
  }

  return "";
}

function getNeighborContextText(
  $: cheerio.CheerioAPI,
  imgEl: Element,
  opts?: { maxChars?: number; siblingScanLimit?: number },
): string {
  const maxChars = opts?.maxChars ?? 1400;
  const siblingScanLimit = opts?.siblingScanLimit ?? 10;

  const $img = $(imgEl);
  const $parent = $img.parent();

  const chunks: string[] = [];

  const heading = getNearestHeadingText($, imgEl);
  if (heading) chunks.push(`Section heading: ${heading}`);

  const collectSiblingText = (
    $start: cheerio.Cheerio<Element>,
    dir: "prev" | "next",
  ) => {
    let $node = dir === "prev" ? $start.prev() : $start.next();
    let steps = 0;

    while ($node.length && steps < siblingScanLimit) {
      if ($node.find("img").length === 0 && !$node.is("img")) {
        const t = normalizeWhitespace($node.text());
        if (t) chunks.push(`${dir === "prev" ? "Before" : "After"}: ${t}`);
      }
      $node = dir === "prev" ? $node.prev() : $node.next();
      steps++;
    }
  };

  collectSiblingText($img, "prev");
  collectSiblingText($img, "next");

  const joined = normalizeWhitespace(chunks.join("\n"));
  if (!joined) {
    const parentText = normalizeWhitespace($parent.text());
    return truncate(parentText, maxChars);
  }

  return truncate(joined, maxChars);
}

function createTurndown(): TurndownService {
  const turndown = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "_",
    strongDelimiter: "**",
  });

  turndown.addRule("removeEmptyParagraphs", {
    filter: (node) => {
      return (
        node.nodeName === "P" &&
        normalizeWhitespace(
          (node as unknown as HTMLElement).textContent ?? "",
        ) === ""
      );
    },
    replacement: () => "",
  });

  turndown.addRule("stripImages", {
    filter: "img",
    replacement: () => "",
  });

  return turndown;
}

function formatImageDescriptionBlock(markdownFromModel: string): string {
  const trimmed = (markdownFromModel ?? "").trim();

  if (!trimmed) {
    return `> Image description:\n> (No description returned.)`;
  }

  const lines = trimmed.split("\n").map((l) => l.trimEnd());
  const quoted = lines.map((l) => `> ${l.length ? l : ""}`).join("\n");

  if (lines[0].startsWith("-") || lines[0].startsWith("*")) {
    return `> Image description:\n${quoted}`;
  }

  return `> Image description:\n${quoted}`;
}

export const algoresearchIngest = inngest.createFunction(
  { id: "algoresearch-ingest", concurrency: 1 },
  { event: "data/algoresearch-ingest" },
  async ({ event, step }) => {
    const enrichedContent = await step.run("extract-image", async () => {
      const mergedHtml = [
        event.data.first_content.data.first_content,
        event.data.second_content.data.second_content,
      ]
        .filter(Boolean)
        .join("\n\n")
        .trim();

      const $ = cheerio.load(mergedHtml);

      const imgEls = $("img")
        .toArray()
        .filter((node): node is Element => {
          // domhandler node type guard-ish: only keep tags that are <img>
          if (!("name" in node) || (node as Element).name !== "img")
            return false;
          const src = $(node).attr("src");
          return isBase64DataImage(src);
        });

      const descriptions: Array<{ token: string; markdown: string }> = [];

      for (let i = 0; i < imgEls.length; i++) {
        const el = imgEls[i];
        const $img = $(el);

        const src = $img.attr("src") ?? "";
        const alt = normalizeWhitespace($img.attr("alt") ?? "");
        const context = getNeighborContextText($, el, {
          maxChars: 1400,
          siblingScanLimit: 10,
        });

        let bytes: Uint8Array;

        try {
          const parsed = parseDataUrlImage(src);
          bytes = parsed.bytes;
        } catch {
          const token = `__IMAGE_DESC_TOKEN_${i}_`;
          descriptions.push({
            token,
            markdown:
              "Could not parse embedded image data (invalid base64 data URL).",
          });
          $img.replaceWith(`<p>${token}</p>`);
          continue;
        }

        const prompt = [
          "Describe the image in English for a financial research note.",
          "Focus on what is actually visible: chart/axes/legend, tables, key numbers, trends, labels, and any source/caption if present.",
          "If text is too small to read, say so and summarize only what you can confidently infer from visible structure.",
          "Output Markdown only (no title). Prefer 3–8 bullet points. Keep it concise.",
          "",
          "Neighbor context (from surrounding article text):",
          context ? `- ${context}` : "- (no context available)",
          alt ? `- Image alt text: ${alt}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        let modelOutput = "";
        try {
          const result = await generateText({
            model: openrouter("google/gemini-2.5-flash-lite-preview-09-2025", {
              models: ["qwen/qwen3-vl-8b-instruct"],
            }),
            messages: [
              {
                role: "system",
                content:
                  "You are a precise financial research assistant. Do not hallucinate. If something is unreadable, say it is unreadable.",
              },
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  { type: "image", image: bytes },
                ],
              },
            ],
          });

          modelOutput = (result.text ?? "").trim();
        } catch {
          modelOutput =
            "Failed to generate an image description due to an upstream model/API error.";
        }

        const token = `__IMAGE_DESC_TOKEN_${i}_`;
        descriptions.push({ token, markdown: modelOutput });

        $img.replaceWith(`<p>${token}</p>`);
      }

      $("script, style, noscript").remove();

      const turndown = createTurndown();
      let markdown = turndown.turndown($.html());

      for (const { token, markdown: md } of descriptions) {
        const block = formatImageDescriptionBlock(md);
        markdown = markdown.replaceAll(token, block);
      }

      markdown = markdown.replace(/\n{3,}/g, "\n\n").trim();

      return markdown;
    });

    const payload: InvestmentDocument = await step.run(
      "prepare-payload",
      async () => {
        const symbols = (
          await extractSymbolFromTexts([
            `${event.data.article_title}\n${enrichedContent}`,
          ])
        )[0];

        const tagged = (
          await tagMetadata([
            {
              date: dayjs(event.data.published_at).format("YYYY-MM-DD"),
              content: enrichedContent,
              title: event.data.article_title,
              urls: [],
              subindustries: [],
              subsectors: [],
              symbols: symbols,
              indices: [],
            },
          ])
        )[0];

        const normalizedUrl = normalizeUrl(event.data.url);

        return {
          id: uuidv5(`${normalizedUrl}`, namespace),
          type: "analysis" as const,
          title: tagged.title,
          content: tagged.content,
          document_date: tagged.date,
          source: {
            name: "algoresearch",
            url: normalizedUrl,
          },
          urls: tagged.urls,
          symbols: tagged.symbols,
          subindustries: tagged.subindustries,
          subsectors: tagged.subsectors,
          indices: tagged.indices,
        };
      },
    );

    await step.run("ingest-document", async () => {
      return await knowledgeService.ingestDocuments({
        documents: [payload],
      });
    });
  },
);
