import { AxiosError } from "axios";
import { proxiedAxios } from "../../utils/proxy.js";
import {
  type BaseStockbitResponse,
  StockbitAuthError,
  stockbitAuth,
} from "./auth.js";

export type FilingReportType =
  | "all"
  | "laporan_keuangan"
  | "rups"
  | "kepemilikan_saham"
  | "dividen"
  | "corporate_action"
  | "other";

const filingReportTypeMap: Record<FilingReportType, string> = {
  all: "REPORT_TYPE_ALL",
  laporan_keuangan: "REPORT_TYPE_LAPORAN_KEUANGAN",
  rups: "REPORT_TYPE_RUPS",
  kepemilikan_saham: "REPORT_TYPE_KEPIMILIKAN_SAHAM",
  dividen: "REPORT_TYPE_DIVIDEN",
  corporate_action: "REPORT_TYPE_CORPORATE_ACTION",
  other: "REPORT_TYPE_OTHER",
};

const ANNOUNCEMENT_HASH_REGEX = /^[a-f0-9]{32}$/i;

interface StockbitFilingListItem {
  stream_id: number;
  title_url: string;
  title: string;
  created_at: string;
  reports?: Array<{ type?: string }>;
}

interface StockbitFilingListPagination {
  is_last_page?: boolean;
  next_cursor?: number;
  total?: number;
}

interface StockbitFilingListData {
  stream?: StockbitFilingListItem[];
  pagination?: StockbitFilingListPagination;
}

interface AnnouncementDetailItem {
  id: number;
  posted_on: string;
  headline: string;
  title: string;
  attachment: string;
  symbol: string;
  name: string;
}

interface ListFilingInput {
  symbol: string;
  reportType?: FilingReportType;
  lastStreamId?: number;
  limit?: number;
  keyword?: string;
}

const getAccessToken = async () => {
  const authData = await stockbitAuth.get();
  if (!authData) {
    throw new StockbitAuthError("Stockbit auth not found");
  }
  return authData.accessToken;
};

const extractAnnouncementHash = (titleUrl: string): string => {
  const hash = titleUrl
    .trim()
    .replace(/^streams\/announcement\//, "")
    .split("?")[0];
  if (!ANNOUNCEMENT_HASH_REGEX.test(hash)) {
    throw new Error(
      `Invalid filing announcement hash in title_url: ${titleUrl}`,
    );
  }
  return hash.toLowerCase();
};

export const normalizeAnnouncementHash = (value: string): string => {
  const candidate = value.trim().split("?")[0].replace(/\/+$/, "");
  const hash = candidate.split("/").filter(Boolean).at(-1) ?? "";

  if (!ANNOUNCEMENT_HASH_REGEX.test(hash)) {
    throw new Error(
      "filing_id must be a valid Stockbit announcement hash (32 hex chars).",
    );
  }

  return hash.toLowerCase();
};

export const listFilings = async (input: ListFilingInput) => {
  const accessToken = await getAccessToken();

  const reportType = input.reportType ?? "all";
  const query = new URLSearchParams({
    category: "STREAM_CATEGORY_REPORTS",
    last_stream_id: String(input.lastStreamId ?? 0),
    limit: String(input.limit ?? 20),
    report_type: filingReportTypeMap[reportType],
  });

  const keyword = input.keyword?.trim();
  if (keyword) {
    query.set("keyword", keyword);
  }

  try {
    const response = await proxiedAxios.get<
      BaseStockbitResponse<StockbitFilingListData>
    >(
      `https://exodus.stockbit.com/stream/v3/symbol/${input.symbol}?${query.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const payload = response.data.data;
    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid filing list response shape from Stockbit.");
    }
    const stream = Array.isArray(payload.stream) ? payload.stream : [];
    const pagination = payload.pagination ?? {};

    const nextCursor =
      typeof pagination.next_cursor === "number"
        ? pagination.next_cursor
        : undefined;

    return {
      symbol: input.symbol,
      report_type: reportType,
      pagination: {
        is_last_page: Boolean(pagination.is_last_page),
        ...(nextCursor !== undefined ? { next_cursor: nextCursor } : {}),
        total:
          typeof pagination.total === "number"
            ? pagination.total
            : stream.length,
      },
      filings: stream.map((item) => ({
        id: extractAnnouncementHash(item.title_url),
        title: item.title,
        created_at: item.created_at,
        report_labels: Array.isArray(item.reports)
          ? item.reports
              .map((report) => report.type)
              .filter((label): label is string => Boolean(label))
          : [],
      })),
    };
  } catch (error) {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        throw new StockbitAuthError(
          `Stockbit API authentication failed: ${status}`,
        );
      }
    }
    throw error;
  }
};

export const getFiling = async (filingId: string) => {
  const accessToken = await getAccessToken();
  const announcementHash = normalizeAnnouncementHash(filingId);

  try {
    const response = await proxiedAxios.get<
      BaseStockbitResponse<AnnouncementDetailItem[]>
    >(`https://exodus.stockbit.com/stream/announcement/${announcementHash}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const items = Array.isArray(response.data.data) ? response.data.data : [];
    if (items.length === 0) {
      throw new Error("Filing announcement not found.");
    }

    const first = items[0];

    return {
      id: announcementHash,
      symbol: first.symbol,
      company_name: first.name,
      headline: first.headline,
      posted_on: first.posted_on,
      attachments: items.map((item) => ({
        id: item.id,
        title: item.title,
        url: item.attachment,
      })),
    };
  } catch (error) {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        throw new StockbitAuthError(
          `Stockbit API authentication failed: ${status}`,
        );
      }
      if (status === 404) {
        throw new Error("Filing announcement not found.");
      }
    }
    throw error;
  }
};
