import { checkSymbol } from "../../aggregator/companies.js";
import { getHolderTypeLabel } from "../../shareholder-type.js";
import { getInsiderActivity } from "../../stockbit/insider-activity.js";
import { getStockProfile } from "../../stockbit/profile.js";
import { getAllShareholderCompositionCharts } from "../../stockbit/shareholder-composition.js";

const parsePercentage = (value: unknown) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value !== "string") {
    return 0;
  }

  const normalized = value.replace("%", "").replace(/,/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getStockOwnership = async (rawSymbol: string) => {
  const symbol = await checkSymbol(rawSymbol);

  const [companyProfile, insiders, holdingComposition] = await Promise.all([
    getStockProfile(symbol),
    getInsiderActivity({ symbol, maxPage: 1 }),
    getAllShareholderCompositionCharts(symbol),
  ]);

  const shareholderRows =
    companyProfile.shareholder_one_percent?.shareholder?.map((item) => {
      const typeCode =
        typeof item?.type === "string" ? item.type.trim().toUpperCase() : "";

      return {
        ...item,
        type_code: typeCode || null,
        type_label: typeCode ? getHolderTypeLabel(typeCode) : null,
      };
    }) ?? [];

  const disclosedAboveOnePercentPct = shareholderRows.reduce(
    (sum, item) => sum + parsePercentage(item.percentage),
    0,
  );
  const hhiDisclosedAboveOnePercent = shareholderRows.reduce((sum, item) => {
    const percentage = parsePercentage(item.percentage);
    return sum + percentage * percentage;
  }, 0);
  const remainingBelowOnePercentPct = Math.max(
    0,
    +(100 - disclosedAboveOnePercentPct).toFixed(4),
  );

  return {
    shareholders_above_one_percent: {
      shareholder: shareholderRows,
      last_updated:
        companyProfile.shareholder_one_percent?.last_updated ?? null,
    },
    disclosed_above_one_percent_total_pct:
      +disclosedAboveOnePercentPct.toFixed(4),
    hhi_disclosed_above_one_percent: +hhiDisclosedAboveOnePercent.toFixed(4),
    remaining_below_one_percent_pct: remainingBelowOnePercentPct,
    beneficial_owners: companyProfile.beneficiary,
    shareholder_numbers: companyProfile.shareholder_numbers,
    holding_composition: holdingComposition,
    insiders,
  };
};
