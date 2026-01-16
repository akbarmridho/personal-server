import * as cheerio from "cheerio";
import { convertHtmlToMarkdown } from "dom-to-semantic-markdown";
import he from "he";
import { JSDOM } from "jsdom";
import * as prettier from "prettier";
import { logger } from "./logger.js";

export async function formatMarkdown(
  unformattedMarkdown: string,
): Promise<string> {
  try {
    const formattedMarkdown = await prettier.format(unformattedMarkdown, {
      parser: "markdown",
      plugins: [await import("prettier/plugins/markdown")],
      printWidth: 80,
      proseWrap: "never",
    });

    return formattedMarkdown;
  } catch (error) {
    logger.error({ error }, "Error formatting Markdown:");
    throw error;
  }
}

export async function formatHtml(unformatted: string): Promise<string> {
  try {
    const formatted = await prettier.format(unformatted, {
      parser: "html",
      plugins: [await import("prettier/plugins/html")],
      proseWrap: "never",
    });

    return formatted;
  } catch (error) {
    logger.error({ error }, "Error formatting Markdown:");
    throw error;
  }
}

export function cleanHtml(html: string) {
  const $ = cheerio.load(html);

  // 1. Remove <style> and <script> blocks
  $("style, script").remove();

  // 2. Remove inline styles and unnecessary attributes
  $("[style]").removeAttr("style");
  $("[class]").removeAttr("class");
  $("[id]").removeAttr("id");

  // 3. Remove all data-* attributes
  $("*").each((_, el) => {
    const attribs = (el as any).attribs || {};
    for (const name of Object.keys(attribs)) {
      if (name.startsWith("data-")) {
        $(el).removeAttr(name);
      }
    }
  });

  $("img").each((_, el) => {
    const src = $(el).attr("src") || "";
    if (src.toLowerCase().endsWith(".gif")) {
      $(el).remove();
    }
  });

  // 4. Remove empty spans/divs/headings/paragraphs
  $(
    "span:empty, div:empty, h1:empty, h2:empty, h3:empty, h4:empty, h5:empty, p:empty",
  ).remove();

  // 5. Remove images inside tables
  $("table img").remove();

  // 6. Collapse multiple newlines/spaces
  const cleaned = $.html()
    .replace(/\n\s*\n\s*\n+/g, "\n\n") // too many blank lines
    .replace(/[ \t]+/g, " "); // redundant spaces

  return cleaned.trim();
}

function removeEmptyHeadings(markdown: string): string {
  // Match headings that have only `#` and whitespace after them
  return markdown.replace(/^(#{1,6})\s*$/gm, "");
}

function cleanHeadings(content: string): string {
  const headingRegex =
    /^(#{1,6})\s*(?:\[(.*?)\](?:\(.*?\)|#\(.*?\s*".*?"\))|(.+?)\s*\[\]\(.*?\)|(?:\[\]\(.*?\))(.+?)|(.+?)\[#\]\(.*?\s*".*?"\))\s*$/gm;

  return content.replace(
    headingRegex,
    (_, hashes, linkedText, beforeEmptyLink, afterEmptyLink, textWithHash) => {
      const text =
        linkedText || beforeEmptyLink || afterEmptyLink || textWithHash || "";
      return `${hashes} ${text.trim()}\n`;
    },
  );
}

// Normalize Markdown link URLs (fix escapes like "\&" → "&", decode HTML entities, trim spaces)
function normalizeMarkdownLinks(markdown: string): string {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  return markdown.replace(linkRegex, (match, text, url) => {
    const cleanText = text.trim();
    const cleanUrl = he
      .decode(url) // decode HTML entities (&amp; → &)
      .replace(/\\&/g, "&") // unescape \&
      .trim();
    return `[${cleanText}](${cleanUrl})`;
  });
}

export const htmlToMarkdown = async (raw: string) => {
  const content = cleanHtml(raw);
  const dom = new JSDOM(content);

  let processed = convertHtmlToMarkdown(content, {
    overrideDOMParser: new dom.window.DOMParser(),
    extractMainContent: true,
    enableTableColumnTracking: false,
  });

  processed = normalizeMarkdownLinks(processed);
  processed = cleanHeadings(processed);
  processed = removeEmptyHeadings(processed);

  return await formatMarkdown(processed);
};
