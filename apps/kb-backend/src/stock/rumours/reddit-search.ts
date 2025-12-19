import "@dotenvx/dotenvx/config";
import { Impit } from "impit";
import pRetry from "p-retry";
import { CookieJar } from "tough-cookie";
import { env } from "../../infrastructure/env.js";

// Shared base interfaces for posts and comments
interface RedditUser {
  name: string;
}

interface RedditTimestamp {
  created_utc: number; // Unix timestamp in seconds
}

interface RedditVotes {
  ups: number;
  score: number;
}

interface RedditItem {
  id: string;
  author: RedditUser;
  timestamp: RedditTimestamp;
  votes: RedditVotes;
  permalink?: string;
}

// Post interface (shared between home listings and submission)
interface RedditPost extends RedditItem {
  title: string;
  selftext?: string;
  url?: string;
  num_comments: number;
}

// Comment interface (tree structure for threaded replies)
interface RedditComment extends RedditItem {
  body: string;
  replies?: RedditComment[]; // Nested replies (recursive tree)
}

// Top-level transformed data
interface SubredditHomeData {
  posts: RedditPost[]; // Top posts (e.g., sorted by ups descending)
}

interface SubmissionData {
  post: RedditPost;
  comments: RedditComment[]; // Top-level comments with nested threads
}

/**
 * Transforms raw subreddit.json (home feed Listing) into SubredditHomeData.
 * Extracts essentials: title, author, date, permalink, ups, selftext, url, num_comments.
 * Returns posts sorted by ups descending (top for day).
 */
function transformSubredditHome(json: any): SubredditHomeData {
  const posts =
    json.data?.children
      ?.filter((child: any) => child.kind === "t3")
      ?.map((child: any) => {
        const data = child.data;
        return {
          id: data.id ?? "",
          author: { name: data.author ?? "Unknown" },
          timestamp: { created_utc: data.created_utc ?? 0 },
          votes: { ups: data.ups ?? 0, score: data.score ?? 0 },
          permalink: data.permalink,
          title: data.title ?? "",
          selftext: data.selftext ?? undefined,
          url: data.url,
          num_comments: data.num_comments ?? 0,
        } as RedditPost;
      })
      ?.sort((a: RedditPost, b: RedditPost) => b.votes.ups - a.votes.ups) ?? []; // Sort top by ups

  return { posts };
}

/**
 * Recursively builds comment tree from nested Listing.children.
 * Handles threaded replies.
 */
function buildCommentTree(children: any[]): RedditComment[] {
  return (
    (children
      ?.map((child: any) => {
        if (child.kind !== "t1") return null;
        const data = child.data;
        return {
          id: data.id ?? "",
          author: { name: data.author ?? "Unknown" },
          timestamp: { created_utc: data.created_utc ?? 0 },
          votes: { ups: data.score ?? 0, score: data.score ?? 0 },
          permalink: `/r/${data.subreddit}/comments/${data.link_id.slice(3)}/${data.id}/`,
          body: data.body ?? "",
          replies: data.replies?.data?.children
            ? buildCommentTree(data.replies.data.children)
            : undefined,
        } as RedditComment;
      })
      ?.filter(Boolean) as RedditComment[]) ?? []
  );
}

/**
 * Helper to transform a single t3 post child into RedditPost.
 */
function transformPost(child: any): RedditPost {
  const data = child.data;
  return {
    id: data.id ?? "",
    author: { name: data.author ?? "Unknown" },
    timestamp: { created_utc: data.created_utc ?? 0 },
    votes: { ups: data.ups ?? 0, score: data.score ?? 0 },
    permalink: data.permalink,
    title: data.title ?? "",
    selftext: data.selftext ?? undefined,
    url: data.url,
    num_comments: data.num_comments ?? 0,
  };
}

/**
 * Transforms raw submission.json (array: [post Listing, comments Listing]) into SubmissionData.
 * Reconstructs comment threads recursively.
 */
export function transformSubmission(json: any[]): SubmissionData {
  if (!json || json.length < 2) {
    throw new Error(
      "Invalid submission JSON: expected array with post and comments listings",
    );
  }

  const postListing = json[0];
  const postChild = postListing.data?.children?.[0];
  if (!postChild || postChild.kind !== "t3") {
    throw new Error("Invalid post in submission JSON");
  }
  const post = transformPost(postChild);

  const commentsListing = json[1];
  const topComments = buildCommentTree(commentsListing.data?.children ?? []);

  return { post, comments: topComments };
}

const impit = new Impit({
  browser: "chrome",
  proxyUrl: env.STOCK_HTTP_PROXY_URL,
  ignoreTlsErrors: true,
  vanillaFallback: true,
  cookieJar: new CookieJar(),
});

export const getSubredditOverview = async (): Promise<SubredditHomeData> => {
  const data = await pRetry(
    async () => {
      const response = await impit.fetch(
        "https://www.reddit.com/r/JudiSaham/top.json?t=day",
      );

      if (response.status >= 300) {
        throw new Error(
          `[reddit] HTTP ${response.status} ${response.statusText}`,
        );
      }

      return await response.json();
    },
    { retries: 3 },
  );

  return transformSubredditHome(data);
};

export const getSubmission = async (
  permalink: string,
): Promise<SubmissionData> => {
  const data = await pRetry(
    async () => {
      // Build the URL by removing trailing slash and appending .json
      const cleanPermalink = permalink.replace(/\/$/, "");
      const url = `https://www.reddit.com${cleanPermalink}.json`;
      const response = await impit.fetch(url);

      if (response.status >= 300) {
        throw new Error(
          `[reddit] HTTP ${response.status} ${response.statusText}`,
        );
      }

      return await response.json();
    },
    { retries: 3 },
  );

  return transformSubmission(data);
};
