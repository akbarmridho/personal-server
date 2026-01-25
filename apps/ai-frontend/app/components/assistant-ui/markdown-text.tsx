import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import type { FC } from "react";
import { SyntaxHighlighter } from "./shiki-highlighter";

// The component receives the full message part from assistant-ui
export const MarkdownText: FC<any> = (props) => {
  return (
    <MarkdownTextPrimitive
      {...props}
      components={{
        SyntaxHighlighter,
      }}
    />
  );
};
