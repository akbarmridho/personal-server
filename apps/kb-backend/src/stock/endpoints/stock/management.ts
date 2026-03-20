import { checkSymbol } from "../../aggregator/companies.js";
import { getCompanyReport } from "../../aggregator/company-report.js";
import { getStockProfile } from "../../stockbit/profile.js";

const cleanKeyExecutives = (value: Record<string, unknown> | null | undefined) => {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      ([, names]) => Array.isArray(names) && names.length > 0,
    ),
  );
};

const cleanExecutiveShareholding = (item: Record<string, any>) => ({
  name: item?.name ?? "",
  percentage: item?.percentage ?? "",
  value: item?.value ?? item?.value_formatted ?? "",
  badges: Array.isArray(item?.badges) ? item.badges : [],
});

export const getStockManagement = async (rawSymbol: string) => {
  const symbol = await checkSymbol(rawSymbol);

  const [companyProfile, companyReport] = await Promise.all([
    getStockProfile(symbol),
    getCompanyReport({ symbol }),
  ]);

  return {
    key_executives: cleanKeyExecutives(
      companyProfile?.key_executive &&
        Object.keys(companyProfile.key_executive).length > 0
        ? companyProfile.key_executive
        : companyReport.key_executives,
    ),
    executives_shareholdings:
      companyProfile?.shareholder_director_commissioner &&
      companyProfile.shareholder_director_commissioner.length > 0
        ? companyProfile.shareholder_director_commissioner.map(
            cleanExecutiveShareholding,
          )
        : Array.isArray(companyReport.executives_shareholdings)
          ? companyReport.executives_shareholdings.map(cleanExecutiveShareholding)
          : [],
  };
};
