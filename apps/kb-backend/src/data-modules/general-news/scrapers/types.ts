export interface ScraperResult {
  title: string;
  content: string; // Markdown content
  publishedDate: string; // ISO 8601 or parseable date string
  url: string;
}

export interface Scraper {
  /**
   * Whether this scraper requires outbound HTTP proxy to work.
   */
  requiresProxy?: boolean;

  /**
   * Scrape a single article from URL
   */
  scrapeArticle: (url: string) => Promise<ScraperResult>;

  /**
   * Check if this scraper supports the given URL
   */
  supportsUrl: (url: string) => boolean;
}
