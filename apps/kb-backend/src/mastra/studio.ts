import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { Express, Request, Response } from "express";
import express from "express";
import { logger } from "../utils/logger.js";

export interface StudioOptions {
  basePath?: string;
  telemetryDisabled?: boolean;
  hideCloudCta?: boolean;
  cloudApiEndpoint?: string;
  mastraServerHost?: string;
  mastraServerPort?: string;
  mastraServerProtocol?: string;
}

/**
 * Mounts Mastra Studio on an Express app at the specified basePath.
 * Studio has its own UI for users to configure the Mastra API host.
 */
export function mountStudio(app: Express, options: StudioOptions = {}) {
  const {
    basePath = "/studio",
    telemetryDisabled = true,
    hideCloudCta = true,
    cloudApiEndpoint = "",
  } = options;

  // Resolve the studio dist path from mastra package
  const require = createRequire(import.meta.url);
  let studioDistPath: string;

  try {
    const mastraPath = dirname(require.resolve("mastra/package.json"));
    studioDistPath = join(mastraPath, "dist", "studio");
  } catch {
    logger.error("Could not resolve mastra package path");
    throw new Error("mastra package not found");
  }

  if (!existsSync(studioDistPath)) {
    logger.error(`Studio distribution not found at ${studioDistPath}`);
    throw new Error(`Studio distribution not found at ${studioDistPath}`);
  }

  const indexHtmlPath = join(studioDistPath, "index.html");
  if (!existsSync(indexHtmlPath)) {
    logger.error(`Studio index.html not found at ${indexHtmlPath}`);
    throw new Error(`Studio index.html not found`);
  }

  // Read and process index.html - replace placeholders with empty values
  // Studio has its own UI for users to set the Mastra API host
  const processedHtml = readFileSync(indexHtmlPath, "utf8")
    .replaceAll("%%MASTRA_STUDIO_BASE_PATH%%", basePath)
    .replace("%%MASTRA_SERVER_HOST%%", options.mastraServerHost || "")
    .replace("%%MASTRA_SERVER_PORT%%", options.mastraServerPort || "")
    .replace("%%MASTRA_SERVER_PROTOCOL%%", options.mastraServerProtocol || "")
    .replace("%%MASTRA_TELEMETRY_DISABLED%%", String(telemetryDisabled))
    .replace("%%MASTRA_HIDE_CLOUD_CTA%%", String(hideCloudCta))
    .replace("%%MASTRA_CLOUD_API_ENDPOINT%%", cloudApiEndpoint);

  logger.info(`Studio mounted at ${basePath}, serving from ${studioDistPath}`);

  // Serve static assets from the studio dist folder
  app.use(`${basePath}/assets`, express.static(join(studioDistPath, "assets")));
  app.use(
    `${basePath}/mastra.svg`,
    express.static(join(studioDistPath, "mastra.svg")),
  );
  app.use(
    `${basePath}/favicon.ico`,
    express.static(join(studioDistPath, "favicon.ico")),
  );

  // SPA fallback - serve index.html for all studio routes
  app.get(`${basePath}`, (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html");
    res.send(processedHtml);
  });

  app.get(`${basePath}/*path`, (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html");
    res.send(processedHtml);
  });
}
