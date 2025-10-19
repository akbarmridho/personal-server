import { checkTicker } from "../../aggregator/companies.js";
import { getCompanyReport } from "../../aggregator/company-report.js";

export const getStockManagement = async (rawTicker: string) => {
  const ticker = await checkTicker(rawTicker);

  const companyReport = await getCompanyReport({ ticker });

  return {
    key_executives: companyReport.key_executives,
    executives_shareholdings: companyReport.executives_shareholdings,
  };
};
