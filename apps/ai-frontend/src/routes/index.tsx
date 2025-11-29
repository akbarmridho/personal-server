import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useChatRuntime,
} from "@assistant-ui/react-ai-sdk";
import { createFileRoute } from "@tanstack/react-router";
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadList } from "@/components/assistant-ui/thread-list";

const App = () => {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: "http://localhost:3010/agents/weather",
    }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div>
        <ThreadList />
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
};

export const Route = createFileRoute("/")({
  component: App,
});
