import { checkTicker } from "../../aggregator/companies.js";
import { getCompanyReport } from "../../aggregator/company-report.js";
import { getInsiderActivity } from "../../stockbit/insider-activity.js";
import { getStockProfile } from "../../stockbit/profile.js";

export const getStockOwnership = async (rawTicker: string) => {
  const ticker = await checkTicker(rawTicker);

  const [companyProfile, companyReport, insiders] = await Promise.all([
    getStockProfile(ticker),
    getCompanyReport({ ticker }),
    getInsiderActivity({ ticker, maxPage: 1 }),
  ]);

  return {
    major_shareholders:
      companyProfile?.shareholder && companyProfile.shareholder.length > 0
        ? companyProfile.shareholder
        : companyReport.major_shareholders,
    shareholder_numbers: companyProfile.shareholder_numbers,
    // institutional_transaction_flow:
    //   companyReport.institutional_transaction_flow, // redundant with bandar
    top_transactions: companyReport.top_transactions,
    insiders,
  };
};
