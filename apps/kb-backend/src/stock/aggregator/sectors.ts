// sectors data doesn't change so we keep it in code
export const sectorsData: {
  sector: string;
  subsector: string;
  slug: string;
}[] = [
  {
    sector: "Basic Materials",
    subsector: "Basic Materials",
    slug: "basic-materials",
  },
  {
    sector: "Consumer Cyclicals",
    subsector: "Apparel & Luxury Goods",
    slug: "apparel-luxury-goods",
  },
  {
    sector: "Consumer Cyclicals",
    subsector: "Automobiles & Components",
    slug: "automobiles-components",
  },
  {
    sector: "Consumer Cyclicals",
    subsector: "Consumer Services",
    slug: "consumer-services",
  },
  {
    sector: "Consumer Cyclicals",
    subsector: "Household Goods",
    slug: "household-goods",
  },
  {
    sector: "Consumer Cyclicals",
    subsector: "Leisure Goods",
    slug: "leisure-goods",
  },
  {
    sector: "Consumer Cyclicals",
    subsector: "Media & Entertainment",
    slug: "media-entertainment",
  },
  { sector: "Consumer Cyclicals", subsector: "Retailing", slug: "retailing" },
  {
    sector: "Consumer Non-Cyclicals",
    subsector: "Food & Beverage",
    slug: "food-beverage",
  },
  {
    sector: "Consumer Non-Cyclicals",
    subsector: "Food & Staples Retailing",
    slug: "food-staples-retailing",
  },
  {
    sector: "Consumer Non-Cyclicals",
    subsector: "Nondurable Household Products",
    slug: "nondurable-household-products",
  },
  { sector: "Consumer Non-Cyclicals", subsector: "Tobacco", slug: "tobacco" },
  {
    sector: "Energy",
    subsector: "Alternative Energy",
    slug: "alternative-energy",
  },
  { sector: "Energy", subsector: "Oil, Gas & Coal", slug: "oil-gas-coal" },
  { sector: "Financials", subsector: "Banks", slug: "banks" },
  {
    sector: "Financials",
    subsector: "Financing Service",
    slug: "financing-service",
  },
  {
    sector: "Financials",
    subsector: "Holding & Investment Companies",
    slug: "holding-investment-companies",
  },
  { sector: "Financials", subsector: "Insurance", slug: "insurance" },
  {
    sector: "Financials",
    subsector: "Investment Service",
    slug: "investment-service",
  },
  {
    sector: "Healthcare",
    subsector: "Healthcare Equipment & Providers",
    slug: "healthcare-equipment-providers",
  },
  {
    sector: "Healthcare",
    subsector: "Pharmaceuticals & Health Care Research",
    slug: "pharmaceuticals-health-care-research",
  },
  {
    sector: "Industrials",
    subsector: "Industrial Goods",
    slug: "industrial-goods",
  },
  {
    sector: "Industrials",
    subsector: "Industrial Services",
    slug: "industrial-services",
  },
  {
    sector: "Industrials",
    subsector: "Multi-sector Holdings",
    slug: "multi-sector-holdings",
  },
  {
    sector: "Infrastructures",
    subsector: "Heavy Constructions & Civil Engineering",
    slug: "heavy-constructions-civil-engineering",
  },
  {
    sector: "Infrastructures",
    subsector: "Telecommunication",
    slug: "telecommunication",
  },
  {
    sector: "Infrastructures",
    subsector: "Transportation Infrastructure",
    slug: "transportation-infrastructure",
  },
  { sector: "Infrastructures", subsector: "Utilities", slug: "utilities" },
  {
    sector: "Properties & Real Estate",
    subsector: "Properties & Real Estate",
    slug: "properties-real-estate",
  },
  {
    sector: "Technology",
    subsector: "Software & IT Services",
    slug: "software-it-services",
  },
  {
    sector: "Technology",
    subsector: "Technology Hardware & Equipment",
    slug: "technology-hardware-equipment",
  },
  {
    sector: "Transportation & Logistic",
    subsector: "Logistics & Deliveries",
    slug: "logistics-deliveries",
  },
  {
    sector: "Transportation & Logistic",
    subsector: "Transportation",
    slug: "transportation",
  },
];

export const supportedSubsectors = new Set<string>(
  sectorsData.map((e) => e.slug),
);

export const getSectors = () => {
  const map = new Map<string, { subsector: string; slug: string }[]>();
  sectorsData.forEach(({ sector, subsector, slug }) => {
    if (!map.has(sector)) map.set(sector, []);
    map.get(sector)!.push({ subsector, slug });
  });
  return Array.from(map, ([sector, subsectors]) => ({ sector, subsectors }));
};
