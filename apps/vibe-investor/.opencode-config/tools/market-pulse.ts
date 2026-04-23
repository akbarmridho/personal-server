import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { tool } from "@opencode-ai/plugin";
import { readLatestPortfolio } from "./portfolio.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

type OhlcvBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  value: number;
  frequency: number;
  foreignbuy: number;
  foreignsell: number;
  foreignflow: number;
  unixdate: number;
};

type BatchOhlcvItem = { symbol: string; daily: OhlcvBar[] };

type TrendingStock = {
  symbol: string;
  last: number;
  change: number;
  pct: number;
};

type MoverItem = {
  symbol: string;
  price: number;
  change: number;
  change_pct: number;
  value: number;
  volume: number;
  net_foreign_buy: number;
  net_foreign_sell: number;
};

type MoverCategory = { type: string; label: string; items: MoverItem[] };

type ScreenerItem = { symbol: string; metrics: Record<string, number> };
type ScreenerResult = {
  preset: string;
  screen_name: string;
  total: number;
  items: ScreenerItem[];
};

type MarketPulseResponse = {
  success: boolean;
  error?: string;
  data?: {
    as_of: string;
    trending: TrendingStock[];
    movers: {
      categories: MoverCategory[];
      net_foreign_updated_at: string | null;
    };
    screeners: ScreenerResult[];
    ohlcv: BatchOhlcvItem[];
    errors: Array<{ symbol: string; error: string }>;
  };
};

type SymbolFrontmatter = {
  id?: string;
  watchlist_status?: string;
  trade_classification?: string;
  thesis_id?: unknown[];
  last_reviewed?: string;
};

type TaContext = {
  risk_map?: {
    stop_level?: number;
    invalidation_level?: number;
    target_ladder?: number[];
    entry_zone?: { low?: number; mid?: number; high?: number };
  };
  location?: {
    support_zones?: Array<{ label?: string; mid?: number; strength?: string }>;
    resistance_zones?: Array<{
      label?: string;
      mid?: number;
      strength?: string;
    }>;
    value_area?: { poc?: number };
  };
};

// ─── Alert types ─────────────────────────────────────────────────────────────

type Alert = { id: string; priority: number; msg: string };

type SymbolOutput = {
  symbol: string;
  status: string | null;
  in_portfolio: boolean;
  trade_classification: string | null;
  thesis_id: unknown[] | null;
  days_since_review: number | null;
  last: number | null;
  prev_close: number | null;
  pct_1d: number | null;
  pct_1w: number | null;
  pct_1m: number | null;
  high_60d: number | null;
  low_60d: number | null;
  volume_last: number | null;
  avg_volume_20d: number | null;
  volume_ratio: number | null;
  atr_20d_pct: number | null;
  // MAs — fresh from OHLCV
  ema21_dist_pct: number | null;
  sma50_dist_pct: number | null;
  sma200_dist_pct: number | null;
  // Key levels — from ta_context (structural, not daily-fresh)
  key_levels: string | null;
  stop: number | null;
  invalidation: number | null;
  targets: number[] | null;
  entry_zone_low: number | null;
  entry_zone_high: number | null;
  alerts: Alert[] | null;
};

// ─── OHLCV computations ─────────────────────────────────────────────────────

