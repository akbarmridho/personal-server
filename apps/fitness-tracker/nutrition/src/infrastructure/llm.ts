import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { openrouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";
import { createFallback } from "ai-fallback";
import { env } from "./env.js";

const opencodego = createOpenAICompatible({
  name: "opencode-go",
  baseURL: "https://opencode.ai/zen/go/v1",
  apiKey: env.OPENCODE_GO_API_KEY,
});

/** Unified model for all nutrition LLM calls (/log vision+tools, /measure text parsing). */
export const nutritionModel: LanguageModel = createFallback({
  models: [
    opencodego("kimi-k2.6"),
    openrouter("moonshotai/kimi-k2.6"),
    openrouter("openai/gpt-5.4-mini"),
  ],
  modelResetInterval: 60000,
});
