import { apiFetch } from "./client";

interface GetReadArticlesResponse {
  profileId: string;
  articleIds: string[];
}

interface MarkReadResponse {
  articleIds: string[];
}

/**
 * Get all read article IDs for a specific profile
 */
export async function getReadArticles(
  profileId: string,
): Promise<string[]> {
  const response = await apiFetch<GetReadArticlesResponse>(
    `/knowledge/golden-article/reads/${encodeURIComponent(profileId)}`,
  );
  return response.articleIds;
}

/**
 * Mark an article as read
 */
export async function markAsRead(
  profileId: string,
  documentId: string,
): Promise<void> {
  await apiFetch<MarkReadResponse>(
    `/knowledge/golden-article/reads/${encodeURIComponent(profileId)}/read`,
    {
      method: "POST",
      body: JSON.stringify({ documentId }),
    },
  );
}

/**
 * Mark an article as unread
 */
export async function markAsUnread(
  profileId: string,
  documentId: string,
): Promise<void> {
  await apiFetch<MarkReadResponse>(
    `/knowledge/golden-article/reads/${encodeURIComponent(profileId)}/read/${encodeURIComponent(documentId)}`,
    {
      method: "DELETE",
    },
  );
}
