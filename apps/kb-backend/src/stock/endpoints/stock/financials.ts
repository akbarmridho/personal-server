import { checkSymbol } from "../../aggregator/companies.js";
import { getFinancials } from "../../stockbit/financials.js";

export const getStockFinancials = async (input: {
  ticker: string;
  reportType: "income-statement" | "balance-sheet" | "cash-flow";
  statementType: "quarterly" | "annually" | "ttm";
}) => {
  const ticker = await checkSymbol(input.ticker);

  return getFinancials({
    ...input,
    ticker,
  });
};
