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

        return response.data;
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

    return { success: true, data: data };
  } catch (error) {
    logger.error({ err: error }, "Failed to get sectors report");
    return { success: false, message: "Failed to get sectors report" };
  }
};
