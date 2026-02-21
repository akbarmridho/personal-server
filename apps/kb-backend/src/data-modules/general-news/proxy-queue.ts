import { KV } from "../../infrastructure/db/kv.js";
import type { Json } from "../../infrastructure/db/types.js";
import type { GeneralNewsEvent } from "./ingest.js";

const KEY = "data-modules.general-news.proxy-queue.v1";

export async function getGeneralNewsProxyQueue(): Promise<GeneralNewsEvent[]> {
  const raw = await KV.get(KEY);
  return validateQueue(raw);
}

export async function queueGeneralNewsProxyItems(
  items: GeneralNewsEvent[],
): Promise<number> {
  if (items.length === 0) {
    return 0;
  }

  const existing = await getGeneralNewsProxyQueue();
  const merged = dedupeByUrl([...existing, ...items]);
  await KV.set(KEY, merged as unknown as Json);
  return merged.length;
}

export async function clearGeneralNewsProxyQueue(): Promise<void> {
  await KV.set(KEY, []);
}

function validateQueue(input: unknown): GeneralNewsEvent[] {
  if (input === null) {
    return [];
  }

  if (!Array.isArray(input)) {
    return [];
  }

  const output: GeneralNewsEvent[] = [];

  for (const item of input) {
    if (typeof item !== "object" || item === null) {
      continue;
    }

    const record = item as Record<string, unknown>;
    const url = record.url;
    const referenceDate = record.referenceDate;

    if (typeof url !== "string" || url.trim().length === 0) {
      continue;
    }

    output.push({
      url: url.trim(),
      referenceDate:
        typeof referenceDate === "string" && referenceDate.trim().length > 0
          ? referenceDate.trim()
          : undefined,
    });
  }

  return dedupeByUrl(output);
}

function dedupeByUrl(items: GeneralNewsEvent[]): GeneralNewsEvent[] {
  const byUrl = new Map<string, GeneralNewsEvent>();

  for (const item of items) {
    const existing = byUrl.get(item.url);
    if (!existing) {
      byUrl.set(item.url, item);
      continue;
    }

    if (!existing.referenceDate && item.referenceDate) {
      byUrl.set(item.url, item);
    }
  }

  return [...byUrl.values()];
}
