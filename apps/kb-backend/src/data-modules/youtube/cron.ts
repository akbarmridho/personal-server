import { inngest } from "../../infrastructure/inngest.js";
import { YOUTUBE_CHANNEL_CRAWL_INIT_CRON } from "../schedule.js";

export interface YoutubeChannel {
  channelName: string;
  channelRSS: string;
  channelUrl: string;
  titleMustInclude?: string;
}

export const youtubeChannels: YoutubeChannel[] = [
  {
    channelName: "Leon Hartono",
    channelUrl: "https://www.youtube.com/@leon.hartono/",
    channelRSS:
      "https://www.youtube.com/feeds/videos.xml?channel_id=UCFWKvu581DpCRFfadjjIy7w",
  },
  {
    channelName: "Rivan Kurniawan",
    channelUrl: "https://www.youtube.com/@RivanKurniawan",
    channelRSS:
      "https://www.youtube.com/feeds/videos.xml?channel_id=UCOJT3awaWLWM0eGnYR-CNeQ",
  },
  {
    channelName: "THINK Society",
    channelUrl: "https://www.youtube.com/@THINK.SOCIETY/",
    channelRSS:
      "https://www.youtube.com/feeds/videos.xml?channel_id=UCK0rrotBu7tzxqOweQ_8kKw",
  },
  {
    channelName: "Jonathan Thamrin",
    channelUrl: "https://www.youtube.com/@JonathanThamrin/",
    channelRSS:
      "https://www.youtube.com/feeds/videos.xml?channel_id=UCVoORmxqprlnxbHnd52gopw",
  },
  {
    channelName: "Malvin Hariyanto",
    channelUrl: "https://www.youtube.com/@malvin.hariyanto/",
    channelRSS:
      "https://www.youtube.com/feeds/videos.xml?channel_id=UC3MK0KROsnwRQbCBMaPpsag",
  },
  {
    channelName: "Creative Trader",
    channelUrl: "https://www.youtube.com/@creative.trader",
    // only include videos with #UBBM in title. rest is only noise
    channelRSS:
      "https://www.youtube.com/feeds/videos.xml?channel_id=UCU33A23NL8G3Hj-Jjb2dwfQ",
    titleMustInclude: "#UBBM",
  },
];

export const youtubeChannelCrawlInit = inngest.createFunction(
  {
    id: "youtube-channel-crawl-init",
    concurrency: 1,
  },
  { cron: YOUTUBE_CHANNEL_CRAWL_INIT_CRON },
  async ({ step }) => {
    await step.sendEvent(
      "publish-crawl",
      youtubeChannels.map((e) => {
        return {
          name: "data/youtube-crawl",
          data: e,
        };
      }),
    );
  },
);
