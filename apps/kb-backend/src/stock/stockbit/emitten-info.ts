import dayjs from "dayjs";
import { KV } from "../../db/kv.js";
import type { JsonValue } from "../../db/types.js";
import { proxiedAxios } from "../proxy.js";
import {
  type BaseStockbitResponse,
  StockbitAuthError,
  stockbitAuth,
} from "./auth.js";

export const getEmittenInfo = async (input: { ticker: string }) => {
  const rawData = await KV.getOrSet(
    `stockbit.emitteninfo.${input.ticker}`,
    async () => {
      const authData = await stockbitAuth.get();

      if (!authData) {
        throw new StockbitAuthError("Stockbit auth not found");
      }

      const response = await proxiedAxios.get(
        `https://exodus.stockbit.com/emitten/${input.ticker}/info`,
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
