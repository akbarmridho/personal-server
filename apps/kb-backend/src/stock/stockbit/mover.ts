import type { BaseStockbitResponse } from "./auth.js";
import { stockbitGetJson } from "./client.js";

export type MoverType =
  | "MOVER_TYPE_TOP_GAINER"
  | "MOVER_TYPE_TOP_LOSER"
  | "MOVER_TYPE_TOP_VALUE"
  | "MOVER_TYPE_NET_FOREIGN_BUY"
  | "MOVER_TYPE_NET_FOREIGN_SELL";

const ALL_MOVER_TYPES: MoverType[] = [
  "MOVER_TYPE_TOP_GAINER",
  "MOVER_TYPE_TOP_LOSER",
  "MOVER_TYPE_TOP_VALUE",
  "MOVER_TYPE_NET_FOREIGN_BUY",
  "MOVER_TYPE_NET_FOREIGN_SELL",
];

const FILTER_STOCKS = [
  "FILTER_STOCKS_TYPE_MAIN_BOARD",
  "FILTER_STOCKS_TYPE_DEVELOPMENT_BOARD",
  "FILTER_STOCKS_TYPE_ACCELERATION_BOARD",
  "FILTER_STOCKS_TYPE_NEW_ECONOMY_BOARD",
];

interface MoverItemRaw {
  stock_detail: {
    code: string;
    name: string;
    has_uma: boolean;
    notations: Array<{ code: string }>;
    corpaction: { active: boolean };
  };
  price: number;
  change: { value: number; percentage: number };
  value: { raw: number };
  volume: { raw: number };
  frequency: { raw: number };
  net_foreign_buy: { raw: number };
  net_foreign_sell: { raw: number };
}

interface MoverResponseData {
  mover_list: MoverItemRaw[];
  mover_type: string;
  net_foreign_updated_at: string;
}

export interface MoverItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  value: number;
  volume: number;
  frequency: number;
  net_foreign_buy: number;
  net_foreign_sell: number;
  uma: boolean;
  notations: string[];
  corp_action: boolean;
}

export interface MoverCategory {
  type: string;
  label: string;
  items: MoverItem[];
}

export interface MoverResult {
  categories: MoverCategory[];
  net_foreign_updated_at: string | null;
}

const MOVER_LABELS: Record<MoverType, string> = {
  MOVER_TYPE_TOP_GAINER: "top_gainer",
  MOVER_TYPE_TOP_LOSER: "top_loser",
  MOVER_TYPE_TOP_VALUE: "top_value",
  MOVER_TYPE_NET_FOREIGN_BUY: "net_foreign_buy",
  MOVER_TYPE_NET_FOREIGN_SELL: "net_foreign_sell",
};

function buildMoverUrl(moverType: MoverType): string {
  const filterParams = FILTER_STOCKS.map((f) => `filter_stocks=${f}`).join("&");
  return `https://exodus.stockbit.com/order-trade/market-mover?mover_type=${moverType}&${filterParams}`;
}

function normalizeMoverItem(raw: MoverItemRaw): MoverItem {
  return {
    symbol: raw.stock_detail.code,
    name: raw.stock_detail.name,
    price: raw.price,
    change: raw.change.value,
    change_pct: raw.change.percentage,
    value: raw.value.raw,
    volume: raw.volume.raw,
    frequency: raw.frequency.raw,
    net_foreign_buy: raw.net_foreign_buy.raw,
    net_foreign_sell: raw.net_foreign_sell.raw,
    uma: raw.stock_detail.has_uma,
    notations: (raw.stock_detail.notations ?? []).map((n) => n.code),
    corp_action: raw.stock_detail.corpaction?.active ?? false,
  };
}

export async function getMarketMovers(
  types?: MoverType[],
): Promise<MoverResult> {
  const requestedTypes = types && types.length > 0 ? types : ALL_MOVER_TYPES;

  const results = await Promise.all(
    requestedTypes.map(async (moverType) => {
      const url = buildMoverUrl(moverType);
      const raw =
        await stockbitGetJson<BaseStockbitResponse<MoverResponseData>>(url);

      return {
        type: moverType,
        label: MOVER_LABELS[moverType],
        items: (raw.data.mover_list ?? []).map(normalizeMoverItem),
        net_foreign_updated_at: raw.data.net_foreign_updated_at ?? null,
      };
    }),
  );

  return {
    categories: results.map(({ type, label, items }) => ({
      type,
      label,
      items,
    })),
    net_foreign_updated_at: results[0]?.net_foreign_updated_at ?? null,
  };
}
