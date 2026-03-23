import { openrouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

/**
 * Complex reasoning tasks with web search.
 * GPT-5.4-nano cost $0.2 per run.
 * GPT-5.4-mini cost $0.35 per run.
 * Grok-4.1-fast cost $0.1 per run.
 * Sonar Reasoning Pro cost $0.075 per run.
 *
 * In the end, I'd prioritize gpt series good quality and cost efficiency.
 */
export const searchModel: LanguageModel = openrouter("openai/gpt-5.4-nano", {
  models: [
    "x-ai/grok-4.1-fast",
    "perplexity/sonar-reasoning-pro",
    "openai/gpt-5.4-mini",
  ],
  reasoning: { effort: "medium" },
  plugins: [{ id: "web" }],
});

/** Image content extraction and description. */
export const visionModel: LanguageModel = openrouter(
  // not as powerful as 3.1-flash-lite but it's much more cheaper (2.5x more expensive)
  // but for simple image to text this model is more than enough
  "google/gemini-2.5-flash-lite",
  {
    models: ["google/gemini-3.1-flash-lite-preview"],
  },
);

/** YouTube ingestion decisions. Fallback: gemini-3.1-flash-lite */
export const flashModelYoutube: LanguageModel = openrouter(
  "google/gemini-3-flash-preview",
  {
    models: ["google/gemini-3.1-flash-lite-preview"],
  },
);

/** Sector/subsector classification. */
export const classificationModel: LanguageModel = openrouter(
  "openai/gpt-oss-20b",
  {
    reasoning: { effort: "low" },
    models: ["nvidia/nemotron-3-nano-30b-a3b", "qwen/qwen3.5-flash-02-23"],
  },
);

/** PDF extraction and reconstruction. */
export const pdfModel: LanguageModel = openrouter(
  "google/gemini-3.1-flash-lite-preview",
  {
    models: ["openai/gpt-5.4-nano"],
  },
);
