import type { FC } from "react";

// The component receives the full tool call part from assistant-ui
export const ToolFallback: FC<any> = (props) => {
  const part = props;

  return (
    <div className="mb-4 flex flex-col gap-4 rounded-xl border bg-muted p-4">
      <div className="flex items-center gap-2">
        <p className="font-semibold">{part.toolName}</p>
        {part.argsText ? (
          <p className="text-muted-foreground text-xs">{part.argsText}</p>
        ) : null}
      </div>

      {part.result !== undefined && (
        <p className="whitespace-pre-wrap text-sm">
          {typeof part.result === "string"
            ? part.result
            : JSON.stringify(part.result, null, 2)}
        </p>
      )}
    </div>
  );
};
