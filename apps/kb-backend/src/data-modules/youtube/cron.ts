import { inngest } from "../../infrastructure/inngest.js";

export interface YoutubeChannel {
  channelName: string;
  channelRSS: string;
  channelUrl: string;
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
];

export const youtubeChannelCrawlInit = inngest.createFunction(
  {
    id: "youtube-channel-crawl-init",
    concurrency: 1,
  },
  // daily at 20.00
  { cron: "TZ=Asia/Jakarta 00 20 * * *" },
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
