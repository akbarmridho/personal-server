import { checkSymbol } from "../../aggregator/companies.js";
import { getInsiderActivity } from "../../stockbit/insider-activity.js";
import { getStockProfile } from "../../stockbit/profile.js";

export const getStockOwnership = async (rawSymbol: string) => {
  const symbol = await checkSymbol(rawSymbol);

  const [companyProfile, insiders] = await Promise.all([
    getStockProfile(symbol),
    getInsiderActivity({ symbol, maxPage: 1 }),
  ]);

  return {
    major_shareholders: companyProfile.shareholder,
    shareholder_numbers: companyProfile.shareholder_numbers,
    insiders,
  };
};
