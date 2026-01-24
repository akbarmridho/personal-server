import { toAISdkV5Messages } from "@mastra/ai-sdk/ui";
import type { MastraUIMessage } from "@mastra/react";
import { PlusIcon, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AssistantProvider } from "~/components/assistant/assistant-provider";
import { Thread } from "~/components/assistant/thread";
import { ThreadListSkeleton } from "~/components/assistant/thread-list-skeleton";
import { Button } from "~/components/ui/button";
import { useAgent } from "~/hooks/use-agent";
import { useAgentMessages } from "~/hooks/use-agent-messages";
import { useDeleteThread } from "~/hooks/use-delete-thread";
import { useMemory } from "~/hooks/use-memory";
import { useThreads } from "~/hooks/use-threads";

interface StorageThreadType {
  id: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
}

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

/**
 * Main chat page with AI assistant
 * Provides full-page chat interface with thread management for investment-related questions
 */
export default function ChatPage() {
  const agentId = import.meta.env.VITE_DEFAULT_AGENT_ID;
  const [selectedThreadId, setSelectedThreadId] = useState<string>();
  const [isNewThread, setIsNewThread] = useState(false);

  const { data: agent, isLoading: isAgentLoading } = useAgent(agentId);
  const { data: memory } = useMemory(agentId);
  const {
    data: threads,
    isLoading: isThreadsLoading,
    refetch: refreshThreads,
  } = useThreads({
    resourceId: agentId,
    agentId,
    isMemoryEnabled: !!memory?.result,
  });
  const { mutateAsync: deleteThread } = useDeleteThread();

  const { data: messagesData, isLoading: isMessagesLoading } = useAgentMessages(
    {
      agentId,
      threadId: isNewThread ? undefined : selectedThreadId,
      memory: memory?.result ?? false,
    },
  );

  // Auto-create thread if memory is enabled but no thread selected
  useEffect(() => {
    if (memory?.result && !selectedThreadId) {
      handleNewThread();
    }
  }, [memory?.result]);

  const handleNewThread = () => {
    setIsNewThread(true);
    const newThreadId = crypto.randomUUID();
    setSelectedThreadId(newThreadId);
  };

  const handleSelectThread = (threadId: string) => {
    setIsNewThread(false);
    setSelectedThreadId(threadId);
  };

  const handleDeleteThread = async (threadId: string) => {
    await deleteThread({ threadId, agentId });
    if (threadId === selectedThreadId) {
      handleNewThread();
    }
  };

  const handleRefreshThreadList = () => {
    setIsNewThread(false);
    refreshThreads();
  };

  if (isAgentLoading) {
    return (
      <div className="flex h-full items-center justify-center">Loading...</div>
    );
  }

  const initialMessages = messagesData?.messages
    ? (toAISdkV5Messages(messagesData.messages) as MastraUIMessage[])
    : [];

  return (
    <div className="flex h-screen bg-background">
      {/* Thread List Sidebar */}
      <div className="w-64 shrink-0 border-r">
        <Sidebar
          threads={threads || []}
          isLoading={isThreadsLoading}
          threadId={selectedThreadId}
          onNewThread={handleNewThread}
          onSelectThread={handleSelectThread}
          onDeleteThread={handleDeleteThread}
        />
      </div>

      {/* Chat Area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <h1 className="text-2xl font-semibold">AI Assistant</h1>
          <p className="text-sm text-muted-foreground">
            Ask questions about stocks, sectors, documents, and market trends
          </p>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 overflow-hidden">
          {selectedThreadId && !isMessagesLoading ? (
            <AssistantProvider
              key={selectedThreadId}
              agentId={agentId}
              threadId={selectedThreadId}
              initialMessages={initialMessages}
              refreshThreadList={handleRefreshThreadList}
            >
              <Thread
                suggestions={suggestions}
                welcome="Ask about stocks, sectors, documents, and market trends"
              />
            </AssistantProvider>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              {isMessagesLoading
                ? "Loading conversation..."
                : "Select or create a conversation to start chatting"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SidebarProps {
  threads: StorageThreadType[];
  isLoading: boolean;
  threadId?: string;
  onNewThread: () => void;
  onSelectThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
}

function Sidebar({
  threads,
  isLoading,
  threadId,
  onNewThread,
  onSelectThread,
  onDeleteThread,
}: SidebarProps) {
  if (isLoading) {
    return <ThreadListSkeleton />;
  }

  return (
    <ol className="flex flex-col items-stretch gap-1.5 p-2">
      <li>
        <Button
          className="flex items-center justify-start gap-1 rounded-lg px-2.5 py-2 text-start hover:bg-muted data-active:bg-muted w-full"
          variant="outline"
          onClick={onNewThread}
        >
          <PlusIcon />
          New Thread
        </Button>
      </li>

      {threads.map((thread) => {
        const isActive = thread.id === threadId;

        return (
          <li key={thread.id} className="flex items-center gap-2 w-full">
            <Button
              className="rounded-lg px-2.5 py-2 justify-start hover:bg-muted data-active:bg-muted flex-1 min-w-0"
              variant="ghost"
              data-active={isActive ? true : undefined}
              onClick={() => onSelectThread(thread.id)}
            >
              <span className="truncate">{thread.title || "New Chat"}</span>
            </Button>
            <Button
              onClick={() => onDeleteThread(thread.id)}
              variant="outline"
              size="icon-sm"
              className="shrink-0"
            >
              <X aria-label="Delete Thread" />
            </Button>
          </li>
        );
      })}

      {threads.length === 0 && (
        <li className="p-4 text-center text-sm text-muted-foreground">
          No conversations yet
        </li>
      )}
    </ol>
  );
}
