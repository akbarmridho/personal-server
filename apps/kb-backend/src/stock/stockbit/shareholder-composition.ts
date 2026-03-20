import type { BaseStockbitResponse } from "./auth.js";
import { stockbitPostJson, stockbitRequestJson } from "./client.js";

export type ShareholderCompositionType = "all" | "local" | "foreign";

interface ShareholderTokenResponse {
  value: string;
}

export interface ShareholderChartPoint {
  date: string;
  value: number;
  unix_date: string;
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
  color: string;
  latest_value: number | null;
  latest_date: string | null;
  change_value: number | null;
  chart_data: ShareholderChartPoint[];
}

export interface ShareholderCompositionChart {
  shareholder_type: ShareholderCompositionType;
  last_update: string;
  timeframe: ShareholderChartTimeframe[];
  series_by_item_name: Record<string, ShareholderCompositionLegendSummary>;
}

export interface ShareholderCompositionCharts {
  value_year: number;
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

const summarizeLegend = (legend: ShareholderChartLegend) => {
  const first = legend.chart_data[0];
  const latest =
    legend.chart_data.length > 0
      ? legend.chart_data[legend.chart_data.length - 1]
      : null;

  return {
    color: legend.color,
    latest_value: latest?.value ?? null,
    latest_date: latest?.date ?? null,
    change_value:
      first && latest ? +(latest.value - first.value).toFixed(4) : null,
    chart_data: legend.chart_data.map((point) => ({
      date: point.date,
      value: point.value,
      unix_date: point.unix_date,
    })),
  };
};

export const getShareholderCompositionChart = async (
  input: GetShareholderCompositionChartInput,
): Promise<ShareholderCompositionChart> => {
  const valueYear = input.valueYear ?? 12;
  const token = await getShareholderChartToken();

  const response = await stockbitRequestJson<BaseStockbitResponse<ShareholderChartData>>(
    {
      url: buildChartUrl(input.symbol, valueYear, input.shareholderType),
      method: "GET",
      authorizationOverride: token,
    },
  );

  const data = response.data;

  return {
    shareholder_type: input.shareholderType,
    last_update: data.last_update,
    timeframe: data.timeframe,
    series_by_item_name: Object.fromEntries(
      data.legend.map((item) => [item.item_name, summarizeLegend(item)]),
    ),
  };
};

export const getAllShareholderCompositionCharts = async (
  symbol: string,
  valueYear = 12,
): Promise<ShareholderCompositionCharts> => {
  const [all, local, foreign] = await Promise.all([
    getShareholderCompositionChart({
      symbol,
      valueYear,
      shareholderType: "all",
    }),
    getShareholderCompositionChart({
      symbol,
      valueYear,
      shareholderType: "local",
    }),
    getShareholderCompositionChart({
      symbol,
      valueYear,
      shareholderType: "foreign",
    }),
  ]);

  return {
    value_year: valueYear,
    all,
    local,
    foreign,
  };
};
