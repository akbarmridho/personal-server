import dayjs from "dayjs";
import { KV } from "../../infrastructure/db/kv.js";
import type { JsonValue } from "../../infrastructure/db/types.js";
import { proxiedAxios } from "../proxy.js";
import {
  type BaseStockbitResponse,
  StockbitAuthError,
  stockbitAuth,
} from "./auth.js";

export const getEmittenInfo = async (input: { symbol: string }) => {
  const rawData = await KV.getOrSet(
    `stockbit.emitteninfo.${input.symbol}`,
    async () => {
      const authData = await stockbitAuth.get();

      if (!authData) {
        throw new StockbitAuthError("Stockbit auth not found");
      }

      const response = await proxiedAxios.get(
        `https://exodus.stockbit.com/emitten/${input.symbol}/info`,
        {
          headers: {
            Authorization: `Bearer ${authData.accessToken}`,
          },
        },
      );

      const data = response.data;

      return data as JsonValue;
    },
    dayjs().add(15, "minute").toDate(),
    true,
  );

  const data = rawData as any as BaseStockbitResponse<Record<string, any>>;

  return data.data;
};