function computeOhlcvFields(bars: OhlcvBar[]) {
  if (bars.length < 2) return null;

  // Sort ascending by date
  const sorted = [...bars].sort(
    (a: OhlcvBar, b: OhlcvBar) => a.unixdate - b.unixdate,
  );
  const n = sorted.length;
  const last = sorted[n - 1].close;
  const prevClose = sorted[n - 2].close;
  const pct1d = prevClose !== 0 ? ((last - prevClose) / prevClose) * 100 : 0;

  // pct_1w: 5 trading days back
  const pct1w =
    n > 5 && sorted[n - 6].close !== 0
      ? ((last - sorted[n - 6].close) / sorted[n - 6].close) * 100
      : null;

  // pct_1m: 21 trading days back
  const pct1m =
    n > 21 && sorted[n - 22].close !== 0
      ? ((last - sorted[n - 22].close) / sorted[n - 22].close) * 100
      : null;

  // 60-day window
  const window60 = sorted.slice(-60);
  const high60d = Math.max(...window60.map((b: OhlcvBar) => b.high));
  const low60d = Math.min(...window60.map((b: OhlcvBar) => b.low));

  // Volume
  const volumeLast = sorted[n - 1].volume;
  const vol20 = sorted.slice(-20);
  const avgVolume20d =
    vol20.length > 0
      ? vol20.reduce((s: number, b: OhlcvBar) => s + b.volume, 0) / vol20.length
      : 0;
  const volumeRatio = avgVolume20d > 0 ? volumeLast / avgVolume20d : 0;

  // ATR 20d
  const atrBars = sorted.slice(-21);
  let atrSum = 0;
  let atrCount = 0;
  for (let i = 1; i < atrBars.length; i++) {
    const tr = Math.max(
      atrBars[i].high - atrBars[i].low,
      Math.abs(atrBars[i].high - atrBars[i - 1].close),
      Math.abs(atrBars[i].low - atrBars[i - 1].close),
    );
    atrSum += tr;
    atrCount++;
  }
  const atr20d = atrCount > 0 ? atrSum / atrCount : 0;
  const atr20dPct = last > 0 ? (atr20d / last) * 100 : 0;

  // Internal fields for alerts
  let consecutiveUp = 0;
  for (let i = n - 1; i >= 1; i--) {
    if (sorted[i].close > sorted[i - 1].close) consecutiveUp++;
    else break;
  }

  let consecutiveDown = 0;
  for (let i = n - 1; i >= 1; i--) {
    if (sorted[i].close < sorted[i - 1].close) consecutiveDown++;
    else break;
  }

  const gapPct =
    prevClose !== 0 ? ((sorted[n - 1].open - prevClose) / prevClose) * 100 : 0;

  const high20 = Math.max(...sorted.slice(-20).map((b: OhlcvBar) => b.high));
  const low20 = Math.min(...sorted.slice(-20).map((b: OhlcvBar) => b.low));
  const drawdownFrom20dHigh = high20 > 0 ? ((last - high20) / high20) * 100 : 0;
  const rallyFrom20dLow = low20 > 0 ? ((last - low20) / low20) * 100 : 0;

  // ATR compression
  const atr5Bars = sorted.slice(-6);
  let atr5Sum = 0;
  let atr5Count = 0;
  for (let i = 1; i < atr5Bars.length; i++) {
    const tr = Math.max(
      atr5Bars[i].high - atr5Bars[i].low,
      Math.abs(atr5Bars[i].high - atr5Bars[i - 1].close),
      Math.abs(atr5Bars[i].low - atr5Bars[i - 1].close),
    );
    atr5Sum += tr;
    atr5Count++;
  }
  const atr5d = atr5Count > 0 ? atr5Sum / atr5Count : 0;
  const atrCompression = atr20d > 0 ? atr5d / atr20d : 1;

  // Volume trend
  const vol5 = sorted.slice(-5);
  const avgVol5 =
    vol5.length > 0
      ? vol5.reduce((s: number, b: OhlcvBar) => s + b.volume, 0) / vol5.length
      : 0;
  const volumeTrend = avgVolume20d > 0 ? avgVol5 / avgVolume20d : 1;

  // EMA21
  const ema21 = computeEma(
    sorted.map((b: OhlcvBar) => b.close),
    21,
  );
  const sma50 =
    n >= 50
      ? sorted.slice(-50).reduce((s: number, b: OhlcvBar) => s + b.close, 0) /
        50
      : null;
  const sma200 =
    n >= 200
      ? sorted.slice(-200).reduce((s: number, b: OhlcvBar) => s + b.close, 0) /
        200
      : null;

  const aboveEma21 = ema21 !== null ? last > ema21 : null;
  const aboveSma50 = sma50 !== null ? last > sma50 : null;

  // MA distance from price (%)
  const ema21DistPct =
    ema21 !== null && ema21 > 0 ? round2(((last - ema21) / ema21) * 100) : null;
  const sma50DistPct =
    sma50 !== null && sma50 > 0 ? round2(((last - sma50) / sma50) * 100) : null;
  const sma200DistPct =
    sma200 !== null && sma200 > 0
      ? round2(((last - sma200) / sma200) * 100)
      : null;

  // EMA21 cross in last 2 days
  let ema21Cross = false;
  if (n >= 4) {
    const closes = sorted.map((b: OhlcvBar) => b.close);
    const ema21Prev2 = computeEma(closes.slice(0, -1), 21);
    if (ema21 !== null && ema21Prev2 !== null) {
      const nowAbove = last > ema21;
      const prevAbove = sorted[n - 2].close > ema21Prev2;
      ema21Cross = nowAbove !== prevAbove;
    }
  }

  // RSI 14
  const rsi14 = computeRsi(
    sorted.map((b: OhlcvBar) => b.close),
    14,
  );

  return {
    last,
    prevClose,
    pct1d: round2(pct1d),
    pct1w: pct1w !== null ? round2(pct1w) : null,
    pct1m: pct1m !== null ? round2(pct1m) : null,
    high60d,
    low60d,
    volumeLast,
    avgVolume20d: Math.round(avgVolume20d),
    volumeRatio: round2(volumeRatio),
    atr20dPct: round2(atr20dPct),
    // MA distances
    ema21DistPct,
    sma50DistPct,
    sma200DistPct,
    // Internal alert fields
    _consecutiveUp: consecutiveUp,
    _consecutiveDown: consecutiveDown,
    _gapPct: round2(gapPct),
    _drawdownFrom20dHigh: round2(drawdownFrom20dHigh),
    _rallyFrom20dLow: round2(rallyFrom20dLow),
    _atrCompression: round2(atrCompression),
    _volumeTrend: round2(volumeTrend),
    _aboveEma21: aboveEma21,
    _aboveSma50: aboveSma50,
    _ema21Cross: ema21Cross,
    _rsi14: rsi14 !== null ? round2(rsi14) : null,
  };
}

