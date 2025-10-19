import * as cheerio from "cheerio";
import { convertHtmlToMarkdown } from "dom-to-semantic-markdown";
import he from "he";
import { JSDOM } from "jsdom";
import * as prettier from "prettier";

/**
 * Extract the most likely title from an HTML document.
 * @param {string} html - The raw HTML string
 * @returns {string|null} - The extracted title or null if not found
 */
export function extractTitle(html: string): string | null {
  const $ = cheerio.load(html);

  // 1. Standard <title>
  const title =
    $("head > title").first().text().trim() ||
    $('meta[property="og:title"]').attr("content") ||
    $('meta[name="twitter:title"]').attr("content");

  if (title) return title;

  // 2. Fallback: check top-level headings
  const h1 = $("h1").first().text().trim();
  if (h1) return h1;

  const h2 = $("h2").first().text().trim();
  if (h2) return h2;

  // 3. Check schema.org JSON-LD if available
  const ldJson = $('script[type="application/ld+json"]').html();
  if (ldJson) {
    try {
      const data = JSON.parse(ldJson);
      if (typeof data === "object") {
        if (Array.isArray(data)) {
          for (const obj of data) {
            if (obj.name) return obj.name;
            if (obj.headline) return obj.headline;
          }
        } else {
          if (data.name) return data.name;
          if (data.headline) return data.headline;
        }
      }
    } catch {
      // ignore JSON parse errors
    }
  }

  // 4. Fallback: first strong/bold text
  const strong = $("strong, b").first().text().trim();
  if (strong) return strong;

  // 5. Last resort: first big texty element
  const bigCandidate = $("body")
    .find("p, div, span")
    .filter((_, el) => $(el).text().trim().length > 20)
    .first()
    .text()
    .trim();
  if (bigCandidate) return bigCandidate;

  return null;
}

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
    console.error("Error formatting Markdown:", error);
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
    console.error("Error formatting Markdown:", error);
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

  return {
    title: extractTitle(raw),
    content: await formatMarkdown(processed),
  };
};
