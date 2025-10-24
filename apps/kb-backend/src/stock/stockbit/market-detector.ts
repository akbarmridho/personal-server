import axios from "axios";
import dayjs from "dayjs";
import { KV } from "../../db/kv.js";
import type { JsonValue } from "../../db/types.js";
import { dateToFormatted } from "../utils.js";
import {
  type BaseStockbitResponse,
  StockbitAuthError,
  stockbitAuth,
} from "./auth.js";

export const getMarketDetector = async (input: {
  ticker: string;
  from: Date;
  to: Date;
}) => {
  const fromFormatted = dateToFormatted(input.from);
  const toFormatted = dateToFormatted(input.to);

  const rawData = await KV.getOrSet(
    `stockbit.marketdetector.${input.ticker}.${fromFormatted}.${toFormatted}`,
    async () => {
      const authData = await stockbitAuth.get();

      if (!authData) {
        throw new StockbitAuthError("Stockbit auth not found");
      }

      const response = await axios.get(
        `https://exodus.stockbit.com/marketdetectors/${input.ticker}?from=${fromFormatted}&to=${toFormatted}&transaction_type=TRANSACTION_TYPE_NET&market_board=MARKET_BOARD_REGULER&investor_type=INVESTOR_TYPE_ALL&limit=25`,
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

  const data = rawData as any as BaseStockbitResponse<{
    bandar_detector: Record<string, any>;
    broker_summary: Record<string, any>;
    from: string;
    to: string;
  }>;

  return data.data;
};
