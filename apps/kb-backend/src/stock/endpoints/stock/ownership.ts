import { checkTicker } from "../../aggregator/companies.js";
import { getCompanyReport } from "../../aggregator/company-report.js";
import { getInsiderActivity } from "../../stockbit/insider-activity.js";

export const getStockOwnership = async (rawTicker: string) => {
  const ticker = await checkTicker(rawTicker);

  const [companyReport, insiders] = await Promise.all([
    getCompanyReport({ ticker }),
    getInsiderActivity({ ticker, maxPage: 1 }),
  ]);

  return {
    major_shareholders: companyReport.major_shareholders,
    // institutional_transaction_flow:
    //   companyReport.institutional_transaction_flow, // redundant with bandar
    top_transactions: companyReport.top_transactions,
    insiders,
  };
};
