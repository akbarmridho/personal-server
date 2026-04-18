import { ApifyClient } from "apify-client";
import { KV } from "../../infrastructure/db/kv.js";
import { env } from "../../infrastructure/env.js";

const client = new ApifyClient({ token: env.APIFY_API_KEY });
const ACTOR_ID = "shu8hvrXbJbY3Eb9W";
const KV_KEY = "data-modules.instagram.ingested-ids";
const KV_ARRAY_PATH = "ids";

export interface InstagramAccount {
  url: string;
  username: string;
}

export const INSTAGRAM_ACCOUNTS: InstagramAccount[] = [
  {
    url: "https://www.instagram.com/joeliardisunendar/",
    username: "joeliardisunendar",
  },
  {
    url: "https://www.instagram.com/ricky.a.h_2212/",
    username: "ricky.a.h_2212",
  },
  {
    url: "https://www.instagram.com/creative.trader.20/",
    username: "creative.trader.20",
  },
];

export interface InstagramPost {
  id: string;
  caption: string;
  url: string;
  timestamp: string;
  images: string[];
  displayUrl: string;
  alt: string;
  ownerUsername: string;
  ownerFullName: string;
}

export async function fetchPosts(
  urls: string[],
  limit: number,
): Promise<InstagramPost[]> {
  const run = await client.actor(ACTOR_ID).call({
    directUrls: urls,
    resultsType: "posts",
    resultsLimit: limit,
    searchType: "hashtag",
    searchLimit: 1,
    addParentData: false,
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  return items
    .filter((item: any) => item.type !== "Video")
    .map((item: any) => ({
      id: String(item.id),
      caption: item.caption ?? "",
      url: item.url ?? "",
      timestamp: item.timestamp ?? "",
      images: item.images ?? [],
      displayUrl: item.displayUrl ?? "",
      alt: item.alt ?? "",
      ownerUsername: item.ownerUsername ?? "",
      ownerFullName: item.ownerFullName ?? "",
    }));
}

export async function filterNewPosts(
  posts: InstagramPost[],
): Promise<InstagramPost[]> {
  const existing = ((await KV.get(KV_KEY)) as any)?.ids ?? [];
  const existingSet = new Set<string>(existing);
  return posts.filter((p) => !existingSet.has(p.id));
}

export async function markIngested(postId: string): Promise<void> {
  await KV.arrayAdd(KV_KEY, KV_ARRAY_PATH, postId);
}
