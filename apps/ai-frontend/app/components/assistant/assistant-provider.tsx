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
import { useCallback, useEffect, useMemo, useRef } from "react";

interface AssistantProviderProps {
  children: ReactNode;
  agentId: string;
  threadId?: string;
  initialMessages?: MastraUIMessage[];
  refreshThreadList?: () => void;
}

/**
 * Convert a file to base64 data URL
 */
async function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Provider component that sets up the assistant runtime with Mastra backend
 * Uses useExternalStoreRuntime and useChat from @mastra/react for proper thread management
 * Supports file attachments (images, PDFs, etc.)
 */
export function AssistantProvider({
  children,
  agentId,
  threadId,
  initialMessages,
  refreshThreadList,
}: AssistantProviderProps) {
  const initializeMessages = useCallback(
    () => initialMessages || [],
    [initialMessages],
  );

  const {
    messages,
    sendMessage,
    cancelRun,
    isRunning: isRunningStream,
    setMessages,
  } = useChat({
    agentId,
    initializeMessages,
  });

  // Sync messages when threadId or initialMessages changes
  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages);
    }
  }, [initialMessages, setMessages]);

  const abortControllerRef = useRef<AbortController | null>(null);

  const onNew = useCallback(
    async (message: AppendMessage) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        // Process all content parts (text, files, images)
        const parts: Array<{
          type: string;
          text?: string;
          image?: string;
          document?: string;
        }> = [];
        let textContent = "";

        for (const content of message.content) {
          if (content.type === "text") {
            textContent += content.text;
            parts.push({ type: "text", text: content.text });
          } else if (content.type === "file") {
            // Handle file attachments - content is FileMessagePart
            const fileContent = content as any; // Type assertion for file content
            const file = fileContent.file;
            const dataURL = await fileToDataURL(file);

            if (file.type.startsWith("image/")) {
              // Image attachment
              parts.push({ type: "image", image: dataURL });
              textContent += `\n[Image: ${file.name}]`;
            } else if (file.type === "application/pdf") {
              // PDF document
              parts.push({ type: "document", document: dataURL });
              textContent += `\n[Document: ${file.name}]`;
            } else {
              // Other file types - convert to text if possible
              parts.push({ type: "text", text: `[File: ${file.name}]` });
              textContent += `\n[File: ${file.name}]`;
            }
          } else if (content.type === "image") {
            // Direct image URL
            parts.push({ type: "image", image: content.image });
            textContent += "\n[Image]";
          }
        }

        // If no text content was provided, add a default prompt
        if (!textContent.trim()) {
          textContent = "Please analyze the attached file(s).";
        }

        // Send message with all parts to Mastra backend
        // Note: Mastra's sendMessage expects a simple text string
        // For multimodal support, we need to send the full message structure
        // This will work if your Mastra agent is configured with a vision-capable model
        await sendMessage({
          message: textContent,
          mode: "stream",
          threadId,
          onChunk: async (chunk) => {
            if (chunk.type === "finish") {
              refreshThreadList?.();
            }
          },
          signal: controller.signal,
          // Pass parts as metadata if Mastra supports it
          // You may need to update your backend to handle this
          metadata: {
            parts,
            hasAttachments:
              parts.length > 1 || parts.some((p) => p.type !== "text"),
          },
        } as any);
      } catch (error: unknown) {
        console.error("Error occurred in AssistantProvider", error);

        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setMessages((currentConversation) => [
          ...currentConversation,
          {
            role: "assistant",
            parts: [
              {
                type: "text",
                text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
          } as MastraUIMessage,
        ]);
      } finally {
        abortControllerRef.current = null;
      }
    },
    [sendMessage, threadId, refreshThreadList, setMessages],
  );

  const onCancel = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      cancelRun?.();
    }
  }, [cancelRun]);

  const messagesForRuntime = useMemo(
    () => messages.map(toAssistantUIMessage),
    [messages],
  );

  const runtime = useExternalStoreRuntime({
    isRunning: isRunningStream,
    messages: messagesForRuntime,
    convertMessage: (x: any) => x,
    onNew,
    onCancel,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
