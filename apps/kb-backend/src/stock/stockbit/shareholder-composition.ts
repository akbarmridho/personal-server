import type { BaseStockbitResponse } from "./auth.js";
import { stockbitPostJson, stockbitRequestJson } from "./client.js";

export type ShareholderCompositionType = "all" | "local" | "foreign";

interface ShareholderTokenResponse {
  value: string;
}

export interface ShareholderChartPoint {
  date: string;
  value: number;
}

interface ShareholderChartLegend {
  color: string;
  item_name: string;
  chart_data: ShareholderChartPoint[];
}

export interface ShareholderChartTimeframe {
  year: string;
  value: number;
}

interface ShareholderChartData {
  last_update: string;
  timeframe: ShareholderChartTimeframe[];
  legend: ShareholderChartLegend[];
}

export interface ShareholderCompositionLegendSummary {
  latest_value: number | null;
  latest_date: string | null;
  change_value: number | null;
  chart_data: ShareholderChartPoint[];
}

export interface ShareholderCompositionChart {
  shareholder_type: ShareholderCompositionType;
  last_update: string;
  series_by_item_name: Record<string, ShareholderCompositionLegendSummary>;
}

export interface ShareholderCompositionCharts {
  value_year: number;
  timeframe: ShareholderChartTimeframe[];
  all: ShareholderCompositionChart;
  local: ShareholderCompositionChart;
  foreign: ShareholderCompositionChart;
}

type GetShareholderCompositionChartInput = {
  symbol: string;
  valueYear?: number;
  shareholderType: ShareholderCompositionType;
};

const SHAREHOLDER_TOKEN_URL =
  "https://exodus.stockbit.com/emitten-metadata/shareholders/token";

const buildChartUrl = (
  symbol: string,
  valueYear: number,
  shareholderType: ShareholderCompositionType,
) =>
  `https://exodus.stockbit.com/emitten-metadata/shareholders/${encodeURIComponent(
    symbol,
  )}/chart?symbol=${encodeURIComponent(
    symbol,
  )}&value_year=${valueYear}&shareholder_type=${shareholderType}`;

const getShareholderChartToken = async () => {
  const response = await stockbitPostJson<
    BaseStockbitResponse<ShareholderTokenResponse>
  >(SHAREHOLDER_TOKEN_URL);

  if (!response.data?.value) {
    throw new Error("Shareholder chart token is missing");
  }

  return response.data.value;
};

const fetchShareholderCompositionChartData = async (
  input: GetShareholderCompositionChartInput,
) => {
  const valueYear = input.valueYear ?? 12;
  const token = await getShareholderChartToken();

  const response = await stockbitRequestJson<BaseStockbitResponse<ShareholderChartData>>(
    {
      url: buildChartUrl(input.symbol, valueYear, input.shareholderType),
      method: "GET",
      authorizationOverride: token,
    },
  );

  return {
    shareholder_type: input.shareholderType,
    value_year: valueYear,
    data: response.data,
  };
};

const summarizeLegend = (legend: ShareholderChartLegend) => {
  const first = legend.chart_data[0];
  const latest =
    legend.chart_data.length > 0
      ? legend.chart_data[legend.chart_data.length - 1]
      : null;

  return {
    latest_value: latest?.value ?? null,
    latest_date: latest?.date ?? null,
    change_value:
      first && latest ? +(latest.value - first.value).toFixed(4) : null,
    chart_data: legend.chart_data.map((point) => ({
      date: point.date,
      value: point.value,
    })),
  };
};

export const getShareholderCompositionChart = async (
  input: GetShareholderCompositionChartInput,
): Promise<ShareholderCompositionChart> => {
  const { shareholder_type, data } =
    await fetchShareholderCompositionChartData(input);

  return {
    shareholder_type,
    last_update: data.last_update,
    series_by_item_name: Object.fromEntries(
      data.legend.map((item) => [item.item_name, summarizeLegend(item)]),
    ),
  };
};

export const getAllShareholderCompositionCharts = async (
  symbol: string,
  valueYear = 12,
): Promise<ShareholderCompositionCharts> => {
  const [allRaw, localRaw, foreignRaw] = await Promise.all([
    fetchShareholderCompositionChartData({
      symbol,
      valueYear,
      shareholderType: "all",
    }),
    fetchShareholderCompositionChartData({
      symbol,
      valueYear,
      shareholderType: "local",
    }),
    fetchShareholderCompositionChartData({
      symbol,
      valueYear,
      shareholderType: "foreign",
    }),
  ]);

  const toChart = ({
    shareholder_type,
    data,
  }: Awaited<ReturnType<typeof fetchShareholderCompositionChartData>>) => ({
    shareholder_type,
    last_update: data.last_update,
    series_by_item_name: Object.fromEntries(
      data.legend.map((item) => [item.item_name, summarizeLegend(item)]),
    ),
  });

  return {
    value_year: valueYear,
    timeframe: allRaw.data.timeframe,
    all: toChart(allRaw),
    local: toChart(localRaw),
    foreign: toChart(foreignRaw),
  };
};
