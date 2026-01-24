const MASTRA_BASE_URL = import.meta.env.VITE_MASTRA_BASE_URL;

export interface Thread {
  id: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ThreadMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string;
}

/**
 * Fetch all threads for an agent
 */
export async function getThreads(agentId: string): Promise<Thread[]> {
  const response = await fetch(
    `${MASTRA_BASE_URL}/api/agents/${agentId}/memory/threads`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch threads: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch messages for a specific thread
 */
export async function getThreadMessages(
  agentId: string,
  threadId: string,
): Promise<ThreadMessage[]> {
  const response = await fetch(
    `${MASTRA_BASE_URL}/api/agents/${agentId}/memory/threads/${threadId}/messages`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch thread messages: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create a new thread
 */
export async function createThread(agentId: string): Promise<Thread> {
  const response = await fetch(
    `${MASTRA_BASE_URL}/api/agents/${agentId}/memory/threads`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to create thread: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete a thread
 */
export async function deleteThread(
  agentId: string,
  threadId: string,
): Promise<void> {
  const response = await fetch(
    `${MASTRA_BASE_URL}/api/agents/${agentId}/memory/threads/${threadId}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to delete thread: ${response.statusText}`);
  }
}
