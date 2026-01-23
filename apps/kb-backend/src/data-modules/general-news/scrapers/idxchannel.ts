import axios from "axios";
import * as cheerio from "cheerio";
import type { Scraper, ScraperResult } from "./types.js";

/**
 * Scraper for idxchannel.com
 * URL pattern: https://www.idxchannel.com/market-news/{title-slug}
 */
export const idxchannelScraper: Scraper = {
  supportsUrl: (url: string) => {
    return /https?:\/\/(www\.)?idxchannel\.com\//.test(url);
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

    // Try JSON-LD structured data first
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const jsonText = $(el).html();
        if (jsonText) {
          const data = JSON.parse(jsonText);
          if (data.datePublished) {
            publishedDate = data.datePublished;
            return false; // break loop
          }
        }
      } catch {
        // Skip invalid JSON
      }
    });

    // Fallback: try .article--creator div (3rd element = 1st div)
    if (!publishedDate) {
      const creatorDiv = $(".article--creator div").first().text().trim();
      if (creatorDiv) {
        publishedDate = creatorDiv;
      }
    }

    // Fallback: standard selectors
    if (!publishedDate) {
      const timeElement = $("time[datetime]");
      if (timeElement.length) {
        publishedDate =
          timeElement.attr("datetime") || timeElement.text().trim();
      } else {
        publishedDate =
          $('meta[property="article:published_time"]').attr("content") ||
          $('[class*="date"], [class*="time"]').first().text().trim() ||
          "";
      }
    }

    // Extract content
    const contentArea = $(
      ".detail-content, [class*='article-body'], article",
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
