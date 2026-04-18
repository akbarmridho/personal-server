import { stockbitPostJson } from "./client.js";

const STOCKBIT_STREAM_TRENDING_URL =
  "https://exodus.stockbit.com/stream/v3/trending";

type StreamUser = {
  user_id: number;
  username: string;
  fullname: string;
  is_verified: boolean;
  verified_status: string;
};

type StreamItem = {
  stream_id: number;
  content: string;
  created_at: string;
  user: StreamUser;
  total_replies: number;
  total_likes: number;
  topics: string[];
  images: string[];
};

type StreamResponse = {
  message: string;
  data: {
    stream: StreamItem[];
    pagination: {
      is_last_page: boolean;
      next_cursor: number;
      total: number;
    };
  };
};

export type CompactStreamItem = {
  id: number;
  user: string;
  verified: boolean;
  content: string;
  likes: number;
  replies: number;
  symbols: string[];
  created: string;
  has_images: boolean;
};

export type CompactStreamResult = {
  date: string;
  items: CompactStreamItem[];
};

export async function getStockbitTrendingStream(args: {
  date: string;
}): Promise<CompactStreamResult> {
  const response = await stockbitPostJson<StreamResponse>(
    STOCKBIT_STREAM_TRENDING_URL,
    {
      date: args.date,
      last_stream_id: 0,
      limit: 20,
    },
  );

  const items: CompactStreamItem[] = response.data.stream.map((item) => ({
    id: item.stream_id,
    user: item.user.username,
    verified: item.user.is_verified,
    content: item.content,
    likes: item.total_likes,
    replies: item.total_replies,
    symbols: item.topics.filter((t) => /^[A-Z]{4}$/.test(t)),
    created: item.created_at,
    has_images: item.images.length > 0,
  }));

  return {
    date: args.date,
    items,
  };
}
