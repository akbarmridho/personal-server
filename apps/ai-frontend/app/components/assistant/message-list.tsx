import { MessagePrimitive, ThreadPrimitive } from "@assistant-ui/react";
import type { FC } from "react";
import { cn } from "~/lib/utils";
import { MarkdownContent } from "./markdown-content";

/**
 * User message component
 */
const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root asChild>
      <div className="mb-4 flex justify-end gap-3">
        <div className="rounded-lg px-4 py-2 max-w-[80%] bg-primary text-primary-foreground">
          <MessagePrimitive.Content />
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};

/**
 * Assistant message component
 */
const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root asChild>
      <div className="mb-4 flex justify-start gap-3">
        <div className="rounded-lg px-4 py-2 max-w-[80%] bg-muted">
          <MessagePrimitive.Parts
            components={{
              Text: MarkdownContent,
            }}
          />
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};

/**
 * Edit composer component (shown when editing messages)
 */
const EditComposer: FC = () => {
  return null; // Simple implementation for now
};

/**
 * Displays the list of messages in the chat thread
 * Shows user messages on the right, assistant messages on the left
 */
export function MessageList() {
  return (
    <>
      <ThreadPrimitive.Empty>
        <div className="flex h-full items-center justify-center text-center">
          <div className="max-w-md space-y-2">
            <p className="text-lg font-semibold">Start a conversation</p>
            <p className="text-sm text-muted-foreground">
              Ask questions about stocks, sectors, documents, and market trends
            </p>
          </div>
        </div>
      </ThreadPrimitive.Empty>

      <ThreadPrimitive.Messages
        components={{
          UserMessage,
          EditComposer,
          AssistantMessage,
        }}
      />
    </>
  );
}
