import fs from "node:fs";
import path from "node:path";
import dotenv from "@dotenvx/dotenvx";

/**
 * Finds the root of the monorepo by searching upwards from the current directory
 * for a `pnpm-workspace.yaml` file.
 */
const findMonorepoRoot = (startDir: string, maxDepth = 5) => {
  let currentDir = startDir;
  for (let i = 0; i < maxDepth; i++) {
    const workspaceFilePath = path.join(currentDir, "pnpm-workspace.yaml");
    if (fs.existsSync(workspaceFilePath)) {
      return currentDir;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached the filesystem root
      return null;
    }
    currentDir = parentDir;
  }
  return null;
};

let hasCalled = false;

/**
 * Load dotenv from monorepo .env then override it with .env from current working directory.
 */
export const loadDotenv = () => {
  if (hasCalled) return;

  hasCalled = true;

  const monorepoRoot = findMonorepoRoot(process.cwd());

  const dotenvPaths: string[] = [];

  if (monorepoRoot) {
    // Add the monorepo .env file to be loaded first (lowest priority)
    dotenvPaths.push(path.join(monorepoRoot, ".env"));
  }

  // Add the local .env files to be loaded next (higher priority)
  dotenvPaths.push(".env", ".env.local");

  dotenv.config({
    overload: true,
    path: dotenvPaths,
    ignore: ["MISSING_ENV_FILE"],
  });
};