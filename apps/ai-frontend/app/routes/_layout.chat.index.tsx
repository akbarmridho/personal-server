import { useState } from "react";
import { AssistantProvider } from "~/components/assistant/assistant-provider";
import { Thread } from "~/components/assistant/thread";
import { ThreadList } from "~/components/assistant/thread-list";

/**
 * Main chat page with AI assistant
 * Provides full-page chat interface with thread management for investment-related questions
 */
export default function ChatPage() {
  const agentId = import.meta.env.VITE_DEFAULT_AGENT_ID;
  const [selectedThreadId, setSelectedThreadId] = useState<string>();

  return (
    <div className="flex h-screen bg-background">
      {/* Thread List Sidebar */}
      <div className="w-64 shrink-0">
        <ThreadList
          agentId={agentId}
          selectedThreadId={selectedThreadId}
          onThreadSelect={setSelectedThreadId}
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
          {selectedThreadId ? (
            <AssistantProvider
              key={selectedThreadId}
              threadId={selectedThreadId}
            >
              <Thread threadId={selectedThreadId} />
            </AssistantProvider>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Select or create a conversation to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
