import { NonRetriableError } from "inngest";
import { logger } from "../../../utils/logger.js";
import { bisnisScraper } from "./bisnis.js";
import { emitennewsScraper } from "./emitennews.js";
import { scrapeArticleViaExa } from "./exa.js";
import { idxchannelScraper } from "./idxchannel.js";
import { katadataScraper } from "./katadata.js";
import type { Scraper, ScraperResult } from "./types.js";

export { bisnisScraper } from "./bisnis.js";
export { emitennewsScraper } from "./emitennews.js";
export { idxchannelScraper } from "./idxchannel.js";
export { katadataScraper } from "./katadata.js";
// Export all scrapers
export * from "./types.js";

// Registry of all available scrapers
const scrapers: Scraper[] = [
  bisnisScraper,
  katadataScraper,
  idxchannelScraper,
  emitennewsScraper,
];

/**
 * Find and use the appropriate scraper for a given URL
 * @param url - The article URL to scrape
 * @returns ScraperResult with article data
 * @throws Error if no scraper supports the URL or scraping fails
 */
async function scrapeKnownURLArticle(url: string): Promise<ScraperResult> {
  const scraper = scrapers.find((s) => s.supportsUrl(url));

  if (!scraper) {
    throw new NonRetriableError(
      `No scraper found for URL: ${url}. Supported domains: bisnis.com, katadata.co.id, idxchannel.com, kontan.co.id, emitennews.com`,
    );
  }

  return await scraper.scrapeArticle(url);
}

/**
 * Check if a URL is supported by any scraper
 * @param url - The URL to check
 * @returns true if supported, false otherwise
 */
export function isSupportedUrl(url: string): boolean {
  return scrapers.some((s) => s.supportsUrl(url));
}

export async function scrapeGeneralNews(url: string): Promise<ScraperResult> {
  if (!isSupportedUrl(url)) {
    logger.info({ url }, "Scraping article via Exa fallback");
    return await scrapeArticleViaExa(url);
  }

  try {
    logger.info({ url }, "Scraping article via site scraper");
    return await scrapeKnownURLArticle(url);
  } catch (error) {
    logger.warn(
      { err: error, url },
      "Site scraper failed, retrying with Exa fallback",
    );
    return await scrapeArticleViaExa(url);
  }
}
