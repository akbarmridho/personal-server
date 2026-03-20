import { getShareholdingDataRows } from "../../stockbit/shareholding-data.js";

const normalizeEntityName = (value: string) =>
  value
    .toUpperCase()
    .replace(/[.,()/-]/g, " ")
    .replace(/\b(PT|TBK|Tbk|LTD|LIMITED|CORP|CORPORATION|INC|PLC)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const uniqueValues = (values: Array<string | null>) =>
  Array.from(
    new Set(values.filter((value): value is string => Boolean(value && value.trim()))),
  );

export const getShareholderEntityHoldings = async (rawEntityName: string) => {
  const entityName = rawEntityName.trim();
  if (!entityName) {
    throw new Error("entity_name must be a non-empty string");
  }

  const normalizedRequestedEntityName = normalizeEntityName(entityName);
  if (!normalizedRequestedEntityName) {
    throw new Error("entity_name is empty after normalization");
  }

  const rows = await getShareholdingDataRows();
  const groupedByEntity = new Map<
    string,
    {
      display_name: string;
      rows: typeof rows;
    }
  >();

  for (const row of rows) {
    const normalizedInvestorName = normalizeEntityName(row.investor_name);
    if (!normalizedInvestorName) {
      continue;
    }

    const existing = groupedByEntity.get(normalizedInvestorName);
    if (existing) {
      existing.rows.push(row);
      continue;
    }

    groupedByEntity.set(normalizedInvestorName, {
      display_name: row.investor_name,
      rows: [row],
    });
  }

  let matched = groupedByEntity.get(normalizedRequestedEntityName) ?? null;

  if (!matched) {
    const suggestions = Array.from(groupedByEntity.entries())
      .filter(
        ([normalizedInvestorName]) =>
          normalizedInvestorName.includes(normalizedRequestedEntityName) ||
          normalizedRequestedEntityName.includes(normalizedInvestorName),
      )
      .slice(0, 10)
      .map(([, group]) => group.display_name);

    if (suggestions.length === 1) {
      matched = groupedByEntity.get(normalizeEntityName(suggestions[0])) ?? null;
    } else if (suggestions.length > 1) {
      throw new Error(
        `Entity name is ambiguous. Close matches: ${suggestions.join(", ")}`,
      );
    }
  }

  if (!matched) {
    throw new Error(`No holdings found for entity: ${entityName}`);
  }

  const holdings = matched.rows.slice().sort((a, b) => {
    if (b.percentage !== a.percentage) {
      return b.percentage - a.percentage;
    }

    if (a.symbol !== b.symbol) {
      return a.symbol.localeCompare(b.symbol);
    }

    return a.snapshot_date.localeCompare(b.snapshot_date);
  });

  const largestHolding = holdings[0] ?? null;

  return {
    requested_entity_name: entityName,
    matched_entity_name: matched.display_name,
    snapshot_dates: uniqueValues(holdings.map((row) => row.snapshot_date)).sort(),
    investor_type_codes: uniqueValues(
      holdings.map((row) => row.investor_type_code),
    ),
    investor_type_labels: uniqueValues(
      holdings.map((row) => row.investor_type_label),
    ),
    local_foreign: uniqueValues(holdings.map((row) => row.local_foreign)),
    nationalities: uniqueValues(holdings.map((row) => row.nationality)),
    domiciles: uniqueValues(holdings.map((row) => row.domicile)),
    summary: {
      holdings_count: holdings.length,
      symbols_count: new Set(holdings.map((row) => row.symbol)).size,
      largest_holding: largestHolding
        ? {
            symbol: largestHolding.symbol,
            issuer_name: largestHolding.issuer_name,
            percentage: largestHolding.percentage,
            total_holding_shares: largestHolding.total_holding_shares,
          }
        : null,
    },
    holdings,
  };
};
