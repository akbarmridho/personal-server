import dayjs from "dayjs";
import { KV } from "../../infrastructure/db/kv.js";
import type { JsonValue } from "../../infrastructure/db/types.js";
import type { BaseStockbitResponse } from "./auth.js";
import { stockbitGetJson } from "./client.js";

export const getEmittenInfo = async (input: { symbol: string }) => {
  const rawData = await KV.getOrSet(
    `stockbit.emitteninfo.${input.symbol}`,
    async () => {
      const data = await stockbitGetJson(
        `https://exodus.stockbit.com/emitten/${input.symbol}/info`,
      );

      return data as JsonValue;
    },
    dayjs().add(15, "minute").toDate(),
    true,
  );

  const data = rawData as any as BaseStockbitResponse<Record<string, any>>;

  return data.data;
};
