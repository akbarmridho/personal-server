#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { resolveConfig } from "./config-resolver.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, "..");

// Load environment variables
loadEnv({ path: resolve(ROOT_DIR, ".env") });

// Check for OpenRouter API key
if (!process.env.OPENROUTER_API_KEY) {
  console.error(
    "❌ OPENROUTER_API_KEY not set. Please set it in your .env file.",
  );
  process.exit(1);
}

// Resolve config and output to stdout
const configPath = resolve(ROOT_DIR, "opencode-config.json");
const resolvedConfig = resolveConfig(configPath, ROOT_DIR);

// Output JSON to stdout (bash will capture this)
console.log(JSON.stringify(resolvedConfig));
