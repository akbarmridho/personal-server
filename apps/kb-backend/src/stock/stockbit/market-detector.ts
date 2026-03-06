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

  const rawData = await stockbitGetJson<
    BaseStockbitResponse<{
      bandar_detector: Record<string, any>;
      broker_summary: Record<string, any>;
      from: string;
      to: string;
    }>
  >(
    `https://exodus.stockbit.com/marketdetectors/${input.symbol}?from=${fromFormatted}&to=${toFormatted}&transaction_type=TRANSACTION_TYPE_NET&market_board=MARKET_BOARD_REGULER&investor_type=INVESTOR_TYPE_ALL&limit=25`,
  );

  const data = rawData;

  return data.data;
};
