import { checkSymbol } from "../../aggregator/companies.js";
import { getFinancials } from "../../stockbit/financials.js";

export const getStockFinancials = async (input: {
  symbol: string;
  reportType: "income-statement" | "balance-sheet" | "cash-flow";
  statementType: "quarterly" | "annually" | "ttm";
}) => {
  const symbol = await checkSymbol(input.symbol);

  return getFinancials({
    ...input,
    symbol,
  });
};
