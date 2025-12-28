import { KV } from "../../infrastructure/db/kv.js";
import type { JsonObject } from "../../infrastructure/db/types.js";
import { inngest } from "../../infrastructure/inngest.js";
import {
  getVideosFromChannel,
  type YoutubeKVStructure,
  youtubeGetCacheKey,
} from "./crawl.js";
import { youtubeChannels } from "./cron.js";

export const youtubeChannelCrawlFix = inngest.createFunction(
  {
    id: "youtube-channel-crawl-fix",
  },
  { event: "admin/youtube-channel-crawl-fix" },
  async () => {
    for (const channel of youtubeChannels) {
      const cacheKey = youtubeGetCacheKey(channel.channelRSS);

      const videos = await getVideosFromChannel(channel);

      const payload: YoutubeKVStructure = {
        processedUrls: videos.map((e) => e.url),
      };

      await KV.set(cacheKey, payload as any as JsonObject);
    }
  },
);
