import type { JsonObject } from "../../infrastructure/db/types.js";
import { removeKeysRecursive } from "../utils.js";
import { stockbitGetJson } from "./client.js";

const removeIdsFromArray = (value: unknown) =>
  Array.isArray(value) ? removeKeysRecursive(value, ["id"]) : [];

export const getStockProfile = async (symbol: string) => {
  const rawData = await stockbitGetJson<JsonObject>(
    `https://exodus.stockbit.com/emitten/${symbol}/profile`,
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
    shareholder_director_commissioner: removeIdsFromArray(
      data.shareholder_director_commissioner,
    ),
    shareholder: removeIdsFromArray(data.shareholder),
    shareholder_one_percent: data.shareholder_one_percent
      ? {
          shareholder: removeIdsFromArray(data.shareholder_one_percent.shareholder),
          last_updated: data.shareholder_one_percent.last_updated,
        }
      : undefined,
    beneficiary: Array.isArray(data.beneficiary)
      ? data.beneficiary
          .map((item) => item?.name)
          .filter((name): name is string => Boolean(name))
      : [],
    subsidiary: data.subsidiary,
    shareholder_numbers: data.shareholder_numbers,
  };
};
