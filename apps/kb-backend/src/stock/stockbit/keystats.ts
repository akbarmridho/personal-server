import dayjs from "dayjs";
import { KV } from "../../db/kv.js";
import type { JsonValue } from "../../db/types.js";
import { proxiedAxios } from "../proxy.js";
import { StockbitAuthError, stockbitAuth } from "./auth.js";

export interface Keystats {
  stats: {
    current_share_outstanding: string;
    market_cap: string;
    enterprise_value: string;
    free_float: string;
  };
  dividends: {
    period: number;
    dividend: string;
    ex_date: string;
    payment_date: string;
  }[]; // data is included in financials so not sure if it's really needed to be included
  statsGroup: {
    name: string;
    stats: {
      [key: string]: string;
    };
  }[];
  financials: {
    name: string;
    values: {
      year: string;
      period_values: { period: string; quarter_value: string; year: string }[];
      annualised_value: string;
      ttm_value: string;
      dividend: string;
      payout_ratio: string;
      dividend_yield: string;
    }[];
  }[];
}

export const getKeystats = async (ticker: string) => {
  const rawData = await KV.getOrSet(
    `stockbit.keystats.${ticker}`,
    async () => {
      const authData = await stockbitAuth.get();

      if (!authData) {
        throw new StockbitAuthError("Stockbit auth not found");
      }

      const response = await proxiedAxios.get(
        `https://exodus.stockbit.com/keystats/ratio/v1/${ticker}?year_limit=10`,
        {
          headers: {
            Authorization: `Bearer ${authData.accessToken}`,
          },
        },
      );

      const data = response.data;

      return data as JsonValue;
    },
    dayjs().add(3, "hour").toDate(),
    true,
  );

  const data = rawData as any;

  return {
    stats: data.data.stats,
    dividends: data.data.dividend_group?.dividend_year_values || [],
    statsGroup: data.data.closure_fin_items_results.map((group: any) => ({
      name: group.keystats_name,
      stats: Object.fromEntries(
        group.fin_name_results.map((item: any) => [
          item.fitem.name,
          item.fitem.value,
        ]),
      ),
    })),
    financials: data.data.financial_year_parent.financial_year_groups.map(
      (group: any) => ({
        name: group.fitem_name,
        values: group.financial_year_values,
      }),
    ),
  } satisfies Keystats;
};
