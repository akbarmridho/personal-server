import { ComposerPrimitive, ThreadPrimitive } from "@assistant-ui/react";
import { ArrowUp, Square } from "lucide-react";
import { Button } from "~/components/ui/button";

/**
 * Input component for composing and sending messages
 * Uses shadcn/ui Button component
 */
export function Composer() {
  return (
    <ComposerPrimitive.Root className="relative flex w-full flex-col rounded-xl border border-input bg-background px-1 pt-2 shadow-sm transition-colors has-[textarea:focus-visible]:border-ring has-[textarea:focus-visible]:ring-2 has-[textarea:focus-visible]:ring-ring/20">
      <ComposerPrimitive.Input
        placeholder="Ask about stocks, sectors, or market trends..."
        className="mb-1 max-h-32 min-h-16 w-full resize-none bg-transparent px-3.5 pt-1.5 pb-3 text-base outline-none placeholder:text-muted-foreground"
        rows={1}
        autoFocus
      />
      <div className="relative mx-1 mt-2 mb-2 flex items-center justify-end">
        <ThreadPrimitive.If running={false}>
          <ComposerPrimitive.Send asChild>
            <Button
              type="submit"
              size="icon"
              className="size-8 rounded-full"
              aria-label="Send message"
            >
              <ArrowUp className="size-4" />
            </Button>
          </ComposerPrimitive.Send>
        </ThreadPrimitive.If>

        <ThreadPrimitive.If running>
          <ComposerPrimitive.Cancel asChild>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-8 rounded-full"
              aria-label="Stop generating"
            >
              <Square className="size-3.5 fill-current" />
            </Button>
          </ComposerPrimitive.Cancel>
        </ThreadPrimitive.If>
      </div>
    </ComposerPrimitive.Root>
  );
}
