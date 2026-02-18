import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { normalizeSector } from "../../../data-modules/profiles/sector.js";
import { KV } from "../../../infrastructure/db/kv.js";
import type { JsonObject } from "../../../infrastructure/db/types.js";
import { logger } from "../../../utils/logger.js";
import { checkSymbol } from "../../aggregator/companies.js";
import { getCompanyReport } from "../../aggregator/company-report.js";
import { getEmittenInfo } from "../../stockbit/emitten-info.js";
import { getStockProfile as getStockbitProfile } from "../../stockbit/profile.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const PRIMARY_MODEL = "openai/gpt-5-mini";
const FALLBACK_MODEL = "x-ai/grok-4.1-fast";
const CACHE_PREFIX = "stock.profile.enriched";
const CACHE_TTL_MONTHS = 6;

const SYSTEM_PROMPT = `You are an equity research writer specialized in the Indonesia stock market (IDX).

Role:
Produce a standalone enriched company profile for an Indonesian listed company, using the provided Stockbit profile as baseline context and augmenting it with grounded web research.

Rules:
1. Focus on IDX/Indonesia context and terminology.
2. Prioritize official/primary sources internally (issuer website, IDX disclosures, annual/interim reports, regulator filings).
3. Use secondary media only to complement.
4. Output must be a finished internal report in markdown, not a conversation.
5. Do NOT include citations, source links, reference markers, or source list.
6. Do NOT include open questions, uncertainties, "could/might" speculation blocks, or calls-to-action.
7. For ownership/shareholders:
   - include controlling entities / group affiliation,
   - do NOT include exact ownership percentages.
8. Keep the report concise, factual, and practical. Avoid unnecessary detail.
9. Treat Stockbit profile as baseline input to enrich and refine, not to copy blindly.

Output format (Markdown only, exact sections):

# {TICKER} — Enriched Company Profile

## Snapshot
- Company name
- Exchange
- As-of date
- One-paragraph company description

## Group & Ownership
- Business group / parent affiliation
- Key controlling entities (names only, no percentages)
- Ownership structure summary (concise)

## Sector Classification
- Sector
- Subsector
- Industry positioning

## Business Model
- Core business lines
- Main revenue streams (qualitative)
- Typical customer base
- Key operating assets/capabilities

## Profit Drivers
- Primary earnings drivers
- Recurring vs project-based income characteristics
- High-level margin/cashflow profile

## Key Subsidiaries / Brands
- Important subsidiaries or operating entities
- Role of each entity (one line each)

## Recent Strategic Developments (Last 12 Months)
- 3 to 5 material developments
- Why each matters (brief)

## Risk Overview
- 3 to 5 core risks (structural/operational/financial/market)

## Investment Profile Summary
- One short concluding paragraph on what the company is, how it makes money, what drives performance, and key watchpoints.

Return only the markdown report.`;

export interface EnrichedStockProfile {
  symbol: string;
  generated_at: string;
  profile: string;
  company_name: string;
  subsector: string;
  listing_date: string;
  priceOverview: Record<string, number>;
}

const buildStockbitContextForPrompt = (
  stockbitProfile: Record<string, any>,
) => {
  const subsidiaries = Array.isArray(stockbitProfile.subsidiary)
    ? stockbitProfile.subsidiary.slice(0, 20).map((item) => ({
        company: item.company,
        types: item.types,
      }))
    : [];

  return {
    background: stockbitProfile.background ?? null,
    subsidiaries,
  };
};

export const getStockProfileReport = async (
  rawSymbol: string,
): Promise<EnrichedStockProfile> => {
  const symbol = await checkSymbol(rawSymbol);
  const cacheKey = `${CACHE_PREFIX}.${symbol}`;

  const existing = await KV.get(cacheKey);

  const [stockbitProfile, companyReport, emittenInfo] = await Promise.all([
    getStockbitProfile(symbol),
    getCompanyReport({ symbol }),
    getEmittenInfo({ symbol }),
  ]);

  const priceOverview = {
    price: +emittenInfo.price,
    change: +emittenInfo.change,
    percentage: emittenInfo.percentage,
    previous: +emittenInfo.previous,
    average: +emittenInfo.average,
    volume: +emittenInfo.volume,
  };

  if (existing) {
    return {
      ...(existing as unknown as Omit<EnrichedStockProfile, "priceOverview">),
      priceOverview,
    } as EnrichedStockProfile;
  }

  const stockbitContext = buildStockbitContextForPrompt(
    stockbitProfile as Record<string, any>,
  );
  const jakartaDateTime = dayjs().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm");

  const userPrompt = `Ticker Code:
${symbol}

Current Datetime (Asia/Jakarta):
${jakartaDateTime} WIB

Stockbit Profile Data:
${JSON.stringify(stockbitContext, null, 2)}`;

  const { text } = await generateText({
    model: openrouter(PRIMARY_MODEL, {
      models: [FALLBACK_MODEL],
      reasoning: {
        effort: "medium",
      },
      plugins: [
        {
          id: "web",
          max_results: 5,
        },
      ],
      web_search_options: {
        max_results: 5,
      },
    }),
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    maxRetries: 2,
    abortSignal: AbortSignal.timeout(10 * 60 * 1000),
  });

  const profileMarkdown = text.trim();

  if (!profileMarkdown) {
    throw new Error("OpenRouter returned empty stock profile");
  }

  const payload: EnrichedStockProfile = {
    symbol,
    generated_at: dayjs().utc().toISOString(),
    profile: profileMarkdown,
    company_name: companyReport.company_name,
    subsector: normalizeSector(companyReport.sub_sector),
    listing_date: companyReport.listing_date,
    priceOverview,
  };

  await KV.set(
    cacheKey,
    payload as unknown as JsonObject,
    dayjs().add(CACHE_TTL_MONTHS, "month").toDate(),
  );

  logger.info(
    {
      symbol,
      cacheKey,
      markdownLength: profileMarkdown.length,
    },
    "Generated and cached enriched stock profile",
  );

  return payload;
};
