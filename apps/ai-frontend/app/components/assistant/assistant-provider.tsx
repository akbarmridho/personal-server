import type { AppendMessage } from "@assistant-ui/react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import {
  type MastraUIMessage,
  toAssistantUIMessage,
  useChat,
} from "@mastra/react";
import type { ReactNode } from "react";
import { useRef } from "react";

interface AssistantProviderProps {
  children: ReactNode;
  agentId: string;
  threadId?: string;
  initialMessages?: MastraUIMessage[];
  refreshThreadList?: () => void;
}

/**
 * Provider component that sets up the assistant runtime with Mastra backend
 * Uses useExternalStoreRuntime and useChat from @mastra/react for proper thread management
 */
export function AssistantProvider({
  children,
  agentId,
  threadId,
  initialMessages,
  refreshThreadList,
}: AssistantProviderProps) {
  const {
    messages,
    sendMessage,
    cancelRun,
    isRunning: isRunningStream,
    setMessages,
  } = useChat({
    agentId,
    initializeMessages: () => initialMessages || [],
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const onNew = async (message: AppendMessage) => {
    if (message.content[0]?.type !== "text")
      throw new Error("Only text messages are supported");

    const input = message.content[0].text;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await sendMessage({
        message: input,
        mode: "stream",
        threadId,
        onChunk: async (chunk) => {
          if (chunk.type === "finish") {
            refreshThreadList?.();
          }
        },
        signal: controller.signal,
      });
    } catch (error: unknown) {
      console.error("Error occurred in AssistantProvider", error);

      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      setMessages((currentConversation) => [
        ...currentConversation,
        {
          role: "assistant",
          parts: [{ type: "text", text: `${error}` }],
        } as MastraUIMessage,
      ]);
    } finally {
      abortControllerRef.current = null;
    }
  };

  const onCancel = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      cancelRun?.();
    }
  };

  const messagesForRuntime = messages.map(toAssistantUIMessage);

  const runtime = useExternalStoreRuntime({
    isRunning: isRunningStream,
    messages: messagesForRuntime,
    convertMessage: (x) => x,
    onNew,
    onCancel,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
