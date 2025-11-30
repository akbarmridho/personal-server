import { useChat } from "@ai-sdk/react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useAISDKRuntime,
} from "@assistant-ui/react-ai-sdk";
import { createFileRoute } from "@tanstack/react-router";
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadListSidebar } from "@/components/assistant-ui/threadlist-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const App = () => {
  const chat = useChat({
    // resume: true,
    transport: new AssistantChatTransport({
      api: "http://localhost:3010/api/chat",
    }),
  });
  // ignore due to vercel ai sdk v6 incompatibility (yet)
  const runtime = useAISDKRuntime(chat as any);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <SidebarProvider>
        <div className="flex h-dvh w-full">
          <ThreadListSidebar />
          <SidebarInset>
            <SidebarTrigger className="absolute top-4 left-4" />
            <Thread />
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AssistantRuntimeProvider>
  );
};

export const Route = createFileRoute("/")({
  component: App,
});
