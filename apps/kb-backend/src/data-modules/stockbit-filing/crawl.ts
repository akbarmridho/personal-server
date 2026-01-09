import { AxiosError } from "axios";
import { NonRetriableError } from "inngest";
import { KV } from "../../infrastructure/db/kv.js";
import { inngest } from "../../infrastructure/inngest.js";
import { proxiedAxios } from "../../stock/proxy.js";
import { stockbitAuth } from "../../stock/stockbit/auth.js";
import { logger } from "../../utils/logger.js";

type ReportType = "RUPS" | "CORPORATE_ACTION" | "OTHER";

interface FilterConfig {
  include: string[]; // Keywords that MUST appear
  exclude: string[]; // Keywords to skip
}

interface AnnouncementItem {
  stream_id: number;
  title_url: string;
  title: string;
  created_at: string;
  symbol: string;
  report_type: ReportType;
}

interface StockbitStreamItem {
  stream_id: number;
  title_url: string;
  title: string;
  created_at: string;
}

interface StockbitStreamResponse {
  data: {
    stream?: StockbitStreamItem[];
  };
}

// Filter configurations based on brief.md
const RUPS_FILTERS: FilterConfig = {
  include: ["laporan hasil", "penyampaian materi", "ringkasan"],
  exclude: [
    "rencana penyelenggaran",
    "penyampaian bukti iklan",
    "pemanggilan rapat umum",
    "pemberitahuan rencana rapat umum",
  ],
};

const CORP_ACTION_FILTERS: FilterConfig = {
  include: ["keterbukaan informasi"],
  exclude: [],
};

const OTHER_FILTERS: FilterConfig = {
  include: [
    "keterbukaan informasi",
    "penyampaian press release",
    "informasi tambahan",
    "tambahan informasi",
    "penyampaian laporan",
    "penyampaian prospektus",
  ],
  exclude: [],
};

// Global excludes applied to all categories
const GLOBAL_EXCLUDES = ["laporan keuangan", "dividend", "dividen"];

async function crawlCategory(
  symbol: string,
  reportType: ReportType,
  filters: FilterConfig,
): Promise<AnnouncementItem[]> {
  const keystoneName = `data-modules.stockbit-filing.${symbol}.${reportType.toLowerCase()}-last-id`;

  // 1. Get last crawl state
  const lastCrawl = (await KV.get(keystoneName)) as { id: number } | null;

  // 2. Determine page size: backfill if no state, incremental otherwise
  const limit = lastCrawl ? 20 : 100;

  logger.info(
    `Crawling ${reportType} for ${symbol} (limit: ${limit}, last_id: ${lastCrawl?.id || "none"})`,
  );

  // 3. Get auth data
  const authData = await stockbitAuth.get();
  if (!authData) {
    throw new NonRetriableError("Stockbit auth not found");
  }

  // 4. Fetch from Stockbit API
  const reportTypeParam = `REPORT_TYPE_${reportType}`;
  const url = `https://exodus.stockbit.com/stream/v3/symbol/${symbol}?category=STREAM_CATEGORY_REPORTS&last_stream_id=0&limit=${limit}&report_type=${reportTypeParam}`;

  try {
    const response = await proxiedAxios.get<StockbitStreamResponse>(url, {
      headers: {
        Authorization: `Bearer ${authData.accessToken}`,
      },
    });

    const items = response.data.data.stream || [];

    // 4. Filter by ID (if incremental)
    let filtered = items;
    if (lastCrawl) {
      filtered = items.filter((item) => item.stream_id > lastCrawl.id);
      logger.info(
        `Filtered ${items.length} items to ${filtered.length} new items by ID`,
      );
    }

    // 5. Apply keyword filters
    const beforeFilterCount = filtered.length;
    filtered = filtered.filter((item) => {
      const title = item.title.toLowerCase();

      // Check excludes first (global + category-specific)
      const allExcludes = [...GLOBAL_EXCLUDES, ...filters.exclude];
      if (allExcludes.some((keyword) => title.includes(keyword))) {
        return false;
      }

      // Check includes (startsWith for some keywords, includes for others)
      return filters.include.some((keyword) => {
        if (
          keyword === "keterbukaan informasi" ||
          keyword === "penyampaian press release"
        ) {
          return title.startsWith(keyword);
        }
        return title.includes(keyword);
      });
    });

    logger.info(
      `Applied keyword filters: ${beforeFilterCount} items -> ${filtered.length} items`,
    );

    // 6. Update state marker if new items found
    if (filtered.length > 0) {
      const maxId = Math.max(...filtered.map((item) => item.stream_id));
      await KV.set(keystoneName, {
        id: maxId,
        updated_at: new Date().toISOString(),
      });
      logger.info(`Updated ${keystoneName} to ID ${maxId}`);
    }

    // 7. Transform to announcement items
    return filtered.map((item) => ({
      stream_id: item.stream_id,
      title_url: item.title_url,
      title: item.title,
      created_at: item.created_at,
      symbol: symbol,
      report_type: reportType,
    }));
  } catch (error) {
    // Handle authentication errors as non-retriable
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        logger.error(
          `Authentication error (${status}) crawling ${reportType} for ${symbol}`,
        );
        throw new NonRetriableError(
          `Stockbit API authentication failed: ${status}`,
        );
      }
    }

    logger.error(
      `Error crawling ${reportType} for ${symbol}: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

export const stockbitFilingCrawl = inngest.createFunction(
  {
    id: "stockbit-filing-crawl",
    concurrency: 1,
  },
  { event: "data/stockbit-filing-crawl" },
  async ({ event, step }) => {
    const symbol = event.data.symbol as string;

    if (!symbol) {
      throw new Error("Symbol is required in event data");
    }

    logger.info(`Starting filing crawl for symbol: ${symbol}`);

    // Step 1: Crawl RUPS/Public Expose
    const rupsItems = await step.run("crawl-rups", async () => {
      return await crawlCategory(symbol, "RUPS", RUPS_FILTERS);
    });

    // Step 2: Crawl Corporate Action
    const corpActionItems = await step.run(
      "crawl-corporate-action",
      async () => {
        return await crawlCategory(
          symbol,
          "CORPORATE_ACTION",
          CORP_ACTION_FILTERS,
        );
      },
    );

    // Step 3: Crawl Other
    const otherItems = await step.run("crawl-other", async () => {
      return await crawlCategory(symbol, "OTHER", OTHER_FILTERS);
    });

    // Step 4: Emit ingest events
    const allItems = [...rupsItems, ...corpActionItems, ...otherItems];

    if (allItems.length > 0) {
      await step.sendEvent(
        "queue-ingest",
        allItems.map((item) => ({
          name: "data/stockbit-announcement-ingest",
          data: item,
        })),
      );

      logger.info(
        `Emitted ${allItems.length} ingest events for symbol ${symbol}`,
      );
    }

    return {
      symbol,
      total: allItems.length,
      breakdown: {
        rups: rupsItems.length,
        corporateAction: corpActionItems.length,
        other: otherItems.length,
      },
    };
  },
);
