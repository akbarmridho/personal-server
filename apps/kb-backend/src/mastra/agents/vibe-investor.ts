import { readFile } from "node:fs/promises";
import { Agent } from "@mastra/core/agent";
import { MCPClient } from "@mastra/mcp";
import { Memory } from "@mastra/memory";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { stepCountIs } from "ai";
import dayjs from "dayjs";
import { env } from "../../infrastructure/env.js";
import { LimitTokenStep } from "../processor/limit-token-step.js";

export const vibeInvestorTools = new MCPClient({
  id: "vibe-investor-tools",
  servers: {
    search: {
      url: new URL(
        `https://mcp.exa.ai/mcp?tools=web_search_exa,crawling_exa&exaApiKey=${env.EXA_API_KEY}`,
      ),
    },
    notes: {
      url: new URL(`http://localhost:8021/mcp`),
    },
    stockMarket: {
      url: new URL(`http://localhost:3010/mcps/stock/mcp`),
    },
  },
});

export const vibeInvestorAgent = new Agent({
  id: "vibe-investor-agent",
  name: "Vibe Investor Agent",
  instructions: async () => {
    const prompt = await readFile("prompts/vibe-investor.md", {
      encoding: "utf-8",
    });

    return prompt.replaceAll(
      "{{datetime}}",
      `${dayjs().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm")} WIB`,
    );
  },
  model: openrouter("google/gemini-3-flash-preview"),
  tools: async () => {
    return await vibeInvestorTools.listTools();
  },
  memory: new Memory({
    options: {
      lastMessages: 100,
      generateTitle: {
        model: openrouter("openai/gpt-oss-20b", {
          models: [
            "openai/gpt-oss-120b",
            "xiaomi/mimo-v2-flash",
            "google/gemini-2.5-flash-lite-preview-09-2025",
          ],
        }),
      },
    },
  }),
  inputProcessors: [new LimitTokenStep()],
  defaultOptions: {
    stopWhen: stepCountIs(200),
    maxSteps: 200,
  },
  defaultGenerateOptionsLegacy: {
    maxSteps: 200,
  },
  defaultStreamOptionsLegacy: {
    maxSteps: 200,
  },
});
