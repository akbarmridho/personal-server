import { ThreadPrimitive } from "@assistant-ui/react";
import { Composer } from "./composer";
import { MessageList } from "./message-list";

interface ThreadProps {
  threadId?: string;
}

/**
 * Main thread component that displays the chat interface
 * Shows message list and composer input
 */
export function Thread({ threadId }: ThreadProps) {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col">
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto p-4">
        <MessageList />
      </ThreadPrimitive.Viewport>

      <div className="border-t p-4">
        <Composer />
      </div>
    </ThreadPrimitive.Root>
  );
}
