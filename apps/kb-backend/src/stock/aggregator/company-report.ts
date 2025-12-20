import axios from "axios";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import z from "zod";
import { KV } from "../../infrastructure/db/kv.js";
import { env } from "../../infrastructure/env.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export const GetCompanyReportParams = z.object({
  ticker: z.string().describe("The all caps, 4 character, company ticker"),
});

export const getCompanyReport = async (
  input: z.infer<typeof GetCompanyReportParams>,
) => {
  const data = await KV.getOrSet(
    `stock.aggregator.company-report-${input.ticker}`,
    async () => {
      const response = await axios.get(
        env.AGGREGATOR_COMPANY_REPORT_ENDPOINT.replace("TICKER", input.ticker),
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
      return (now.isBefore(today18) ? today18 : today18.add(1, "day")).toDate();
    })(),
    true,
  );

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

  return data as Record<string, any>;
};
