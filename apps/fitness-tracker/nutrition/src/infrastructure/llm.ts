import { openrouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

/** Unified model for all nutrition LLM calls (/log vision+tools, /measure text parsing). */
export const nutritionModel: LanguageModel = openrouter("openai/gpt-5.4-mini", {
  models: ["google/gemini-3-flash-preview"],
});
