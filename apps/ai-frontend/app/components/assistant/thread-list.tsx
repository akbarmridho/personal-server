import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  useCreateThread,
  useDeleteThread,
  useThreads,
} from "~/hooks/use-threads";
import { cn } from "~/lib/utils";

interface ThreadListProps {
  agentId: string;
  selectedThreadId?: string;
  onThreadSelect: (threadId: string) => void;
}

/**
 * Thread list sidebar component
 * Shows all available conversation threads with ability to create/delete
 */
export function ThreadList({
  agentId,
  selectedThreadId,
  onThreadSelect,
}: ThreadListProps) {
  const { data: threads, isLoading } = useThreads(agentId);
  const createThread = useCreateThread(agentId);
  const deleteThread = useDeleteThread(agentId);

  const handleNewThread = async () => {
    const newThread = await createThread.mutateAsync();
    onThreadSelect(newThread.id);
  };

  const handleDeleteThread = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this conversation?")) {
      await deleteThread.mutateAsync(threadId);
      if (selectedThreadId === threadId) {
        onThreadSelect(""); // Deselect if deleting current thread
      }
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Loading threads...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col border-r">
      <div className="border-b p-3">
        <Button
          onClick={handleNewThread}
          className="w-full"
          variant="outline"
          size="sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {threads?.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => onThreadSelect(thread.id)}
              className={cn(
                "w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-left transition-colors hover:bg-accent",
                selectedThreadId === thread.id && "bg-accent",
              )}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {thread.title || "New Conversation"}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => handleDeleteThread(thread.id, e)}
                className="shrink-0 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </button>
          ))}

          {threads?.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No conversations yet
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
