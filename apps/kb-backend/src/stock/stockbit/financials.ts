import axios from "axios";
import * as cheerio from "cheerio";
import dayjs from "dayjs";
import { KV } from "../../db/kv.js";
import type { JsonValue } from "../../db/types.js";
import {
  formatHtml,
  htmlToMarkdown,
} from "../../rag/file-converters/html-to-md-converter.js";
import {
  type BaseStockbitResponse,
  StockbitAuthError,
  stockbitAuth,
} from "./auth.js";

interface HeaderInfo {
  dataLabel: string; // e.g., "Q225" or "12M24"
  label: string; // e.g., "Q2 2025" or "12M 2024"
  fullYear: number; // e.g., 2025
  quarter: number | null; // e.g., 2 for quarterly, null for annual
  originalIndex: number; // Original DOM index to map data cells
}

/**
 * Parses a short data-label (e.g., "Q225" or "12M24") into a full, sortable object.
 */
function parseHeaderLabel(dataLabel: string, index: number): HeaderInfo | null {
  // Try quarterly format: Q225, Q424, Q407
  const quarterlyMatch = dataLabel.match(/Q(\d)(\d{2,4})/);
  if (quarterlyMatch) {
    const quarter = parseInt(quarterlyMatch[1], 10);
    const yearShort = parseInt(quarterlyMatch[2], 10);
    const fullYear = yearShort < 50 ? 2000 + yearShort : 1900 + yearShort;

    return {
      dataLabel,
      label: `Q${quarter} ${fullYear}`,
      fullYear,
      quarter,
      originalIndex: index,
    };
  }

  // Try annual format: 12M24, 12M07
  const annualMatch = dataLabel.match(/12M(\d{2,4})/);
  if (annualMatch) {
    const yearShort = parseInt(annualMatch[1], 10);
    const fullYear = yearShort < 50 ? 2000 + yearShort : 1900 + yearShort;

    return {
      dataLabel,
      label: `12M ${fullYear}`,
      fullYear,
      quarter: null,
      originalIndex: index,
    };
  }

  return null;
}

const reportTypeLabels = {
  "income-statement": "Income Statement",
  "balance-sheet": "Balance Sheet",
  "cash-flow": "Cash Flow Statement",
};

