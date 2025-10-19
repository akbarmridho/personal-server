import { checkTicker } from "../../aggregator/companies.js";
import { getCompanyReport } from "../../aggregator/company-report.js";
import { getKeystats } from "../../stockbit/keystats.js";
import { getPricePerformance } from "../../stockbit/price-performance.js";
import { normalizeSlug } from "../../utils.js";

export const getCompanyFundamental = async (rawTicker: string) => {
  const ticker = await checkTicker(rawTicker);

  const [companyReport, keystats, pricePerformance] = await Promise.all([
    getCompanyReport({ ticker }),
    getKeystats(ticker),
    getPricePerformance(rawTicker),
  ]);

  return {
    overview: {
      ticker: ticker,
      company_name: companyReport.company_name,
      sector: companyReport.sector,
      subsector: companyReport.sub_sector,
      subsector_slug: normalizeSlug(companyReport.sub_sector),
      listing_date: companyReport.listing_date,
    },
    forecasts: {
      growth: companyReport.company_growth_forecasts,
      value: companyReport.company_value_forecasts,
    },
    // intrinsics: {
    // final value might not enough and scraping the data is a hassle so let's skip it for now
    // dcf value
    // relative value
    // ddm value
    // },
    keystats,
    pricePerformance,
  };
};
