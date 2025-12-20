import fs from "node:fs/promises";

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

interface SubmissionData {
  post: RedditPost;
  comments: RedditComment[]; // Top-level comments with nested threads
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
function transformSubmission(json: any[]): SubmissionData {
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

async function main() {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf("--input");
  const outputIndex = args.indexOf("--output");

  if (
    inputIndex === -1 ||
    outputIndex === -1 ||
    !args[inputIndex + 1] ||
    !args[outputIndex + 1]
  ) {
    console.error(
      "Usage: ts-node reddit-transform.ts --input <path> --output <path>",
    );
    process.exit(1);
  }

  const inputPath = args[inputIndex + 1];
  const outputPath = args[outputIndex + 1];
  const rawJson = JSON.parse(await fs.readFile(inputPath, "utf-8"));
  const transformed = transformSubmission(rawJson);
  await fs.writeFile(outputPath, JSON.stringify(transformed, null, 2));
  console.log(`Transformed submission written to ${outputPath}`);
}

main().catch(console.error);
