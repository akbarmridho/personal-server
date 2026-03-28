#!/usr/bin/env node

const DEFAULT_BASE_URL = "https://rag.akbarmr.dev";
const DEFAULT_LIMIT = 500;
const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_PAUSE_MS = 0;
const DEFAULT_MAX_REQUESTS = Number.POSITIVE_INFINITY;

function parseArgs(argv) {
  const options = {
    baseUrl: DEFAULT_BASE_URL,
    limit: DEFAULT_LIMIT,
    batchSize: DEFAULT_BATCH_SIZE,
    pauseMs: DEFAULT_PAUSE_MS,
    maxRequests: DEFAULT_MAX_REQUESTS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--base-url") {
      options.baseUrl = argv[index + 1] ?? options.baseUrl;
      index += 1;
      continue;
    }

    if (arg === "--limit") {
      options.limit = Number(argv[index + 1] ?? options.limit);
      index += 1;
      continue;
    }

    if (arg === "--batch-size") {
      options.batchSize = Number(argv[index + 1] ?? options.batchSize);
      index += 1;
      continue;
    }

    if (arg === "--pause-ms") {
      options.pauseMs = Number(argv[index + 1] ?? options.pauseMs);
      index += 1;
      continue;
    }

    if (arg === "--max-requests") {
      options.maxRequests = Number(argv[index + 1] ?? options.maxRequests);
      index += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  if (!Number.isFinite(options.limit) || options.limit <= 0) {
    throw new Error("--limit must be a positive number");
  }

  if (!Number.isFinite(options.batchSize) || options.batchSize <= 0) {
    throw new Error("--batch-size must be a positive number");
  }

  if (!Number.isFinite(options.pauseMs) || options.pauseMs < 0) {
    throw new Error("--pause-ms must be zero or a positive number");
  }

  if (
    options.maxRequests !== Number.POSITIVE_INFINITY &&
    (!Number.isFinite(options.maxRequests) || options.maxRequests <= 0)
  ) {
    throw new Error("--max-requests must be a positive number");
  }

  return options;
}

function printHelp() {
  console.log(`Backfill BM25 vectors by repeatedly calling /admin/backfill-bm25

Usage:
  node apps/knowledge-service/scripts/backfill-bm25.mjs [options]

Options:
  --base-url <url>       Base service URL. Default: ${DEFAULT_BASE_URL}
  --limit <number>       Per-request limit. Default: ${DEFAULT_LIMIT}
  --batch-size <number>  Per-request batch size. Default: ${DEFAULT_BATCH_SIZE}
  --pause-ms <number>    Delay between requests. Default: ${DEFAULT_PAUSE_MS}
  --max-requests <n>     Stop after N requests. Default: unlimited
  --help                 Show this help
`);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const endpoint = new URL("/admin/backfill-bm25", options.baseUrl);
  endpoint.searchParams.set("limit", String(options.limit));
  endpoint.searchParams.set("batch_size", String(options.batchSize));

  let requestCount = 0;
  let totalUpdated = 0;

  while (requestCount < options.maxRequests) {
    requestCount += 1;
    const startedAt = Date.now();

    console.log(
      `[${requestCount}] POST ${endpoint.toString()}`
    );

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    });

    const bodyText = await response.text();
    let payload;

    try {
      payload = JSON.parse(bodyText);
    } catch {
      payload = bodyText;
    }

    if (!response.ok) {
      console.error(`Request failed with status ${response.status}`);
      console.error(payload);
      process.exit(1);
    }

    const updatedCount = Number(payload.updated_count ?? 0);
    const remainingCount = Number(payload.remaining_count ?? 0);
    const hasMore = Boolean(payload.has_more);
    totalUpdated += updatedCount;

    console.log(
      `[${requestCount}] updated=${updatedCount} remaining=${remainingCount} has_more=${hasMore} took_ms=${Date.now() - startedAt}`
    );

    if (!hasMore || updatedCount === 0) {
      console.log(
        `Backfill finished after ${requestCount} request(s). total_updated=${totalUpdated}`
      );
      return;
    }

    if (options.pauseMs > 0) {
      await sleep(options.pauseMs);
    }
  }

  console.log(
    `Stopped after ${requestCount} request(s). total_updated=${totalUpdated}`
  );
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
