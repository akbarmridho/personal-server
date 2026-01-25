import { ChevronDownIcon, LoaderIcon } from "lucide-react";
import type { FC, ReactNode } from "react";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { cn } from "~/lib/utils";

interface ToolGroupProps {
  children?: ReactNode;
  startIndex: number;
  endIndex: number;
  status?: {
    type: "running" | "complete" | "incomplete";
  };
}

export const ToolGroup: FC<ToolGroupProps> = ({ children, status }) => {
  const [isOpen, setIsOpen] = useState(false);
  const toolCount = Array.isArray(children) ? children.length : 1;
  const isRunning = status?.type === "running";

  return (
    <Collapsible
      open={isOpen || isRunning}
      onOpenChange={setIsOpen}
      className="my-2 rounded-lg border bg-muted/30"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          {isRunning && (
            <LoaderIcon className="size-4 animate-spin text-muted-foreground" />
          )}
          <span className="text-muted-foreground">
            {toolCount} {toolCount === 1 ? "tool" : "tools"} called
          </span>
        </div>
        <ChevronDownIcon
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            (isOpen || isRunning) && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t px-2 py-2">
        <div className="space-y-2">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
};
