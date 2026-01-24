import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { Memory } from "@mastra/memory";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { stepCountIs } from "ai";
import { z } from "zod";
import { LimitTokenStep } from "../processor/limit-token-step.js";

export const weatherTool = createTool({
  id: "get-weather",
  description: "Get current weather for a location",
  inputSchema: z.object({
    location: z.string().describe("City name"),
  }),
  outputSchema: z.object({
    output: z.string(),
  }),
  execute: async () => {
    return {
      output: "The weather is sunny",
    };
  },
});

export const vibeInvestorAgent = new Agent({
  id: "vibe-investor-agent",
  name: "Vibe Investor Agent",
  instructions: `
      You are a helpful weather assistant that provides accurate weather information.

      Your primary function is to help users get weather details for specific locations. When responding:
      - Always ask for a location if none is provided
      - If the location name isn't in English, please translate it
      - If giving a location with multiple parts (e.g. "New York, NY"), use the most relevant part (e.g. "New York")
      - Include relevant details like humidity, wind conditions, and precipitation
      - Keep responses concise but informative

      Use the weatherTool to fetch current weather data.
`,
  model: openrouter("xiaomi/mimo-v2-flash"),
  tools: { weatherTool },
  memory: new Memory({
    options: {
      lastMessages: 100,
      generateTitle: false,
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
