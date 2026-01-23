# General News Scrapers

Modular scrapers for Indonesian financial news websites using axios and cheerio.

## Supported Websites (5)

| Website | Subdomain Pattern | Selector Strategy |
|---------|-------------------|-------------------|
| **Bisnis.com** | `market.bisnis.com`, `finansial.bisnis.com` | `.detail__body-text` |
| **Katadata** | `katadata.co.id` | `[class*='article__body']` |
| **IDXChannel** | `www.idxchannel.com` | `.detail-content` + JSON-LD |
| **Kontan** | `investasi/keuangan/industri.kontan.co.id` | `[itemprop='articleBody']` |
| **Emitennews** | `www.emitennews.com` | `.article-body` + `.time-posted` |

## Architecture

```typescript
// Main router (index.ts)
scrapeArticle(url: string): Promise<ScraperResult>
isSupportedUrl(url: string): boolean

// ScraperResult interface (types.ts)
{
  title: string;        // Article title
  content: string;      // Plain text (paragraphs joined with \n\n)
  publishedDate: string; // ISO 8601 or parseable format
  url: string;          // Original URL
}

// Each scraper (bisnis.ts, katadata.ts, etc.)
export const scraperName: Scraper = {
  supportsUrl: (url) => /regex/.test(url),
  scrapeArticle: async (url) => { ... }
}
```

## Content Extraction Logic

1. **Find content area**: Use website-specific selector
2. **Remove noise**: Scripts, ads, figures, iframes, related articles
3. **Extract paragraphs**: Filter `<p>` tags where text length > 50 chars
4. **Join content**: Paragraphs joined with `\n\n`

## Date Extraction Methods

- **Standard**: `<time datetime>` attribute
- **IDXChannel**: JSON-LD structured data (`<script type="application/ld+json">`)
- **Emitennews**: `.time-posted` selector
- **Kontan**: `[itemprop='articleBody']` with meta tags

## Test Results

All 41 URLs from sample.md tested successfully:
- ✅ 100% success rate (41/41)
- ✅ 100% date extraction (41/41)
- ✅ Average content: 937-3,390 chars per website

## Adding New Scrapers

1. Create `scrapers/newsite.ts`:
```typescript
import axios from "axios";
import * as cheerio from "cheerio";
import type { Scraper, ScraperResult } from "./types.js";

export const newsiteScraper: Scraper = {
  supportsUrl: (url: string) => /https?:\/\/newsite\.com\//.test(url),

  scrapeArticle: async (url: string): Promise<ScraperResult> => {
    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 ..." }
    });
    const $ = cheerio.load(response.data);

    const title = $("h1").first().text().trim();
    const publishedDate = $('time[datetime]').attr("datetime") || "";

    const contentArea = $("article").first();
    contentArea.find('script, style, .ad').remove();

    const paragraphs: string[] = [];
    contentArea.find("p").each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 50) paragraphs.push(text);
    });

    return { title, content: paragraphs.join("\n\n"), publishedDate, url };
  }
};
```

2. Register in `scrapers/index.ts`:
```typescript
import { newsiteScraper } from "./newsite.js";
export { newsiteScraper } from "./newsite.js";

const scrapers: Scraper[] = [
  bisnisScraper, katadataScraper, idxchannelScraper,
  kontanScraper, emitennewsScraper,
  newsiteScraper, // Add here
];
```

3. Test with actual URLs before deploying.
