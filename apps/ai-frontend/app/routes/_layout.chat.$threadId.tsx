import { toAISdkV5Messages } from "@mastra/ai-sdk/ui";
import type { MastraUIMessage } from "@mastra/react";
import { useMemo } from "react";
import { useLocation, useParams } from "react-router";
import { AssistantProvider } from "~/components/assistant/assistant-provider";
import { Thread } from "~/components/assistant/thread";
import { useAgentMessages } from "~/hooks/use-agent-messages";
import { useMemory } from "~/hooks/use-memory";
import { useThreads } from "~/hooks/use-threads";

const suggestions = [
  {
    title: "What's the latest stock news?",
    action: "What's the latest stock news?",
  },
  {
    title: "Analyze BBCA technicals",
    action: "Analyze BBCA technical indicators",
  },
  {
    title: "Show banking sector trends",
    action: "What are the current trends in the banking sector?",
  },
  {
    title: "Market outlook this week",
    action: "What's the market outlook for this week?",
  },
];

export default function ChatThreadPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const location = useLocation();
  const agentId = import.meta.env.VITE_DEFAULT_AGENT_ID;

  // Check if this is a brand new thread (skip initial fetch)
  const isNewThread = location.state?.isNewThread === true;

  const { data: memory } = useMemory(agentId);
  const { refetch: refreshThreads } = useThreads({
    resourceId: agentId,
    agentId,
    isMemoryEnabled: !!memory?.result,
  });

  // Only fetch messages if this is NOT a new thread
  const { data: messagesData } = useAgentMessages({
    agentId,
    threadId: isNewThread ? undefined : threadId,
    memory: memory?.result ?? false,
  });

  const handleRefreshThreadList = () => {
    refreshThreads();
  };

  const initialMessages = useMemo(
    () =>
      messagesData?.messages
        ? (toAISdkV5Messages(messagesData.messages) as MastraUIMessage[])
        : [],
    [messagesData?.messages],
  );

  if (!threadId) {
    return null;
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-background">
      <div className="flex-1 overflow-hidden flex justify-center">
        <div className="w-full max-w-4xl px-4">
          <AssistantProvider
            agentId={agentId}
            threadId={threadId}
            initialMessages={initialMessages}
            refreshThreadList={handleRefreshThreadList}
          >
            <Thread />
          </AssistantProvider>
        </div>
      </div>
    </div>
  );
}
