import { normalizeSector } from "../../../data-modules/profiles/sector.js";
import { checkSymbol } from "../../aggregator/companies.js";
import { getCompanyReport } from "../../aggregator/company-report.js";
import { getEmittenInfo } from "../../stockbit/emitten-info.js";
import { getKeystats } from "../../stockbit/keystats.js";
import { removeKeysRecursive } from "../../utils.js";

export const getCompanyFundamental = async (rawSymbol: string) => {
  const symbol = await checkSymbol(rawSymbol);

  const [companyReport, keystats, emittenInfo] = await Promise.all([
    getCompanyReport({ symbol }),
    getKeystats(symbol),
    getEmittenInfo({ symbol }),
  ]);

  const data = {
    overview: {
      symbol: symbol,
      company_name: companyReport.company_name,
      subsector: normalizeSector(companyReport.sub_sector),
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
    esg_score: companyReport.esg_score || null,
    // intrinsics: {
    // final value might not enough and scraping the data is a hassle so let's skip it for now
    // dcf value
    // relative value
    // ddm value
    // },
    keystats,
  };

  return removeKeysRecursive(data, ["is_new_update"]);
};
