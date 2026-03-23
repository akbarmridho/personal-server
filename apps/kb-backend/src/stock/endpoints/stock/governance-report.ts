import { generateText } from "ai";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { KV } from "../../../infrastructure/db/kv.js";
import type { JsonObject } from "../../../infrastructure/db/types.js";
import { searchModel } from "../../../infrastructure/llm.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const CACHE_PREFIX = "stock.governance.report";
const CACHE_TTL_MONTHS = 2;

export interface EnrichedGovernanceReport {
  symbol: string;
  generated_at: string;
  report: string;
}

type GovernanceReportContext = {
  symbol: string;
  companyName: string;
  management: Record<string, any>;
  ownership: Record<string, any>;
};

const SYSTEM_PROMPT = `You are an equity research writer specialized in the Indonesia stock market (IDX).

Role:
Produce a grounded governance and ownership report for an Indonesian listed company using the provided structured governance baseline plus grounded web research.

Rules:
1. Focus on control, ownership structure, management context, governance quality, minority risk, and any material external governance-related controversy or regulatory issue.
2. Prioritize primary and formal evidence internally where possible (issuer website, IDX disclosures, annual/interim reports, regulator filings, company announcements). Use reported media only to complement.
3. Output must be a finished internal report in markdown, not a conversation.
4. Do NOT include citations, source links, reference markers, or a source list.
5. Do NOT invent allegations, unverified scandals, affiliate relationships, or control claims. If evidence is weak, say the relationship or issue is unclear.
6. Keep the report concise, factual, and practical.
7. Mention exact percentages only when they are already present in the provided baseline and materially helpful. Do not expand percentages beyond the provided structured data.
8. Distinguish structural ownership facts from reported governance issues or controversy.
9. If no material governance controversy or governance-related news is found in reviewed evidence, say so plainly instead of speculating.
10. Do not mainly rely on social media news like X/Twitter.

Output format (Markdown only, exact sections):

# {TICKER} — Governance & Ownership Report

## Controller & Ownership Structure
- likely controller or dominant holder
- key entities behind the structure when evidence supports it
- concentration, float-quality, and holder-base context

## Management & Board Context
- key management / board context
- executive ownership alignment if visible
- notable capital-allocation or governance-relevant observations

## Recent Governance / Ownership Developments
- 3 to 5 material items from the last 24 months if found
- only include governance, control, ownership, insider, legal, regulatory, or minority-relevant developments

## Governance & Minority Risk
- minority-alignment read
- affiliate / cross-holding complexity if evidenced
- overhang, dilution, pledge, legal, or governance watchpoints if evidenced

## Summary
- one short paragraph stating whether the structure looks clean, mixed, or risky, and the main reason why

Return only the markdown report.`;

export const getStockGovernanceReport = async (
  context: GovernanceReportContext,
): Promise<EnrichedGovernanceReport> => {
  const cacheKey = `${CACHE_PREFIX}.${context.symbol}`;
  const existing = await KV.get(cacheKey);

  if (existing) {
    return existing as unknown as EnrichedGovernanceReport;
  }

  const jakartaDateTime = dayjs().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm");
  const userPrompt = `Ticker Code:
${context.symbol}

Company Name:
${context.companyName}

Current Datetime (Asia/Jakarta):
${jakartaDateTime} WIB

Structured Governance Baseline:
${JSON.stringify(context, null, 2)}`;

  const { text } = await generateText({
    model: searchModel,
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

  const report = text.trim();
  if (!report) {
    throw new Error("OpenRouter returned empty governance report");
  }

  const payload: EnrichedGovernanceReport = {
    symbol: context.symbol,
    generated_at: dayjs().utc().toISOString(),
    report,
  };

  await KV.set(
    cacheKey,
    payload as unknown as JsonObject,
    dayjs().add(CACHE_TTL_MONTHS, "month").toDate(),
  );

  return payload;
};
