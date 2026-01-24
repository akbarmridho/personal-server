import { MessageSquare, PlusIcon } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "~/components/ui/button";

export default function ChatPage() {
  const navigate = useNavigate();

  const handleNewThread = () => {
    // Generate a new thread ID and navigate immediately
    const newThreadId = crypto.randomUUID();
    navigate(`/chat/${newThreadId}`, {
      state: { isNewThread: true },
    });
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-background">
      <div className="flex-1 overflow-hidden flex justify-center">
        <div className="w-full max-w-4xl px-4">
          <div className="flex h-full flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold italic text-foreground/80">
              Vibe Chat Assistant
            </h2>
            <p className="text-muted-foreground max-w-sm">
              Ask me anything about stocks, technical indicators, or market
              sentiment. Select an existing thread or start a new one to begin.
            </p>
            <Button onClick={handleNewThread} className="mt-4">
              <PlusIcon className="mr-2 h-4 w-4" /> Start New Conversation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