function computeEma(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return ema;
}

function computeRsi(closes: number[], period: number): number | null {
  if (closes.length < period + 1) return null;
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }
  avgGain /= period;
  avgLoss /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss =
      (avgLoss * (period - 1) + (diff < 0 ? Math.abs(diff) : 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

// ─── Memory reading ──────────────────────────────────────────────────────────

async function readSymbolFrontmatter(
  symbolsRoot: string,
  symbolDir: string,
): Promise<SymbolFrontmatter | null> {
  try {
    const raw = await readFile(
      path.resolve(symbolsRoot, symbolDir, "plan.md"),
      "utf8",
    );
    return parseFrontmatter(raw);
  } catch {
    return null;
  }
}

function parseFrontmatter(raw: string): SymbolFrontmatter {
  if (!raw.startsWith("---\n")) return {};
  const closingIndex = raw.indexOf("\n---", 4);
  if (closingIndex === -1) return {};
  const lines = raw.slice(4, closingIndex).split("\n");
  const data: Record<string, unknown> = {};
  for (const line of lines) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    const val = match[2].trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      const inner = val.slice(1, -1).trim();
      data[key] = inner
        ? inner.split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
        : [];
    } else if (val === "null" || val === "~") {
      data[key] = null;
    } else {
      data[key] = val;
    }
  }
  return data as SymbolFrontmatter;
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ─── Alert evaluation ────────────────────────────────────────────────────────

function evaluateAlerts(
  sym: SymbolOutput,
  ohlcvInternal: {
    _consecutiveUp: number;
    _consecutiveDown: number;
    _gapPct: number;
    _drawdownFrom20dHigh: number;
    _rallyFrom20dLow: number;
    _atrCompression: number;
    _volumeTrend: number;
    _aboveEma21: boolean | null;
    _aboveSma50: boolean | null;
    _ema21Cross: boolean;
    _rsi14: number | null;
  } | null,
): Alert[] {
  const alerts: Alert[] = [];
  const { last, stop, invalidation, targets } = sym;
  const inPortfolio = sym.in_portfolio;

  // Tier 1 — Capital protection (portfolio positions at risk)
  if (
    inPortfolio &&
    last !== null &&
    stop !== null &&
    stop > 0 &&
    last <= stop
  ) {
    alerts.push({
      id: "stop_breached",
      priority: 1,
      msg: `price ${last} <= stop ${stop}`,
    });
  }
  if (
    last !== null &&
    invalidation !== null &&
    invalidation > 0 &&
    last <= invalidation
  ) {
    alerts.push({
      id: "invalidation_breached",
      priority: 1,
      msg: `price ${last} <= invalidation ${invalidation}`,
    });
  }
  if (
    inPortfolio &&
    ohlcvInternal &&
    ohlcvInternal._drawdownFrom20dHigh < -10
  ) {
    alerts.push({
      id: "position_drawdown",
      priority: 2,
      msg: `drawdown ${ohlcvInternal._drawdownFrom20dHigh}% from 20d high`,
    });
  }
  if (
    inPortfolio &&
    last !== null &&
    stop !== null &&
    stop > 0 &&
    last > stop &&
    last < stop * 1.1
  ) {
    alerts.push({
      id: "approaching_stop",
      priority: 3,
      msg: `price ${last} within 10% of stop ${round2(stop)}`,
    });
  }
  if (inPortfolio && ohlcvInternal && ohlcvInternal._consecutiveDown >= 5) {
    alerts.push({
      id: "consecutive_bleed",
      priority: 3,
      msg: `${ohlcvInternal._consecutiveDown} consecutive down days`,
    });
  }

  // Tier 2 — Discovery (dormant names waking up)
  const status = sym.status?.toUpperCase();
  if (
    (status === "SHELVED" || status === "ARCHIVED") &&
    ((sym.pct_1w !== null && Math.abs(sym.pct_1w) > 10) ||
      (sym.volume_ratio !== null && sym.volume_ratio > 3.0))
  ) {
    alerts.push({
      id: "shelved_wakeup",
      priority: 4,
      msg: `${status} moved: 1w=${sym.pct_1w}%, vol_ratio=${sym.volume_ratio}`,
    });
  }

  // Tier 2 — Entry zone hit (WATCHING/READY symbols reaching planned entry)
  if (
    !inPortfolio &&
    (status === "WATCHING" || status === "READY") &&
    last !== null &&
    sym.entry_zone_low !== null &&
    sym.entry_zone_high !== null
  ) {
    if (last >= sym.entry_zone_low && last <= sym.entry_zone_high) {
      alerts.push({
        id: "entry_zone_hit",
        priority: 5,
        msg: `price ${last} inside entry zone ${round2(sym.entry_zone_low)}-${round2(sym.entry_zone_high)}`,
      });
    } else if (
      last > sym.entry_zone_high &&
      last <= sym.entry_zone_high * 1.03
    ) {
      alerts.push({
        id: "entry_zone_near",
        priority: 7,
        msg: `price ${last} within 3% above entry zone ${round2(sym.entry_zone_low)}-${round2(sym.entry_zone_high)}`,
      });
    } else if (last < sym.entry_zone_low && last >= sym.entry_zone_low * 0.97) {
      alerts.push({
        id: "entry_zone_near",
        priority: 7,
        msg: `price ${last} within 3% below entry zone ${round2(sym.entry_zone_low)}-${round2(sym.entry_zone_high)}`,
      });
    }
  }

  // Tier 3 — Position management
  if (
    inPortfolio &&
    targets &&
    targets.length > 0 &&
    last !== null &&
    last >= targets[0]
  ) {
    alerts.push({
      id: "target_hit",
      priority: 6,
      msg: `price ${last} >= target ${round2(targets[0])}`,
    });
  }
  if (inPortfolio && ohlcvInternal && ohlcvInternal._consecutiveUp >= 5) {
    alerts.push({
      id: "position_streak_up",
      priority: 6,
      msg: `${ohlcvInternal._consecutiveUp} consecutive up days`,
    });
  }

  // Tier 4 — Price action (significant moves only)
  if (sym.pct_1d !== null && Math.abs(sym.pct_1d) > 5) {
    alerts.push({
      id: "big_daily_move",
      priority: 8,
      msg: `1d=${sym.pct_1d}%`,
    });
  }
  if (ohlcvInternal && Math.abs(ohlcvInternal._gapPct) > 3) {
    alerts.push({
      id: "gap_move",
      priority: 8,
      msg: `gap ${ohlcvInternal._gapPct}%`,
    });
  }
  if (sym.volume_ratio !== null && sym.volume_ratio > 3.0) {
    alerts.push({
      id: "volume_spike",
      priority: 9,
      msg: `vol_ratio=${sym.volume_ratio}`,
    });
  }
  if (
    ohlcvInternal &&
    ohlcvInternal._volumeTrend < 0.3 &&
    (status === "ACTIVE" || status === "READY")
  ) {
    alerts.push({
      id: "volume_dry",
      priority: 9,
      msg: `vol_trend=${ohlcvInternal._volumeTrend}`,
    });
  }
  if (
    last !== null &&
    sym.high_60d !== null &&
    sym.high_60d > 0 &&
    last >= sym.high_60d * 0.97
  ) {
    alerts.push({
      id: "near_60d_high",
      priority: 10,
      msg: `within 3% of 60d high ${sym.high_60d}`,
    });
  }
  if (
    last !== null &&
    sym.low_60d !== null &&
    sym.low_60d > 0 &&
    last <= sym.low_60d * 1.03
  ) {
    alerts.push({
      id: "near_60d_low",
      priority: 10,
      msg: `within 3% of 60d low ${sym.low_60d}`,
    });
  }
  if (ohlcvInternal && ohlcvInternal._atrCompression < 0.5) {
    alerts.push({
      id: "range_compression",
      priority: 10,
      msg: `atr_compression=${ohlcvInternal._atrCompression}`,
    });
  }
  if (ohlcvInternal?._ema21Cross) {
    alerts.push({
      id: "ema21_cross",
      priority: 10,
      msg: "EMA21 crossed in last 2 days",
    });
  }
  if (ohlcvInternal && ohlcvInternal._rsi14 !== null) {
    if (ohlcvInternal._rsi14 > 80) {
      alerts.push({
        id: "rsi_extreme",
        priority: 10,
        msg: `RSI=${ohlcvInternal._rsi14} (overbought)`,
      });
    } else if (ohlcvInternal._rsi14 < 20) {
      alerts.push({
        id: "rsi_extreme",
        priority: 10,
        msg: `RSI=${ohlcvInternal._rsi14} (oversold)`,
      });
    }
  }
  if (sym.pct_1w !== null && Math.abs(sym.pct_1w) > 15) {
    alerts.push({
      id: "big_weekly_move",
      priority: 11,
      msg: `1w=${sym.pct_1w}%`,
    });
  }
  if (sym.pct_1m !== null && Math.abs(sym.pct_1m) > 30) {
    alerts.push({
      id: "big_monthly_move",
      priority: 11,
      msg: `1m=${sym.pct_1m}%`,
    });
  }

  return alerts.sort((a, b) => a.priority - b.priority);
}

// ─── Tool ────────────────────────────────────────────────────────────────────

export default tool({
  description:
    "Get a compressed market-pulse snapshot: trending stocks, market movers, preset screeners, and watchlist alerts with batch OHLCV + memory context. Returns one structured payload for fast market overview and watchlist monitoring. Call this at the start of desk-check, deep-review, explore-idea, or any ad-hoc market check.",
  args: {},
  async execute(_args, context) {
    const cwd = context.directory;
    const symbolsRoot = path.resolve(cwd, "memory", "symbols");

    // 1. Collect all symbol directories
    const symbolDirs = await safeListDirs(symbolsRoot);

    // 2. Read frontmatter for all symbols
    const symbolMeta = new Map<string, SymbolFrontmatter>();
    await Promise.all(
      symbolDirs.map(async (dir) => {
        const fm = await readSymbolFrontmatter(symbolsRoot, dir);
        if (fm) symbolMeta.set(dir.toUpperCase(), fm);
      }),
    );

    const allSymbols = [...symbolMeta.keys()];

    // 3. Read portfolio — only need held symbol set for alert evaluation
    const heldSymbols = new Set<string>();
    try {
      const snapshot = await readLatestPortfolio(cwd);
      for (const p of snapshot.positions) {
        heldSymbols.add(p.symbol.toUpperCase());
      }
    } catch {
      // Portfolio unavailable — continue without it
    }

    // 4. Call kb-backend market-pulse endpoint
    const response = await fetch(
      "https://kb.akbarmr.dev/stock-market-id/market-pulse",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols: allSymbols }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Market pulse API failed: ${response.status} ${response.statusText}`,
      );
    }

    const apiResult = (await response.json()) as MarketPulseResponse;
    if (!apiResult.success || !apiResult.data) {
      throw new Error(
        `Market pulse API error: ${apiResult.error || "Unknown error"}`,
      );
    }

    const { trending, movers, screeners, ohlcv, errors } = apiResult.data;

    // Build OHLCV lookup
    const ohlcvMap = new Map<string, OhlcvBar[]>();
    for (const item of ohlcv) {
      ohlcvMap.set(item.symbol.toUpperCase(), item.daily);
    }

    // 5. Build per-symbol output with memory + OHLCV + alerts
    const today = todayWIB();
    const items: SymbolOutput[] = await Promise.all(
      allSymbols.map(async (symbol) => {
        const fm = symbolMeta.get(symbol) ?? {};
        const bars = ohlcvMap.get(symbol);
        const ohlcvFields = bars ? computeOhlcvFields(bars) : null;
        const inPortfolio = heldSymbols.has(symbol);

        // Days since review
        let daysSinceReview: number | null = null;
        if (typeof fm.last_reviewed === "string") {
          const msPerDay = 86_400_000;
          daysSinceReview = Math.floor(
            (new Date(today).getTime() - new Date(fm.last_reviewed).getTime()) /
              msPerDay,
          );
        }

        // Read memory context files
        const taCtx = await readJsonFile<TaContext>(
          path.resolve(
            symbolsRoot,
            symbol.toLowerCase(),
            `${symbol}_ta_context.json`,
          ),
        );

        // TA fields (stop/invalidation/targets for capital protection alerts)
        const stop = taCtx?.risk_map?.stop_level ?? null;
        const invalidation = taCtx?.risk_map?.invalidation_level ?? null;
        const targets = taCtx?.risk_map?.target_ladder ?? null;
        const entryZone = taCtx?.risk_map?.entry_zone ?? null;
        const entryZoneLow =
          entryZone?.low && entryZone.low > 0 ? entryZone.low : null;
        const entryZoneHigh =
          entryZone?.high && entryZone.high > 0 ? entryZone.high : null;

        // Key levels from ta_context (structural — S1, S2, POC, R1, R2)
        const keyLevelParts: string[] = [];
        const supports = taCtx?.location?.support_zones ?? [];
        const resistances = taCtx?.location?.resistance_zones ?? [];
        const poc = taCtx?.location?.value_area?.poc;
        if (supports.length > 0)
          keyLevelParts.push(`S1 ${Math.round(supports[0].mid ?? 0)}`);
        if (supports.length > 1)
          keyLevelParts.push(`S2 ${Math.round(supports[1].mid ?? 0)}`);
        if (poc) keyLevelParts.push(`POC ${Math.round(poc)}`);
        if (resistances.length > 0)
          keyLevelParts.push(`R1 ${Math.round(resistances[0].mid ?? 0)}`);
        if (resistances.length > 1)
          keyLevelParts.push(`R2 ${Math.round(resistances[1].mid ?? 0)}`);
        const keyLevels =
          keyLevelParts.length > 0 ? keyLevelParts.join(" | ") : null;

        const symOut: SymbolOutput = {
          symbol,
          status: fm.watchlist_status ?? null,
          in_portfolio: inPortfolio,
          trade_classification: fm.trade_classification ?? null,
          thesis_id: fm.thesis_id ?? null,
          days_since_review: daysSinceReview,
          last: ohlcvFields?.last ?? null,
          prev_close: ohlcvFields?.prevClose ?? null,
          pct_1d: ohlcvFields?.pct1d ?? null,
          pct_1w: ohlcvFields?.pct1w ?? null,
          pct_1m: ohlcvFields?.pct1m ?? null,
          high_60d: ohlcvFields?.high60d ?? null,
          low_60d: ohlcvFields?.low60d ?? null,
          volume_last: ohlcvFields?.volumeLast ?? null,
          avg_volume_20d: ohlcvFields?.avgVolume20d ?? null,
          volume_ratio: ohlcvFields?.volumeRatio ?? null,
          atr_20d_pct: ohlcvFields?.atr20dPct ?? null,
          ema21_dist_pct: ohlcvFields?.ema21DistPct ?? null,
          sma50_dist_pct: ohlcvFields?.sma50DistPct ?? null,
          sma200_dist_pct: ohlcvFields?.sma200DistPct ?? null,
          key_levels: keyLevels,
          stop: stop && stop > 0 ? stop : null,
          invalidation: invalidation && invalidation > 0 ? invalidation : null,
          targets: targets && targets.length > 0 ? targets : null,
          entry_zone_low: entryZoneLow,
          entry_zone_high: entryZoneHigh,
          alerts: null,
        };

        // Evaluate alerts
        const alerts = evaluateAlerts(symOut, ohlcvFields);
        symOut.alerts = alerts.length > 0 ? alerts : null;

        return symOut;
      }),
    );

    // 6. Sort: alerted first (by lowest priority), then non-alerted
    const alerted = items
      .filter((i) => i.alerts !== null)
      .sort((a, b) => {
        const aPri = a.alerts![0].priority;
        const bPri = b.alerts![0].priority;
        if (aPri !== bPri) return aPri - bPri;
        if (a.in_portfolio !== b.in_portfolio) return a.in_portfolio ? -1 : 1;
        return Math.abs(b.pct_1d ?? 0) - Math.abs(a.pct_1d ?? 0);
      });

    const nonAlerted = items
      .filter((i) => i.alerts === null)
      .sort((a, b) => {
        if (a.in_portfolio !== b.in_portfolio) return a.in_portfolio ? -1 : 1;
        return Math.abs(b.pct_1d ?? 0) - Math.abs(a.pct_1d ?? 0);
      });

    // 7. Build YAML output
    const MAX_MOVER_ROWS = 15;
    const MAX_SCREENER_ROWS = 15;
    const MIN_MOVER_VALUE = 5_000_000_000; // 5B IDR min transaction value filter

    const lines: string[] = [];
    const y = (indent: number, text: string) =>
      lines.push("  ".repeat(indent) + text);

    y(0, `as_of: "${apiResult.data.as_of}"`);
    y(0, `universe: ${items.length} symbols, ${alerted.length} alerted`);

    // Trending — compact CSV
    y(0, "trending: # symbol,price,change,pct");
    for (const t of trending) {
      y(1, `- ${t.symbol},${t.last},${t.change},${t.pct}`);
    }

    // Movers — top N, filtered by value, CSV rows
    for (const cat of movers.categories) {
      const filtered = cat.items
        .filter((m) => m.value >= MIN_MOVER_VALUE)
        .slice(0, MAX_MOVER_ROWS);
      y(0, `${cat.label}: # symbol,price,chg%,value,nfb,nfs`);
      for (const m of filtered) {
        y(
          1,
          `- ${m.symbol},${m.price},${round2(m.change_pct)},${compactNum(m.value)},${compactNum(m.net_foreign_buy)},${compactNum(m.net_foreign_sell)}`,
        );
      }
    }

    // Screeners — top N, CSV rows
    for (const scr of screeners) {
      const capped = scr.items.slice(0, MAX_SCREENER_ROWS);
      if (capped.length === 0) {
        y(0, `${scr.preset}: [] # ${scr.total} total`);
        continue;
      }
      const metricKeys =
        capped.length > 0 ? Object.keys(capped[0].metrics) : [];
      const shortKeys = metricKeys.map((k) => k.replace(/_/g, "").slice(0, 8));
      y(
        0,
        `${scr.preset}: # symbol,${shortKeys.join(",")} (${scr.total} total)`,
      );
      for (const item of capped) {
        const vals = metricKeys.map((k) => compactNum(item.metrics[k]));
        y(1, `- ${item.symbol},${vals.join(",")}`);
      }
    }

    // Watchlist — alerted symbols get full detail, non-alerted get one-liner
    y(0, "watchlist:");
    for (const sym of alerted) {
      y(1, `- ${sym.symbol}:`);
      y(
        2,
        `price: ${sym.last} (${fmtPct(sym.pct_1d)}d ${fmtPct(sym.pct_1w)}w ${fmtPct(sym.pct_1m)}m)`,
      );
      // MAs
      const maParts: string[] = [];
      if (sym.ema21_dist_pct !== null)
        maParts.push(`${fmtPct(sym.ema21_dist_pct)} EMA21`);
      if (sym.sma50_dist_pct !== null)
        maParts.push(`${fmtPct(sym.sma50_dist_pct)} SMA50`);
      if (sym.sma200_dist_pct !== null)
        maParts.push(`${fmtPct(sym.sma200_dist_pct)} SMA200`);
      if (maParts.length > 0) y(2, `mas: ${maParts.join(" | ")}`);
      // Key levels
      if (sym.key_levels) y(2, `sr: ${sym.key_levels}`);
      y(
        2,
        `vol: ${compactNum(sym.volume_last ?? 0)}/${compactNum(sym.avg_volume_20d ?? 0)} (${sym.volume_ratio}x) atr: ${sym.atr_20d_pct}%`,
      );
      // Alerts
      y(2, "alerts:");
      for (const a of sym.alerts!) {
        y(3, `- [P${a.priority}] ${a.id}: ${a.msg}`);
      }
    }

    // Non-alerted — one-liner each with volume ratio
    if (nonAlerted.length > 0) {
      y(1, "# --- no alerts ---");
      for (const sym of nonAlerted) {
        y(
          1,
          `- ${sym.symbol}: ${sym.last ?? "?"} (${fmtPct(sym.pct_1d)}d ${fmtPct(sym.pct_1w)}w) vol:${sym.volume_ratio ?? "?"}x`,
        );
      }
    }

    if (errors.length > 0) {
      y(0, "errors:");
      for (const e of errors) {
        y(1, `- ${e.symbol}: ${e.error}`);
      }
    }

    return lines.join("\n");
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function safeListDirs(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

function todayWIB(): string {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return wib.toISOString().slice(0, 10);
}

function compactNum(v: number): string {
  if (v === 0) return "0";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}${round2(abs / 1e12)}T`;
  if (abs >= 1e9) return `${sign}${round2(abs / 1e9)}B`;
  if (abs >= 1e6) return `${sign}${round2(abs / 1e6)}M`;
  if (abs >= 1e3) return `${sign}${round2(abs / 1e3)}K`;
  return `${sign}${abs}`;
}

function fmtPct(v: number | null): string {
  if (v === null) return "?";
  return v >= 0 ? `+${v}%` : `${v}%`;
}
