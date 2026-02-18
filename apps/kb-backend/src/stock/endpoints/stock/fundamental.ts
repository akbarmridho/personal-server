import { checkSymbol } from "../../aggregator/companies.js";
import { getKeystats } from "../../stockbit/keystats.js";
import { removeKeysRecursive } from "../../utils.js";

export const getCompanyFundamental = async (rawSymbol: string) => {
  const symbol = await checkSymbol(rawSymbol);

  const keystats = await getKeystats(symbol);

  return removeKeysRecursive(keystats, ["is_new_update"]);
};
