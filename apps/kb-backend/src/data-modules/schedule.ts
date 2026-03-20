// every date 1
export const PHINTRACO_COMPANY_UPDATE_CRAWL_DUMMY_CRON =
  "TZ=Asia/Jakarta 0 0 1 * *";

// daily at 08:55
export const GENERAL_NEWS_KG_CRAWL_CRON = "TZ=Asia/Jakarta 55 8 * * *";

// daily at 09:00 from monday to friday
export const SAMUEL_MORNING_BRIEF_CRAWL_CRON = "TZ=Asia/Jakarta 0 9 * * 1-5";

// daily at 09:05
export const KIWOOM_DAILY_NEWS_CRAWL_CRON = "TZ=Asia/Jakarta 5 9 * * *";

// daily at 09:05 from monday to friday
export const KIWOOM_INTERNATIONAL_NEWS_CRAWL_CRON =
  "TZ=Asia/Jakarta 5 9 * * 1-5";

// run every friday 16.00
export const PROFILES_UPDATE_COMPANIES_CRON = "TZ=Asia/Jakarta 0 16 * * 5";

// daily at 19.30
export const KISI_MONTHLY_RESEARCH_CRAWL_CRON = "TZ=Asia/Jakarta 30 19 * * *";

// daily at 19:35 from monday to friday
export const KIWOOM_EQUITY_REPORT_CRAWL_CRON = "TZ=Asia/Jakarta 35 19 * * 1-5";

// daily at 19.40
export const HP_STOCK_UPDATE_CRAWL_CRON = "TZ=Asia/Jakarta 40 19 * * *";

// daily at 19.45
export const YOUTUBE_CHANNEL_CRAWL_INIT_CRON = "TZ=Asia/Jakarta 45 19 * * *";

// daily at 19.50 from monday to friday
export const ALGORESEARCH_CRAWL_CRON = "TZ=Asia/Jakarta 50 19 * * 1-5";

// daily at 19.55
export const SAMUEL_COMPANY_REPORTS_CRAWL_CRON = "TZ=Asia/Jakarta 55 19 * * *";

// daily at 20.05 from monday to friday
// not used
export const PHINTRACO_COMPANY_UPDATE_CRAWL_CRON =
  "TZ=Asia/Jakarta 5 20 * * 1-5";

// daily at 20.05
export const PHINTRACO_TELEGRAM_CRAWL_CRON = "TZ=Asia/Jakarta 20 5 * * *";

// daily at 20.10 from monday to friday
export const HP_MARKET_UPDATE_CRAWL_CRON = "TZ=Asia/Jakarta 10 20 * * 1-5";

// daily at 20.15 from monday to friday
export const SNIPS_CRAWL_CRON = "TZ=Asia/Jakarta 15 20 * * 1-5";

// ------------

// Tuesday – Thursday – Saturday @ 20:00 WIB
export const GROUNDED_NEWS_RUMOUR_SCRAPE_CRON =
  "TZ=Asia/Jakarta 0 20 * * 2,4,6";

// Tuesday – Thursday – Saturday @ 20:05 WIB
export const TWITTER_RUMOUR_SCRAPE_CRON = "TZ=Asia/Jakarta 5 20 * * 2,4,6";
