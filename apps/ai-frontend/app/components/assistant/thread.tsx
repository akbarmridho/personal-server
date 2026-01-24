import { ComposerPrimitive, ThreadPrimitive } from "@assistant-ui/react";
import type { FC } from "react";
import { Button } from "~/components/ui/button";
import { Composer } from "./composer";
import { MarkdownContent } from "./markdown-content";
import { MessageList } from "./message-list";

interface ThreadSuggestionsProps {
  suggestions?: {
    title: string;
    action: string;
  }[];
}

interface ThreadProps extends ThreadSuggestionsProps {
  welcome: string;
}

export function Thread({ suggestions, welcome }: ThreadProps) {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col">
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto p-4">
        <ThreadPrimitive.Empty>
          <ThreadWelcome suggestions={suggestions} welcome={welcome} />
        </ThreadPrimitive.Empty>

        <MessageList />
      </ThreadPrimitive.Viewport>

      <div className="border-t p-4">
        <Composer />
      </div>
    </ThreadPrimitive.Root>
  );
}

interface ThreadWelcomeProps extends ThreadSuggestionsProps {
  welcome: string;
}

const ThreadWelcome: FC<ThreadWelcomeProps> = ({ suggestions, welcome }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <h2 className="text-2xl font-semibold mb-2">Hello 👋🏻</h2>
      <p className="text-2xl text-muted-foreground/65 mb-8">{welcome}</p>
      {suggestions && <ThreadSuggestions suggestions={suggestions} />}
    </div>
  );
};

const ThreadSuggestions: FC<ThreadSuggestionsProps> = ({ suggestions }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-2xl">
      {suggestions?.map((suggestedAction, index) => (
        <ThreadPrimitive.Suggestion
          key={`suggested-action-${suggestedAction.title}-${index}`}
          prompt={suggestedAction.action}
          send
          asChild
        >
          <Button
            variant="ghost"
            className="h-auto flex-1 flex-wrap items-start justify-start gap-1 rounded-3xl border px-5 py-4 text-left text-sm"
            aria-label={suggestedAction.action}
          >
            <span className="font-medium">{suggestedAction.title}</span>
          </Button>
        </ThreadPrimitive.Suggestion>
      ))}
    </div>
  );
};
