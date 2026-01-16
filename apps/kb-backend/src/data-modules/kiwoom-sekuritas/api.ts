import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import { logger } from "../../utils/logger.js";

// ==========================================
// 1. Common Interfaces (Request & Response)
// ==========================================

export interface KiwoomPayload {
  fromDate: string;
  toDate: string;
  // 'searchCriteria' is used by News; 'category' is used by Market Report
  searchCriteria?: string;
  category?: string;
  searchTerms: string;
  limit: number;
  offset: number;
}

export interface KiwoomResponse<T> {
  data: T[];
  totalCount: number;
  canFetchData: boolean;
}

// ==========================================
// 2. Specific Item Interfaces
// ==========================================

interface BaseItem {
  SEQNO: number;
  TITL: string;
  MAKEDATE: string;
  MAKEDATE2: string;
  MAKEDATE3: string;
  MAKEDATE4: string;
  MAKEDATE5: string;
  BRODID: string;
  ALIA: string;
  READCNT: number;
  IS_NEW: number;
}

export interface DailyNewsItem extends BaseItem {
  DOCWRGB: string;
}

export interface InternationalNewsItem extends BaseItem {
  CONT: string;
}

export interface MarketReportItem extends BaseItem {
  FILENM: string;
  APNDNM: string;
  SNMAKEDATE: string;
}

// ==========================================
// 3. The Generic Fetcher Logic
// ==========================================

const BASE_URL = "https://www.kiwoom.co.id";

/**
 * A generic function to handle the POST request.
 * It accepts an optional 'customPayload' to merge specific fields (like category).
 */
async function fetchKiwoomList<T>(
  endpoint: string,
  refererPage: string,
  basePayload: KiwoomPayload,
): Promise<KiwoomResponse<T>> {
  const url = `${BASE_URL}${endpoint}`;

  const config: AxiosRequestConfig = {
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      Accept: "application/json, text/javascript, */*; q=0.01",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
      Origin: BASE_URL,
      Referer: `${BASE_URL}${refererPage}`,
      "X-Requested-With": "XMLHttpRequest",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-Mode": "cors",
      Connection: "keep-alive",
    },
  };

  try {
    const response: AxiosResponse<KiwoomResponse<T>> = await axios.post(
      url,
      basePayload,
      config,
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error(`[Axios Error] ${endpoint}: ${error.message}`);
    }
    throw error;
  }
}

// ==========================================
// 4. Exported Service Functions
// ==========================================

export const getDailyNews = (offset: number, limit: number) => {
  const payload: KiwoomPayload = {
    fromDate: "",
    toDate: "",
    searchCriteria: "all", // Daily News uses searchCriteria
    searchTerms: "",
    limit,
    offset,
  };

  return fetchKiwoomList<DailyNewsItem>(
    "/dailynews/getDailyNewsList",
    "/dailynews/getDailyNewsMain",
    payload,
  );
};

export const getInternationalNews = (offset: number, limit: number) => {
  const payload: KiwoomPayload = {
    fromDate: "",
    toDate: "",
    searchCriteria: "all", // International News uses searchCriteria
    searchTerms: "",
    limit,
    offset,
  };

  return fetchKiwoomList<InternationalNewsItem>(
    "/internationalnews/getInternationalNewsList",
    "/internationalnews/getInternationalNewsMain",
    payload,
  );
};

/**
 * Market Reports uses 'category' instead of 'searchCriteria'.
 * Default category is usually "MR03" based on your request, but you can override it.
 */
export const getMarketReports = (
  offset: number,
  limit: number,
  category: string = "MR03",
) => {
  const payload: KiwoomPayload = {
    fromDate: "",
    toDate: "",
    category: category, // Market Report uses category
    searchTerms: "",
    limit,
    offset,
  };

  return fetchKiwoomList<MarketReportItem>(
    "/market/getMarketReportList",
    "/market/getMarketReportMain",
    payload,
  );
};
