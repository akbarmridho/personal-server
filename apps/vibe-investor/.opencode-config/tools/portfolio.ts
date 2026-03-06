import { readFile } from "node:fs/promises";
import path from "node:path";
import { tool } from "@opencode-ai/plugin";

type PortfolioPosition = {
  symbol: string;
  lots: number;
  shares: number;
  available_lots: number;
  available_shares: number;
  stock_on_hand: number;
  avg: number;
  last: number;
  market_value: number;
  amount_invested: number;
  unrealized_pnl: number;
  unrealized_gain: number;
};

type PortfolioSnapshot = {
  as_of: string;
  captured_at: string;
  cash: number;
  equity: number;
  invested: number;
  net_pnl: number;
  unrealized_pnl: number;
  gain: number;
  positions: PortfolioPosition[];
};

type TradeEvent = {
  event_id: string;
  captured_at: string;
  command: string;
  symbol: string;
  date: string;
  time: string;
  shares: number;
  lots: number;
  price: number;
  amount: number;
  fee: number;
  netamount: number;
  realized_amount: number;
  realized_percentage: number;
  status: string;
  display_as: string;
};

export function getConnectorDataRoot(contextDirectory: string): string {
  if (process.env.AI_CONNECTOR_DATA_ROOT) {
    return path.resolve(process.env.AI_CONNECTOR_DATA_ROOT);
  }
  if (process.env.OPENCODE_CWD) {
    return path.resolve(
      process.env.OPENCODE_CWD,
      "..",
      "client-connector-data",
    );
  }
  return path.resolve(contextDirectory, "..", "client-connector-data");
}

export function getStockbitNormalizedRoot(contextDirectory: string): string {
  return path.resolve(
    getConnectorDataRoot(contextDirectory),
    "stockbit",
    "normalized",
  );
}

export async function readLatestPortfolio(
  contextDirectory: string,
): Promise<PortfolioSnapshot> {
  const filePath = path.resolve(
    getStockbitNormalizedRoot(contextDirectory),
    "latest_portfolio.json",
  );
  const parsed = JSON.parse(
    await readFile(filePath, "utf8"),
  ) as PortfolioSnapshot;
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray(parsed.positions)
  ) {
    throw new Error(`Invalid latest_portfolio.json at ${filePath}`);
  }
  return parsed;
}

export async function readTradeEvents(
  contextDirectory: string,
): Promise<TradeEvent[]> {
  const filePath = path.resolve(
    getStockbitNormalizedRoot(contextDirectory),
    "trades.jsonl",
  );
  const raw = await readFile(filePath, "utf8");
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as TradeEvent);
}

export function withPortfolioWeights(
  snapshot: PortfolioSnapshot,
): Array<PortfolioPosition & { weight: number }> {
  const equity = toNumber(snapshot.equity);
  return snapshot.positions.map((position) => ({
    ...position,
    weight: equity > 0 ? toNumber(position.market_value) / equity : 0,
  }));
}

export function filterTradeEvents(
  events: TradeEvent[],
  filters: {
    symbol?: string;
    date_from?: string;
    date_to?: string;
    commands?: string[];
  },
): TradeEvent[] {
  const symbol = filters.symbol?.trim().toUpperCase();
  const commands =
    filters.commands
      ?.map((command) => command.trim().toUpperCase())
      .filter(Boolean) ?? [];

  return events.filter((event) => {
    if (symbol && event.symbol !== symbol) {
      return false;
    }
    if (filters.date_from && event.date < filters.date_from) {
      return false;
    }
    if (filters.date_to && event.date > filters.date_to) {
      return false;
    }
    if (commands.length > 0 && !commands.includes(event.command)) {
      return false;
    }
    return true;
  });
}

export function sortTradeEventsDesc(events: TradeEvent[]): TradeEvent[] {
  return [...events].sort((a, b) =>
    `${b.date}|${b.time}|${b.event_id}`.localeCompare(
      `${a.date}|${a.time}|${a.event_id}`,
    ),
  );
}

