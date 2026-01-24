import axios from "axios";
import * as cheerio from "cheerio";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import type { Scraper, ScraperResult } from "./types.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

/**
 * Scraper for emitennews.com
 * URL pattern: https://www.emitennews.com/news/{title-slug}
 */
export const emitennewsScraper: Scraper = {
  supportsUrl: (url: string) => {
    return /https?:\/\/(www\.)?emitennews\.com\/news\//.test(url);
  },

  scrapeArticle: async (url: string): Promise<ScraperResult> => {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });

    const $ = cheerio.load(response.data);

    // Extract title
    const title =
      $("h1").first().text().trim() ||
      $('meta[property="og:title"]').attr("content") ||
      $("title").text().trim();

    // Extract date
    let publishedDate = "";
    // Try .time-posted first (emitennews specific)
    const timePosted = $(".time-posted").text().trim();
    if (timePosted) {
      // Parse date format: "13/01/2026, 15:48 WIB"
      // WIB = Western Indonesian Time (GMT+7 = Asia/Jakarta)
      const parsedDate = dayjs.tz(
        timePosted,
        "DD/MM/YYYY, HH:mm",
        "Asia/Jakarta",
      );
      if (parsedDate.isValid()) {
        publishedDate = parsedDate.toISOString();
      } else {
        // Fallback to original text if parsing fails
        publishedDate = timePosted;
      }
    }

    // Extract content
    const contentArea = $(
      ".article-body, [class*='article-content'], article",
    ).first();

    // Remove unwanted elements
    contentArea
      .find(
        'script, style, .advertisement, [class*="ad"], [class*="related"], .share, iframe, .tags, figure',
      )
      .remove();

    // Get paragraphs and convert to markdown
    const paragraphs: string[] = [];
    contentArea.find("p").each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 50) {
        paragraphs.push(text);
      }
    });

    const content = paragraphs.join("\n\n");

    if (!title || !content) {
      throw new Error(
        `Failed to scrape article from ${url}: ${
          !title ? "No title found" : "No content found"
        }`,
      );
    }

    return {
      title,
      content,
      publishedDate,
      url,
    };
  },
};
