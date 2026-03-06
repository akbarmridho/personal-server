import type { BaseStockbitResponse } from "./auth.js";
import { stockbitGetJson } from "./client.js";

export const getEmittenInfo = async (input: { symbol: string }) => {
  const rawData = await stockbitGetJson<BaseStockbitResponse<Record<string, any>>>(
    `https://exodus.stockbit.com/emitten/${input.symbol}/info`,
  );

  const data = rawData as BaseStockbitResponse<Record<string, any>>;

  return data.data;
};
