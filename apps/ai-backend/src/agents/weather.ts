import { ToolLoopAgent, tool } from "ai";
import { z } from "zod";
import { openrouter } from "../config/openrouter.js";

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
  model: openrouter("tngtech/tng-r1t-chimera:free"),
  instructions: "You are a helpful weather assistant.",
  tools: {
    weather: weatherTool,
  },
});
