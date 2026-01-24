import { toAISdkV5Messages } from "@mastra/ai-sdk/ui";
import type { MastraUIMessage } from "@mastra/react";
import { MessageSquare, PlusIcon } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import { AssistantProvider } from "~/components/assistant/assistant-provider";
import { Thread } from "~/components/assistant/thread";
import { Button } from "~/components/ui/button";
import { useChatState } from "~/contexts/chat-context";
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

export default function ChatPage() {
  const agentId = import.meta.env.VITE_DEFAULT_AGENT_ID;
  const { selectedThreadId, setSelectedThreadId, isNewThread, setIsNewThread } =
    useChatState();

  const { data: memory } = useMemory(agentId);
  const { refetch: refreshThreads } = useThreads({
    resourceId: agentId,
    agentId,
    isMemoryEnabled: !!memory?.result,
  });

  const { data: messagesData, isLoading: isMessagesLoading } = useAgentMessages(
    {
      agentId,
      threadId: isNewThread ? undefined : selectedThreadId,
      memory: memory?.result ?? false,
    },
  );

  const handleNewThread = useCallback(() => {
    setIsNewThread(true);
    const newThreadId = crypto.randomUUID();
    setSelectedThreadId(newThreadId);
  }, [setIsNewThread, setSelectedThreadId]);

  // Auto-create thread if memory is enabled but no thread selected
  useEffect(() => {
    if (memory?.result && !selectedThreadId) {
      handleNewThread();
    }
  }, [memory?.result, selectedThreadId, handleNewThread]);

  const handleRefreshThreadList = () => {
    setIsNewThread(false);
    refreshThreads();
  };

  const initialMessages = useMemo(
    () =>
      messagesData?.messages
        ? (toAISdkV5Messages(messagesData.messages) as MastraUIMessage[])
        : [],
    [messagesData?.messages],
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-background">
      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        {selectedThreadId ? (
          <AssistantProvider
            agentId={agentId}
            threadId={selectedThreadId}
            initialMessages={initialMessages}
            refreshThreadList={handleRefreshThreadList}
          >
            {isMessagesLoading ? (
              <div className="flex h-full flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 animate-pulse">
                  <MessageSquare className="w-8 h-8 text-primary" />
                </div>
                <p className="text-muted-foreground animate-pulse">
                  Resuming your conversation...
                </p>
              </div>
            ) : (
              <Thread
                suggestions={suggestions}
                welcome="Ask about stocks, sectors, documents, and market trends"
              />
            )}
          </AssistantProvider>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold italic text-foreground/80">
              Vibe Chat Assistant
            </h2>
            <p className="text-muted-foreground max-w-sm">
              Ask me anything about stocks, technical indicators, or market
              sentiment. Select an existing thread or start a new one to begin.
            </p>
            <Button onClick={handleNewThread} className="mt-4">
              <PlusIcon className="mr-2 h-4 w-4" /> Start New Conversation
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
