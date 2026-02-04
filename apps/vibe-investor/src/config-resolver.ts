import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ejs from "ejs";

/**
 * Resolves OpenCode config by processing:
 * 1. {env:VAR_NAME} -> environment variable values
 * 2. {file:path/to/file} -> file content (processed with EJS for includes)
 */
export function resolveConfig(
  configPath: string,
  rootDir: string,
): Record<string, any> {
  const configContent = readFileSync(configPath, "utf-8");
  const config = JSON.parse(configContent);

  // Prompts directory for shared includes
  const promptsDir = resolve(rootDir, "prompts");

  return resolveObject(config, rootDir, promptsDir);
}

/**
 * Recursively resolve placeholders in config object
 */
function resolveObject(obj: any, rootDir: string, promptsDir: string): any {
  if (typeof obj === "string") {
    return resolveString(obj, rootDir, promptsDir);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => resolveObject(item, rootDir, promptsDir));
  }

  if (obj !== null && typeof obj === "object") {
    const resolved: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      resolved[key] = resolveObject(value, rootDir, promptsDir);
    }
    return resolved;
  }

  return obj;
}

/**
 * Resolve string placeholders:
 * - {env:VAR_NAME} -> process.env.VAR_NAME
 * - {file:path/to/file} -> file content (with EJS processing)
 */
function resolveString(str: string, rootDir: string, promptsDir: string): string {
  // Resolve {env:VAR_NAME}
  str = str.replace(/\{env:([^}]+)\}/g, (_, varName) => {
    const value = process.env[varName];
    if (value === undefined) {
      throw new Error(`Environment variable ${varName} is not set`);
    }
    return value;
  });

  // Resolve {file:path/to/file}
  str = str.replace(/\{file:([^}]+)\}/g, (_, filePath) => {
    const absolutePath = resolve(rootDir, filePath);
    const fileContent = readFileSync(absolutePath, "utf-8");

    // Process file with EJS to handle includes
    // Support both relative includes (from file's dir) and shared includes (from prompts/)
    const fileDir = dirname(absolutePath);
    const processed = ejs.render(
      fileContent,
      {},
      {
        views: [fileDir, promptsDir], // Search in file's dir first, then prompts/
        filename: absolutePath,
      },
    );

    return processed;
  });

  return str;
}
