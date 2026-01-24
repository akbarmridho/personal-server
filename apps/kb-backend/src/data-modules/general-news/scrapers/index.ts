import { NonRetriableError } from "inngest";
import { bisnisScraper } from "./bisnis.js";
import { emitennewsScraper } from "./emitennews.js";
import { idxchannelScraper } from "./idxchannel.js";
import { katadataScraper } from "./katadata.js";
import { kontanScraper } from "./kontan.js";
import type { Scraper, ScraperResult } from "./types.js";

export { bisnisScraper } from "./bisnis.js";
export { emitennewsScraper } from "./emitennews.js";
export { idxchannelScraper } from "./idxchannel.js";
export { katadataScraper } from "./katadata.js";
export { kontanScraper } from "./kontan.js";
// Export all scrapers
export * from "./types.js";

// Registry of all available scrapers
const scrapers: Scraper[] = [
  bisnisScraper,
  katadataScraper,
  idxchannelScraper,
  kontanScraper,
  emitennewsScraper,
];

/**
 * Find and use the appropriate scraper for a given URL
 * @param url - The article URL to scrape
 * @returns ScraperResult with article data
 * @throws Error if no scraper supports the URL or scraping fails
 */
export async function scrapeArticle(url: string): Promise<ScraperResult> {
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
