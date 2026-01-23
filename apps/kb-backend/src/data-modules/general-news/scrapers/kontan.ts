import axios from "axios";
import * as cheerio from "cheerio";
import type { Scraper, ScraperResult } from "./types.js";

/**
 * Scraper for kontan.co.id network (investasi, keuangan, industri)
 * URL pattern: https://{subdomain}.kontan.co.id/news/{title-slug}
 */
export const kontanScraper: Scraper = {
  supportsUrl: (url: string) => {
    return /https?:\/\/(investasi|keuangan|industri)\.kontan\.co\.id\/news\//.test(url);
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
    const timeElement = $('time[datetime]');
    if (timeElement.length) {
      publishedDate = timeElement.attr("datetime") || timeElement.text().trim();
    } else {
      publishedDate =
        $('meta[property="article:published_time"]').attr("content") ||
        $('[class*="date"]').first().text().trim() ||
        "";
    }

    // Extract content
    const contentArea = $("[itemprop='articleBody'], .detail-konten, [class*='article-content'], article").first();

    // Remove unwanted elements
    contentArea.find('script, style, .advertisement, [class*="iklan"], [class*="ad-"], [class*="related"], [class*="baca"], .share, iframe, figure').remove();

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
