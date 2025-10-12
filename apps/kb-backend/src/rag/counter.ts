import { splitGraphemes } from "text-segmentation";

/**
 * Estimates Token counts with 1.45 as token estimation factor
 * Factor is based on: https://jina.ai/news/a-deep-dive-into-tokenization/
 *
 * Note: embeddings used now is voyage ai so this estimation might be incorrect.
 */
export const estimateEmbeddingTokenCount = (text: string): number => {
  const words = countWords(text);
  // Multiply by 1.45 as a token estimation factor
  return Math.ceil(words * 1.45);
};

/**
 * Counts words in text using grapheme splitting for accuracy.
 * Handles Unicode correctly and filters empty strings.
 */
export const countWords = (text: string): number => {
  return splitGraphemes(text).join("").trim().split(/\s+/).filter(Boolean)
    .length;
};
