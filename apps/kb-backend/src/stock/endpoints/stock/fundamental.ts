import { checkTicker } from "../../aggregator/companies.js";
import { getCompanyReport } from "../../aggregator/company-report.js";
import { getEmittenInfo } from "../../stockbit/emitten-info.js";
import { getKeystats } from "../../stockbit/keystats.js";
import { normalizeSlug } from "../../utils.js";

export const getCompanyFundamental = async (rawTicker: string) => {
  const ticker = await checkTicker(rawTicker);

  const [companyReport, keystats, emittenInfo] = await Promise.all([
    getCompanyReport({ ticker }),
    getKeystats(ticker),
    getEmittenInfo({ ticker }),
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
    market: {
      price: +emittenInfo.price,
      change: +emittenInfo.change,
      percentage: emittenInfo.percentage,
      previous: +emittenInfo.previous,
      average: +emittenInfo.average,
      volume: +emittenInfo.volume,
      bid: {
        price: +emittenInfo.orderbook?.bid?.price || null,
        volume: +emittenInfo.orderbook?.bid?.volume || null,
      },
      offer: {
        price: +emittenInfo.orderbook?.offer?.price || null,
        volume: +emittenInfo.orderbook?.offer?.volume || null,
      },
      market_status: emittenInfo.market_hour?.status,
      time_left: emittenInfo.market_hour?.formatted_time_left,
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
  };
};
