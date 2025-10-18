import { logger } from "@personal-server/common/utils/logger";
import axios from "axios";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import z from "zod";
import { KV } from "../../db/kv.js";
import { env } from "../../env.js";
import { getRawCompanies } from "./companies.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export const GetCompanyReportParams = z.object({
  ticker: z.string().describe("The all caps, 4 character, company ticker"),
  fields: z
    .object({
      ownership: z.boolean(),
      management: z.boolean(),
      news: z.boolean(),
      futureOutlook: z.boolean(),
      comparePeers: z.boolean(),
      dividendHistory: z.boolean(),
      financialsHistory: z.boolean(),
      valuationHistory: z.boolean(),
    })
    .describe("Granularity of the data to return."),
});

export const getCompanyReport = async (
  input: z.infer<typeof GetCompanyReportParams>,
): Promise<
  { success: true; data: any } | { success: false; message: string }
> => {
  try {
    // validate the export existence
    const tickers = new Set((await getRawCompanies()).map((e) => e.ticker));

    const transformed = input.ticker.toUpperCase().replaceAll(".JK", "");

    if (!tickers.has(transformed)) {
      return {
        success: false,
        message: `Ticket ${transformed} not found. Fetch companies list to view the available tickers.`,
      };
    }

    const data = await KV.getOrSet(
      `stock.aggregator.company-report-${input.ticker}`,
      async () => {
        const response = await axios.get(
          env.AGGREGATOR_COMPANY_REPORT_ENDPOINT.replace(
            "TICKER",
            input.ticker,
          ),
          {
            headers: {
              ...JSON.parse(env.AGGREGATOR_AUTH),
              "Content-Type": "application/json",
            },
          },
        );

        const raw = response.data as any[];

        if (!raw || raw.length === 0) {
          throw new Error("No data found");
        }

        return raw[0];
      },
      (() => {
        // expires until closest 18.00 WIB (today or nextday)
        const now = dayjs().tz("Asia/Jakarta");
        const today18 = now.hour(18).minute(0).second(0).millisecond(0);
        return (
          now.isBefore(today18) ? today18 : today18.add(1, "day")
        ).toDate();
      })(),
      true,
    );

    // delete unnecessary data
    const excludedFields = [
      "nologo",
      "listing_board",
      "address",
      "website",
      "phone",
      "email",
      "employee_num",
      "employee_num_rank",
      "wsj_format",
      "alias",
      "tags",
      "indices",
      "technical_rating_breakdown",
      "analyst_rating_breakdown",
      "point_summaries",
      "annual_yield",
      "historical_financials_quarterly",
      "sankey_components",
    ];

    for (const field of excludedFields) {
      delete data![field];
    }

    if (!input.fields.ownership) {
      const fields = [
        "major_shareholders",
        "top_transactions",
        "institutional_transaction_flow",
      ];

      for (const field of fields) {
        delete data![field];
      }
    }

    if (!input.fields.management) {
      const fields = ["key_executives", "executives_shareholdings"];

      for (const field of fields) {
        delete data![field];
      }
    }

    if (!input.fields.news) {
      const fields = ["idx_filings"];

      for (const field of fields) {
        delete data![field];
      }
    }

    if (!input.fields.futureOutlook) {
      const fields = ["company_growth_forecasts", "company_value_forecasts"];

      for (const field of fields) {
        delete data![field];
      }
    }

    if (!input.fields.comparePeers) {
      const fields = ["peers_data"];

      for (const field of fields) {
        delete data![field];
      }
    }

    if (!input.fields.dividendHistory) {
      const fields = ["historical_dividends"];

      for (const field of fields) {
        delete data![field];
      }
    }

    if (!input.fields.financialsHistory) {
      const fields = [
        "historical_financial_ratio",
        "historical_revenue_opex_breakdown",
        "historical_financials",
      ];

      for (const field of fields) {
        delete data![field];
      }
    }

    if (!input.fields.valuationHistory) {
      const fields = ["self_financial_info"];

      for (const field of fields) {
        delete data![field];
      }
    }

    // traverse through the object
    // for each array field, check if it have year or financial_year (can be string or number) then sort desc
    for (const key in data as Record<string, any>) {
      if (data && Array.isArray(data[key]) && data[key].length > 0) {
        const first = data[key][0];
        if (typeof first === "object" && first !== null) {
          if ("year" in first || "financial_year" in first) {
            data[key].sort((a: any, b: any) => {
              const aVal = Number(a.year ?? a.financial_year);
              const bVal = Number(b.year ?? b.financial_year);
              return bVal - aVal;
            });
          }
        }
      }
    }

    return { success: true, data: data };
  } catch (error) {
    logger.error({ err: error }, "Failed to get sectors report");
    return { success: false, message: "Failed to get sectors report" };
  }
};
