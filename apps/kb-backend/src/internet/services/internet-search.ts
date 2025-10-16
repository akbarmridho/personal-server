import {
  type GoogleGenerativeAIProviderMetadata,
  google,
} from "@ai-sdk/google";
import { logger } from "@personal-server/common/utils/logger";
import { generateText, stepCountIs } from "ai";
import pRetry from "p-retry";

export interface SearchResult {
  result: string;
  citations: { url: string; title: string }[];
}

export const performBaseSearch = async ({
  query,
  systemPrompt,
}: {
  query: string;
  systemPrompt: string;
}): Promise<SearchResult> => {
  const searchResult = await pRetry(
    async () => {
      const response = await generateText({
        model: google("gemini-flash-latest"),
        tools: {
          google_search: google.tools.googleSearch({}) as any,
        },
        system: systemPrompt,
        prompt: query,
        stopWhen: stepCountIs(5),
      });

      const { text, finishReason, providerMetadata, sources } = response;

      if (finishReason === "error" || !text) {
        throw new Error(
          `Finish reason: ${finishReason}. Either error or no text generated`,
        );
      }

      const metadata = providerMetadata?.google as
        | GoogleGenerativeAIProviderMetadata
        | undefined;
      const groundingMetadata = metadata?.groundingMetadata;

      let annotatedText = text;
      const supports = groundingMetadata?.groundingSupports ?? [];
      const chunks = groundingMetadata?.groundingChunks ?? [];

      if (supports.length && chunks.length) {
        const sortedSupports = [...supports].sort(
          (a, b) => (b.segment?.endIndex ?? 0) - (a.segment?.endIndex ?? 0),
        );

        for (const support of sortedSupports) {
          const endIndex = support.segment?.endIndex;
          if (
            endIndex === undefined ||
            !endIndex ||
            !support.groundingChunkIndices?.length
          )
            continue;

          const citationLinks = support.groundingChunkIndices
            .map((i: number) => {
              const uri = chunks[i]?.web?.uri;
              return uri ? `[${i + 1}](${uri})` : null;
            })
            .filter(Boolean);

          if (citationLinks.length > 0) {
            const citationString = citationLinks.join(", ");
            annotatedText =
              annotatedText.slice(0, endIndex) +
              citationString +
              annotatedText.slice(endIndex);
          }
        }
      }

      // --- Extract sources for reference ---
      const citations =
        sources
          ?.filter((e) => e.sourceType === "url")
          ?.map((e) => ({
            title: e.title || "",
            url: e.url,
          })) ?? [];

      const result: SearchResult = {
        result: annotatedText,
        citations,
      };

      logger.info({ ...result, query }, "Search performed");

      return result;
    },
    { retries: 3 },
  );

  return searchResult;
};

export const performGeneralSearch = ({
  query,
}: {
  query: string;
}): Promise<SearchResult> => {
  return performBaseSearch({
    query,
    systemPrompt: `You are an intelligent search exploration agent.  
Your goal is to perform broad, multi-step reasoning and exploration to find high-quality, diverse information related to the user's query.  
You should:
- Understand the user’s question and expand it into multiple related subtopics or perspectives if useful.  
- Use your \`googleSearch\` tool to explore across different sources when necessary.  
- Provide a concise and coherent summary that synthesizes the findings rather than copying snippets.  
- Include supporting citations that clearly show where each key insight originated.  
- Be mindful of time and cost — prefer a small number of high-value searches over excessive exploration.  
- If the user’s query is already specific, stay focused; if it’s broad or open-ended, explore relevant adjacent areas.

Your output must be written clearly, factual, and well-structured, with reasoning that demonstrates exploration and synthesis rather than shallow lookup.
`,
  });
};

export const performInvestmentSearch = ({
  query,
}: {
  query: string;
}): Promise<SearchResult> => {
  return performBaseSearch({
    query,
    systemPrompt: `You are a financial and investment-focused search exploration agent.  
Your goal is to analyze and summarize information about market trends, stocks, or economic topics mentioned by the user.  
You should:
- Search not only for news about the specific stock or market mentioned but also explore related global and domestic (Indonesia and major markets such as the U.S., China, and Europe) factors that could influence it.  
- Consider macroeconomic conditions, policy changes, political situations, global events, and market sentiment.  
- Include relevant rumours, forecasts, or speculative signals — but clearly indicate their credibility or uncertainty level.  
- Encourage multi-step exploration and reasoning: start from the user’s topic, then connect to potentially correlated or hidden drivers.  
- Always provide clear citations with accurate URLs and titles.  
- Stay balanced and factual; do not give financial advice or predictions — only summarize and analyze the context from search results.

Your output should read like a concise market intelligence brief:  
1. Overview of what’s currently happening  
2. Key factors and cross-regional influences  
3. Cited sources for verification
`,
  });
};
