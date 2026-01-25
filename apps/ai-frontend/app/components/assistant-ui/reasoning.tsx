import { ChevronDownIcon } from "lucide-react";
import type { FC, ReactNode } from "react";
import { useState } from "react";
import { cn } from "~/lib/utils";

export function ReasoningGroup({ children }: { children?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-2 rounded-xl border p-4">
      {children}
    </div>
  );
}

// The component receives the full reasoning part from assistant-ui
export const Reasoning: FC<any> = (props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-4 rounded-xl border">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 p-4 text-left hover:bg-accent/50 transition-colors"
      >
        <ChevronDownIcon
          className={cn("size-4 transition-transform", isOpen && "rotate-180")}
        />
        <span className="font-medium">Reasoning</span>
      </button>

      {isOpen && (
        <div className="border-t p-4 whitespace-pre-wrap">
          {props.content && JSON.stringify(props.content, null, 2)}
        </div>
      )}
    </div>
  );
};
