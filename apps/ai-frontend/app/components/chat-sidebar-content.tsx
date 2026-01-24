import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router";
import { ThreadListSkeleton } from "~/components/assistant/thread-list-skeleton";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import { useChatState } from "~/contexts/chat-context";
import { useDeleteThread } from "~/hooks/use-delete-thread";
import { useMemory } from "~/hooks/use-memory";
import { useThreads } from "~/hooks/use-threads";

export function ChatSidebarContent() {
  const agentId = import.meta.env.VITE_DEFAULT_AGENT_ID;
  const { selectedThreadId, setSelectedThreadId, setIsNewThread } =
    useChatState();
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

  const handleNewThread = () => {
    setIsNewThread(true);
    const newThreadId = crypto.randomUUID();
    setSelectedThreadId(newThreadId);
  };

  const handleSelectThread = (threadId: string) => {
    setIsNewThread(false);
    setSelectedThreadId(threadId);
  };

  const handleDeleteThread = async (e: React.MouseEvent, threadId: string) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteThread({ threadId, agentId });
    if (threadId === selectedThreadId) {
      handleNewThread();
    }
    refreshThreads();
  };

  return (
    <>
      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/timeline/all">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to App</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Chat History</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleNewThread}
                className="w-full justify-start gap-2 border dashed border-muted-foreground/20 hover:border-muted-foreground/50 transition-colors"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
                <span>New Thread</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {isThreadsLoading ? (
              <div className="px-2 py-4">
                <ThreadListSkeleton />
              </div>
            ) : (
              threads?.map((thread) => (
                <SidebarMenuItem key={thread.id}>
                  <SidebarMenuButton
                    isActive={selectedThreadId === thread.id}
                    onClick={() => handleSelectThread(thread.id)}
                    tooltip={thread.title || "New Chat"}
                  >
                    <span className="truncate">
                      {thread.title || "New Chat"}
                    </span>
                  </SidebarMenuButton>
                  <SidebarMenuAction
                    onClick={(e) => handleDeleteThread(e, thread.id)}
                    showOnHover
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                  </SidebarMenuAction>
                </SidebarMenuItem>
              ))
            )}

            {!isThreadsLoading && (!threads || threads.length === 0) && (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                No conversations yet
              </div>
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );
}
