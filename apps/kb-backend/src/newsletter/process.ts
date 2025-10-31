import { loadDotenv } from "@personal-server/common/utils/load-dotenv";

loadDotenv();

import { readdir, readFile, writeFile } from "node:fs/promises";
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

async function processNewsletters() {
  const inputDir = join(process.cwd(), "newsletter-data");
  const files = await readdir(inputDir);
  const htmlFiles = files.filter((f) => f.endsWith(".html"));

  for (const file of htmlFiles) {
    try {
      logger.info({ file }, "Processing newsletter");

      const content = await readFile(join(inputDir, file), "utf-8");

      // const mdContent = await htmlToMarkdown(content);
      let mdContent = turndownService.turndown(content);

      mdContent = mdContent.replaceAll(" ", " ");

      const trimPhrase = "Kutipan menarik dari komunitas Stockbit minggu ini";
      const trimIndex = mdContent.indexOf(trimPhrase);
      if (trimIndex !== -1) {
        mdContent = mdContent.substring(0, trimIndex).trim();
      }

      mdContent = mdContent.substring(mdContent.indexOf("\n") + 1);

      mdContent = await resolveEmailerLinks(mdContent);

      const outmd = file.replace(".html", ".md");
      await writeFile(join(inputDir, outmd), mdContent, { encoding: "utf-8" });

      const extracted = await processNewsletter(mdContent);

      const outputFile = file.replace(".html", ".json");
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
