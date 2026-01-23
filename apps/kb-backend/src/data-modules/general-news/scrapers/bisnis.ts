import axios from "axios";
import * as cheerio from "cheerio";
import type { Scraper, ScraperResult } from "./types.js";

/**
 * Scraper for bisnis.com network (market.bisnis.com, finansial.bisnis.com)
 * URL pattern: https://{subdomain}.bisnis.com/read/YYYYMMDD/category/id/title-slug
 */
export const bisnisScraper: Scraper = {
  supportsUrl: (url: string) => {
    return /https?:\/\/(market|finansial)\.bisnis\.com\/read\//.test(url);
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
    const timeElement = $("time[datetime]");
    if (timeElement.length) {
      publishedDate = timeElement.attr("datetime") || timeElement.text().trim();
    } else {
      // Fallback: look for date in meta tags
      publishedDate =
        $('meta[property="article:published_time"]').attr("content") ||
        $('meta[name="publish-date"]').attr("content") ||
        "";
    }

    // Extract content
    // Find the main article body
    const contentArea = $(
      ".detail__body-text, [class*='article-content'], article, main",
    ).first();

    // Remove advertisements, related articles, and other noise
    contentArea
      .find(
        'script, style, .advertisement, [class*="ad-"], [class*="related"], [class*="terkait"], .share, [class*="share"], figure, iframe',
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