export function buildTradeJourney(symbol: string, events: TradeEvent[]) {
  const filtered = sortTradeEventsDesc(
    filterTradeEvents(events, {
      symbol,
      commands: ["BUY", "SELL"],
    }),
  ).reverse();

  let boughtShares = 0;
  let soldShares = 0;
  let buyAmount = 0;
  let sellNetAmount = 0;
  let realizedPnl = 0;

  for (const event of filtered) {
    if (event.command === "BUY") {
      boughtShares += toNumber(event.shares);
      buyAmount += toNumber(event.netamount || event.amount);
    } else if (event.command === "SELL") {
      soldShares += toNumber(event.shares);
      sellNetAmount += toNumber(event.netamount);
      realizedPnl += toNumber(event.realized_amount);
    }
  }

  return {
    symbol: symbol.toUpperCase(),
    event_count: filtered.length,
    bought_shares: boughtShares,
    sold_shares: soldShares,
    net_shares: boughtShares - soldShares,
    average_buy_price: boughtShares > 0 ? buyAmount / boughtShares : 0,
    average_sell_price: soldShares > 0 ? sellNetAmount / soldShares : 0,
    realized_pnl: realizedPnl,
    status: boughtShares - soldShares > 0 ? "OPEN_OR_PARTIAL" : "CLOSED",
    timeline: filtered,
  };
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export const state = tool({
  description:
    "Read the latest normalized Stockbit portfolio snapshot from connector-owned storage.",
  args: {
    include_positions: tool.schema
      .boolean()
      .default(true)
      .describe("Whether to include the positions array."),
    include_weights: tool.schema
      .boolean()
      .default(true)
      .describe("Whether to include deterministic position weights."),
  },
  async execute(args, context) {
    const snapshot = await readLatestPortfolio(context.directory);
    const positions = withPortfolioWeights(snapshot);
    const payload: Record<string, unknown> = {
      source_root: getStockbitNormalizedRoot(context.directory),
      as_of: snapshot.as_of,
      captured_at: snapshot.captured_at,
      cash: snapshot.cash,
      equity: snapshot.equity,
      invested: snapshot.invested,
      net_pnl: snapshot.net_pnl,
      unrealized_pnl: snapshot.unrealized_pnl,
      gain: snapshot.gain,
    };

    if (args.include_positions) {
      payload.positions = args.include_weights
        ? positions
        : positions.map(({ weight: _weight, ...position }) => position);
    }

    return JSON.stringify(payload, null, 2);
  },
});

export const trade_history = tool({
  description:
    "Read normalized Stockbit trade history from connector-owned storage with optional filters.",
  args: {
    symbol: tool.schema
      .string()
      .optional()
      .describe("Optional stock symbol filter, e.g. MEDC."),
    date_from: tool.schema
      .string()
      .optional()
      .describe("Optional lower bound in YYYY-MM-DD."),
    date_to: tool.schema
      .string()
      .optional()
      .describe("Optional upper bound in YYYY-MM-DD."),
    commands: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe("Optional command filter, e.g. BUY, SELL, DIVIDEND."),
    limit: tool.schema
      .number()
      .int()
      .min(1)
      .max(1000)
      .default(100)
      .describe("Maximum number of events to return."),
  },
  async execute(args, context) {
    const events = await readTradeEvents(context.directory);
    const filtered = sortTradeEventsDesc(
      filterTradeEvents(events, {
        symbol: args.symbol,
        date_from: args.date_from,
        date_to: args.date_to,
        commands: args.commands,
      }),
    ).slice(0, args.limit);

    return JSON.stringify(
      {
        source_root: getStockbitNormalizedRoot(context.directory),
        count: filtered.length,
        events: filtered,
      },
      null,
      2,
    );
  },
});

export const symbol_trade_journey = tool({
  description:
    "Reconstruct one symbol's normalized trade journey from connector-owned trade history.",
  args: {
    symbol: tool.schema.string().describe("Required stock symbol, e.g. MEDC."),
    date_from: tool.schema
      .string()
      .optional()
      .describe("Optional lower bound in YYYY-MM-DD."),
    date_to: tool.schema
      .string()
      .optional()
      .describe("Optional upper bound in YYYY-MM-DD."),
  },
  async execute(args, context) {
    const symbol = args.symbol.trim().toUpperCase();
    if (!symbol) {
      throw new Error("symbol is required");
    }

    const events = await readTradeEvents(context.directory);
    const filtered = filterTradeEvents(events, {
      symbol,
      date_from: args.date_from,
      date_to: args.date_to,
    });
    const journey = buildTradeJourney(symbol, filtered);

    return JSON.stringify(
      {
        source_root: getStockbitNormalizedRoot(context.directory),
        ...journey,
      },
      null,
      2,
    );
  },
});
