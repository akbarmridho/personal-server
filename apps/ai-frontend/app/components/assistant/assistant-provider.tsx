import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import type { ReactNode } from "react";
import { useProfile } from "~/contexts/profile-context";
import { createMastraTransport } from "~/lib/assistant-transport";

interface AssistantProviderProps {
  children: ReactNode;
  threadId?: string;
}

/**
 * Provider component that sets up the assistant runtime with Mastra backend
 * Integrates with ProfileContext for personalized responses
 */
export function AssistantProvider({
  children,
  threadId,
}: AssistantProviderProps) {
  const { profile } = useProfile();
  const agentId = import.meta.env.VITE_DEFAULT_AGENT_ID;

  if (!agentId) {
    throw new Error(
      "VITE_DEFAULT_AGENT_ID is not defined in environment variables",
    );
  }

  // Create runtime with Mastra transport
  const runtime = useChatRuntime({
    transport: createMastraTransport(agentId),
    // threadId can be passed as additional config if needed
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
