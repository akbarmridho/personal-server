import axios from "axios";
import * as cheerio from "cheerio";
import TurndownService from "turndown";
import { v5 as uuidv5 } from "uuid";
import { inngest } from "../../infrastructure/inngest.js";
import {
  type InvestmentDocument,
  knowledgeService,
} from "../../infrastructure/knowledge-service.js";
import { extractSymbolFromTexts } from "../profiles/companies.js";
import { tagMetadata } from "../utils/tagging.js";

const turndownService = new TurndownService();

const namespace = "e06ac208-c609-4280-9b3c-980460e8abcf";

export const kiwoomDailyNewsIngest = inngest.createFunction(
  { id: "kiwoom-daily-news-ingest", concurrency: 1 },
  { event: "data/kiwoom-daily-news-ingest" },
  async ({ event, step }) => {
    const data = await step.run("extract", async () => {
      const { data: html } = await axios.get(
        `https://www.kiwoom.co.id/dailynews/detailDailyNewsMain?id=${event.data.id}`,
      );

      const $ = cheerio.load(html);

      const articles: Array<{ content: string; url: string }> = [];

      // We select only the <dd> elements inside .round-content
      // <dt> contains the title (which you want to ignore)
      // <dd> contains the body content and the URL
      $(".round-content dd").each((i, el) => {
        const $element = $(el);

        // 1. Extract the URL
        // Based on the HTML, the URL is always in the last <p> tag
        const $lastParagraph = $element.find("p").last();
        const urlText = $lastParagraph.text().trim();

        // Check if the last paragraph is actually a URL before removing it
        let url = "";
        if (urlText.startsWith("http")) {
          url = urlText;
          // Remove the URL paragraph from the DOM so it doesn't appear in the markdown
          $lastParagraph.remove();
        }

        // 2. Convert the remaining HTML content to Markdown
        // .html() retrieves the inner HTML (minus the removed URL paragraph)
        const contentHtml = $element.html();
        const markdownContent = turndownService.turndown(contentHtml || "");

        articles.push({
          content: markdownContent,
          url: url,
        });
      });

      return articles;
    });

    const payload: InvestmentDocument[] = await step.run(
      "prepare-payload",
      async () => {
        const symbols = await extractSymbolFromTexts(
          data.map((e) => e.content),
        );

        const tagged = await tagMetadata(
          data.map((e, i) => {
            return {
              date: event.data.date,
              content: e.content,
              title: null,
              urls: [e.url],
              subindustries: [],
              subsectors: [],
              symbols: symbols[i],
              indices: [],
            };
          }),
        );

        return tagged.map((e) => {
          return {
            id: uuidv5(`${e.content}`, namespace),
            type: "news" as const,
            title: e.title,
            content: e.content,
            document_date: e.date,
            source: {
              name: "kiwoom-daily-news",
              url: `https://www.kiwoom.co.id/dailynews/detailDailyNewsMain?id=${event.data.id}`,
            },
            urls: e.urls,
            symbols: e.symbols,
            subindustries: e.subindustries,
            subsectors: e.subsectors,
            indices: e.indices,
          };
        });
      },
    );

    await step.run("ingest-document", async () => {
      return await knowledgeService.ingestDocuments({
        documents: payload,
      });
    });
  },
);

export const kiwoomInternationalNewsIngest = inngest.createFunction(
  { id: "kiwoom-international-news-ingest", concurrency: 1 },
  { event: "data/kiwoom-international-news-ingest" },
  async ({ event, step }) => {
    const data = await step.run("extract", async () => {
      const response = await axios.get(
        `https://www.kiwoom.co.id/dailynews/detailDailyNewsMain?id=${event.data.id}`,
      );

      const html: string = response.data;
      const $: cheerio.CheerioAPI = cheerio.load(html);

      // Assumed to exist as per instructions
      const turndownService = new TurndownService();

      const articles: Array<{ title: string; content: string; url: string }> =
        [];

      // State variables to track the parsing progress
      let currentTitle: string | null = null;
      let currentContentRaw: string = "";

      // Iterate over all paragraphs inside the target container
      $(".round-content dd p").each((_i, el) => {
        const $el = $(el);
        const text = $el.text().trim();

        // Safety check: ensure we have HTML content, default to empty string
        const elementHtml = $.html($el) || "";

        // CASE A: Detect Title
        // Logic: Titles are wrapped in <strong> tags
        if ($el.find("strong").length > 0) {
          // If we hit a new title but were already tracking one (and haven't found a URL yet),
          // we discard the previous incomplete data or handle it as needed.
          // Here we simply reset for the new article.

          currentTitle = text;
          currentContentRaw = ""; // Reset accumulated content
          return; // Skip to next iteration
        }

        // CASE B: Detect URL (End of Article)
        // Logic: Contains an anchor tag AND text starts with 'http'
        if (
          currentTitle &&
          $el.find("a").length > 0 &&
          text.startsWith("http")
        ) {
          const markdownContent = turndownService.turndown(currentContentRaw);

          articles.push({
            title: currentTitle,
            content: markdownContent,
            url: text,
          });

          // Reset state variables after finishing an article
          currentTitle = null;
          currentContentRaw = "";
          return;
        }

        // CASE C: Detect Body Content
        // Logic: If we have an active Title, this paragraph belongs to the body.
        // We ignore empty lines or non-breaking spaces commonly used as spacers.
        if (currentTitle && text.length > 0 && text !== "&nbsp;") {
          currentContentRaw += elementHtml;
        }
      });

      return articles;
    });

    const payload: InvestmentDocument[] = await step.run(
      "prepare-payload",
      async () => {
        const symbols = await extractSymbolFromTexts(
          data.map((e) => e.content),
        );

        const tagged = await tagMetadata(
          data.map((e, i) => {
            return {
              date: event.data.date,
              content: e.content,
              title: e.title,
              urls: [e.url],
              subindustries: [],
              subsectors: [],
              symbols: symbols[i],
              indices: [],
            };
          }),
        );

        return tagged.map((e) => {
          return {
            id: uuidv5(`${e.content}`, namespace),
            type: "news" as const,
            title: e.title,
            content: e.content,
            document_date: e.date,
            source: {
              name: "kiwoom-international-news",
              url: `https://www.kiwoom.co.id/internationalnews/detailInternationalNewsMain?id=${event.data.id}`,
            },
            urls: e.urls,
            symbols: e.symbols,
            subindustries: e.subindustries,
            subsectors: e.subsectors,
            indices: e.indices,
          };
        });
      },
    );

    await step.run("ingest-document", async () => {
      return await knowledgeService.ingestDocuments({
        documents: payload,
      });
    });
  },
);
