import axios from "axios";
import * as cheerio from "cheerio";
import normalizeUrl from "normalize-url";
import TurndownService from "turndown";
import { v5 as uuidv5 } from "uuid";
import { inngest } from "../../infrastructure/inngest.js";
import {
  type InvestmentDocument,
  knowledgeService,
} from "../../infrastructure/knowledge-service.js";
import { extractSymbolFromText } from "../profiles/companies.js";
import { extractDate } from "../utils/date.js";
import { tagMetadata } from "../utils/tagging.js";

// just update this when it breaks
const dateSelector = '[data-id="cec2d33"] h2';
const titleSelector = '[data-id="736379f"] h2';
const contentSelector = '[data-id="9ec88d1"]';
const linksContainerSelector = '[data-id="8fd5f95"] a';

function removeLineSeparators(content: string): string {
  // Remove lines that only contain repeated characters (line separators)
  return content
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (trimmed.length === 0) return true; // Keep empty lines
      // Check if line contains only one repeated character
      const firstChar = trimmed[0];
      return !trimmed.split("").every((char) => char === firstChar);
    })
    .join("\n");
}

const turndownService = new TurndownService();

const namespace = "eb4cf481-8756-4f33-86a1-7529f5c56435";

export const samuelCompanyReportIngest = inngest.createFunction(
  { id: "samuel-company-report-ingest", concurrency: 1 },
  { event: "data/samuel-company-report-ingest" },
  async ({ event, step }) => {
    const data = await step.run("extract", async () => {
      const { data: html } = await axios.get(event.data.url);
      const $ = cheerio.load(html);

      // Extract date and convert to YYYY-MM-DD format
      const dateElement = $(dateSelector);
      const dateText = dateElement.text().trim();
      const formattedDate = extractDate(dateText);

      // Extract content HTML and convert to markdown with turndown
      const contentElement = $(contentSelector);
      const contentHtml = contentElement.html() || "";
      const contentMarkdown = removeLineSeparators(
        turndownService.turndown(contentHtml),
      );

      // Extract all links from the links container
      const links: Set<string> = new Set();
      $(linksContainerSelector).each((_, element) => {
        const href = $(element).attr("href");
        if (href) {
          links.add(normalizeUrl(href));
        }
      });

      // Extract title text
      const titleElement = $(titleSelector);
      const title = titleElement.text().trim();

      // Create result object
      return {
        date: formattedDate,
        title,
        content: contentMarkdown,
        links: [...links],
      };
    });

    const payload: InvestmentDocument = await step.run(
      "prepare-payload",
      async () => {
        const symbols = await extractSymbolFromText(
          `${data.title}\n${data.content}`,
        );

        const tagged = (
          await tagMetadata([
            {
              date: data.date,
              content: data.content,
              title: data.title,
              urls: data.links,
              subindustries: [],
              subsectors: [],
              symbols: symbols,
              indices: [],
            },
          ])
        )[0];

        return {
          id: uuidv5(`${event.data.url}`, namespace),
          type: "analysis" as const,
          title: tagged.title,
          content: tagged.content,
          document_date: tagged.date,
          source: {
            name: "samuel-research-report",
            url: event.data.url,
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
