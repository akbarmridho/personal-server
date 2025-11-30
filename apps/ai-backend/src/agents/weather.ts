import { jsonSchema, ToolLoopAgent, tool } from "ai";
import type { JSONSchema7 } from "json-schema";
import { z } from "zod";
import { openrouter } from "../config/openrouter.js";

export const frontendTools = (
  tools: Record<string, { description?: string; parameters: JSONSchema7 }>,
) =>
  Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => [
      name,
      {
        ...(tool.description ? { description: tool.description } : undefined),
        inputSchema: jsonSchema(tool.parameters),
      },
    ]),
  );

export const weatherTool = tool({
  description: "Get the weather in a location",
  inputSchema: z.object({
    city: z.string(),
  }),
  needsApproval: false, // Require user approval
  execute: async ({ city }) => {
    return `${city} weather: it's always sunny`;
  },
});

export const getAgent = (name: string, userTools: Record<string, any>) => {
  const weatherAgent = new ToolLoopAgent({
    model: openrouter("openai/gpt-oss-20b:free"),
    instructions: "You are a helpful weather assistant.",
    tools: {
      ...frontendTools(userTools),
      weather: weatherTool,
    },
  });

  return weatherAgent;
};
