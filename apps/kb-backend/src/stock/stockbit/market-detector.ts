import dayjs from "dayjs";
import { KV } from "../../infrastructure/db/kv.js";
import type { JsonValue } from "../../infrastructure/db/types.js";
import { dateToFormatted } from "../utils.js";
import type { BaseStockbitResponse } from "./auth.js";
import { stockbitGetJson } from "./client.js";

export const getMarketDetector = async (input: {
  symbol: string;
  from: Date;
  to: Date;
}) => {
  const fromFormatted = dateToFormatted(input.from);
  const toFormatted = dateToFormatted(input.to);

  const rawData = await KV.getOrSet(
    `stockbit.marketdetector.${input.symbol}.${fromFormatted}.${toFormatted}`,
    async () => {
      const data = await stockbitGetJson(
        `https://exodus.stockbit.com/marketdetectors/${input.symbol}?from=${fromFormatted}&to=${toFormatted}&transaction_type=TRANSACTION_TYPE_NET&market_board=MARKET_BOARD_REGULER&investor_type=INVESTOR_TYPE_ALL&limit=25`,
      );

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
