import dayjs from "dayjs";
import { KV } from "../../infrastructure/db/kv.js";
import type { JsonObject, JsonValue } from "../../infrastructure/db/types.js";
import { proxiedAxios } from "../proxy.js";
import { removeKeysRecursive } from "../utils.js";
import { StockbitAuthError, stockbitAuth } from "./auth.js";

export const getStockProfile = async (symbol: string) => {
  const rawData = await KV.getOrSet(
    `stockbit.profile.${symbol}`,
    async () => {
      const authData = await stockbitAuth.get();

      if (!authData) {
        throw new StockbitAuthError("Stockbit auth not found");
      }

      const response = await proxiedAxios.get(
        `https://exodus.stockbit.com/emitten/${symbol}/profile`,
        {
          headers: {
            Authorization: `Bearer ${authData.accessToken}`,
          },
        },
      );

      const data = response.data;

      return data as JsonValue;
    },
    dayjs().add(1, "week").toDate(),
    true,
  );

  const data = (rawData as JsonObject).data as Record<string, any>;

  const transformKeyExecutive = (obj) => {
    const transformed = {};
    for (const [key, arr] of Object.entries(obj)) {
      transformed[key] = Array.isArray(arr)
        ? arr.map((item) => item.value)
        : [];
    }
    return transformed;
  };

  return {
    background: data.background,
    key_executive: transformKeyExecutive(data.key_executive),
    shareholder_director_commissioner: removeKeysRecursive(
      data.shareholder_director_commissioner,
      ["id"],
    ),
    shareholder: removeKeysRecursive(data.shareholder, ["id"]),
    subsidiary: data.subsidiary,
    shareholder_numbers: data.shareholder_numbers,
  };
};