async function transformFinancialReport(
  htmlContent: string,
  numPeriods: number,
  reportType: "income-statement" | "balance-sheet" | "cash-flow",
): Promise<string> {
  const $ = cheerio.load(htmlContent);

  // --- 1. Parse and Sort Headers ---

  const allHeaders: HeaderInfo[] = [];

  // Use the headers from the first table (both tables share the same headers)
  $("#data_table_1 thead th.periods-list").each((index, th) => {
    const dataLabel = $(th).attr("data-label");
    if (dataLabel) {
      const parsedHeader = parseHeaderLabel(dataLabel, index);
      if (parsedHeader) {
        allHeaders.push(parsedHeader);
      }
    }
  });

  const filteredHeaders = allHeaders
    .sort((a, b) => {
      if (a.fullYear !== b.fullYear) {
        return b.fullYear - a.fullYear;
      }
      const aQ = a.quarter ?? 0;
      const bQ = b.quarter ?? 0;
      return bQ - aQ;
    })
    .slice(0, numPeriods);

  const newHtml: string[] = [];

  newHtml.push("<table>");
  newHtml.push(`<thead><tr><th>${reportTypeLabels[reportType]}</th>`);
  for (const header of filteredHeaders) {
    newHtml.push(`<th>${header.label}</th>`);
  }
  newHtml.push("</tr></thead>");

  // Add body rows
  newHtml.push("<tbody>");
  $("#data_table_1 tbody tr.dtr").each((i, row) => {
    const accNameEl = $(row).find("td.r_head .acc-name");
    const title = accNameEl.attr("data-lang-1-full") || accNameEl.text().trim();
    if (!title) return; // Skip empty rows

    newHtml.push(`<tr><td>${title}</td>`);

    // Get all cells from this row *in their original order*
    const allCells = $(row).find("td.rowval");

    // Loop through our *sorted* headers and pick the cell by its *original index*
    for (const header of filteredHeaders) {
      const originalCell = allCells.eq(header.originalIndex);
      const rawValue = originalCell.attr("data-raw");

      if (rawValue && rawValue !== "-") {
        const numValue = parseFloat(rawValue);
        // Convert from (e.g.) 39,720,190,000,000 to 39,720 (B)
        const valueInBillions = Math.round(numValue / 1_000_000_000);
        // Format with commas and a "B" suffix
        newHtml.push(`<td>${valueInBillions} B</td>`);
      } else {
        newHtml.push(`<td>n/a</td>`);
      }
    }
    newHtml.push("</tr>");
  });
  newHtml.push("</tbody></table>");

  newHtml.push("<table>");
  newHtml.push("<thead><tr><th>Key Ratio</th>");
  for (const header of filteredHeaders) {
    newHtml.push(`<th>${header.label}</th>`);
  }
  newHtml.push("</tr></thead>");

  // Add body rows
  newHtml.push("<tbody>");
  $("#data_table_keyratio_1 tbody tr.dtr").each((i, row) => {
    const accNameEl = $(row).find("td:first-child .acc-name");
    const title = accNameEl.attr("data-lang-1-full") || accNameEl.text().trim();
    if (!title) return;

    newHtml.push(`<tr><td>${title}</td>`);

    // Get all cells from this row *in their original order*
    const allCells = $(row).find("td.row-ratio-val");

    // Loop through our *sorted* headers and pick the cell by its *original index*
    for (const header of filteredHeaders) {
      // These cells are already formatted (e.g., "93.33 B" or "120.62")
      // We just need to grab the text.
      const originalCell = allCells.eq(header.originalIndex);
      const value = originalCell.text().trim();
      newHtml.push(`<td>${value || "n/a"}</td>`);
    }
    newHtml.push("</tr>");
  });
  newHtml.push("</tbody></table>");

  return await formatHtml(newHtml.join("\n"));
}

function sanitizeJson(obj: any): any {
  if (typeof obj === "string") {
    // biome-ignore lint/suspicious/noControlCharactersInRegex: sanitize
    return obj.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeJson);
  }
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, sanitizeJson(v)]),
    );
  }
  return obj;
}

const mapper = {
  reportType: {
    "income-statement": 1,
    "balance-sheet": 2,
    "cash-flow": 3,
  },
  statementType: {
    quarterly: 1,
    annually: 2,
    ttm: 3,
  },
};

export const getFinancials = async (input: {
  ticker: string;
  reportType: "income-statement" | "balance-sheet" | "cash-flow";
  statementType: "quarterly" | "annually" | "ttm";
}) => {
  const rawData = await KV.getOrSet(
    `stockbit.financials.${input.reportType}.${input.statementType}.${input.ticker}`,
    async () => {
      const authData = await stockbitAuth.get();

      if (!authData) {
        throw new StockbitAuthError("Stockbit auth not found");
      }

      const response = await axios.get(
        `https://exodus.stockbit.com/findata-view/company/financial?symbol=${input.ticker}&data_type=1&report_type=${mapper.reportType[input.reportType]}&statement_type=${mapper.statementType[input.statementType]}`,
        {
          headers: {
            Authorization: `Bearer ${authData.accessToken}`,
          },
        },
      );

      return sanitizeJson(response.data) as JsonValue;
    },
    dayjs().add(3, "hour").toDate(),
    true,
  );

  const data = rawData as any as BaseStockbitResponse<{
    currency: string[];
    default_currency: string;
    html_report: string;
    rounding_value: number[];
    data_tables: Record<string, any>;
  }>;

  const numPeriods = input.statementType === "annually" ? 3 : 12;

  return {
    markdown: await htmlToMarkdown(
      await transformFinancialReport(
        data.data.html_report,
        numPeriods,
        input.reportType,
      ),
    ),
  };
};
