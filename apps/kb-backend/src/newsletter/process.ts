import { loadDotenv } from "@personal-server/common/utils/load-dotenv";

loadDotenv();

import { access, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { logger } from "@personal-server/common/utils/logger";
import TurndownService from "turndown";
import { processNewsletter } from "./extractor.js";

const turndownService = new TurndownService();

async function resolveRedirect(url: string): Promise<string> {
  try {
    const response = await fetch(url, { redirect: "manual" });
    return response.headers.get("location") || url;
  } catch {
    return url;
  }
}

async function resolveEmailerLinks(content: string): Promise<string> {
  const regex = /https:\/\/emailer\.stockbit\.com\/[^\s)]+/g;
  const links = content.match(regex) || [];
  const uniqueLinks = [...new Set(links)];

  const resolved = await Promise.all(
    uniqueLinks.map(
      async (link) => [link, await resolveRedirect(link)] as const,
    ),
  );

  let result = content;
  for (const [original, redirected] of resolved) {
    result = result.replaceAll(original, redirected);
  }
  return result;
}

function removeStockbitSymbolLinks(content: string): string {
  return content.replace(/https:\/\/stockbit\.com\/symbol\/[A-Z]{4}\b/g, "");
}

function normalizeToAscii(content: string): string {
  return content
    .replace(/[\u2000-\u200B\u202F\u00A0]/g, " ") // various spaces -> space
    .replace(/[\u2010-\u2015\u2212]/g, "-") // various dashes -> hyphen
    .replace(/[\u2018\u2019\u201B]/g, "'") // smart single quotes -> apostrophe
    .replace(/[\u201C\u201D\u201E]/g, '"') // smart double quotes -> quote
    .replace(/\u2026/g, "...") // ellipsis -> three dots
    .replace(/[\u2032\u00B4]/g, "'") // prime/acute -> apostrophe
    .replace(/\u2033/g, '"'); // double prime -> quote
}

async function processNewsletters() {
  const inputDir = join(process.cwd(), "newsletter-data");
  const files = await readdir(inputDir);
  const htmlFiles = files.filter((f) => f.endsWith(".html"));

  for (const file of htmlFiles) {
    try {
      const outputFile = file.replace(".html", ".json");
      try {
        await access(join(inputDir, outputFile));
        logger.info({ file }, "Skipping - JSON already exists");
        continue;
      } catch {}

      logger.info({ file }, "Processing newsletter");

      const content = await readFile(join(inputDir, file), "utf-8");

      let mdContent = turndownService.turndown(content);

      mdContent = await resolveEmailerLinks(mdContent);

      logger.info({ file }, "resolved emailer links");

      mdContent = removeStockbitSymbolLinks(mdContent);
      mdContent = normalizeToAscii(mdContent);

      const trimPhrase = "Kutipan menarik dari komunitas Stockbit minggu ini";
      const trimIndex = mdContent.indexOf(trimPhrase);
      if (trimIndex !== -1) {
        mdContent = mdContent.substring(0, trimIndex).trim();
      }

      mdContent = mdContent.substring(mdContent.indexOf("\n") + 1);

      const outmd = file.replace(".html", ".md");
      await writeFile(join(inputDir, outmd), mdContent, { encoding: "utf-8" });

      logger.info({ file }, "processing");

      const extracted = await processNewsletter(mdContent);

      await writeFile(
        join(inputDir, outputFile),
        JSON.stringify(extracted, null, 2),
      );

      logger.info({ file: outputFile }, "Newsletter processed");
    } catch (error) {
      logger.error({ err: error, file }, "Failed to process newsletter");
    }
  }
}

processNewsletters();
