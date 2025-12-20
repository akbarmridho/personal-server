import { checkSymbol } from "../../aggregator/companies.js";
import { getCompanyReport } from "../../aggregator/company-report.js";
import { getStockProfile } from "../../stockbit/profile.js";

export const getStockManagement = async (rawTicker: string) => {
  const ticker = await checkSymbol(rawTicker);

  const [companyProfile, companyReport] = await Promise.all([
    getStockProfile(ticker),
    getCompanyReport({ ticker }),
  ]);

  return {
    key_executives:
      companyProfile?.key_executive &&
      Object.keys(companyProfile.key_executive).length > 0
        ? companyProfile.key_executive
        : companyReport.key_executives,
    executives_shareholdings:
      companyProfile?.shareholder_director_commissioner &&
      companyProfile.shareholder_director_commissioner.length > 0
        ? companyProfile.shareholder_director_commissioner
        : companyReport.executives_shareholdings,
  };
};
