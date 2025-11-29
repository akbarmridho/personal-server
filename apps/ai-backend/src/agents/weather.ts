import { openai } from "@ai-sdk/openai";
import { ToolLoopAgent, tool } from "ai";
import { z } from "zod";

export const weatherTool = tool({
  description: "Get the weather in a location",
  inputSchema: z.object({
    city: z.string(),
  }),
  needsApproval: true, // Require user approval
  execute: async ({ city }) => {
    return `${city} weather: it's always sunny`;
  },
});

export const weatherAgent = new ToolLoopAgent({
  model: openai("gpt-5-mini"),
  instructions: "You are a helpful weather assistant.",
  tools: {
    weather: weatherTool,
  },
});
