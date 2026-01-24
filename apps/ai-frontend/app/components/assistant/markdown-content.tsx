import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "~/lib/utils";

/**
 * Markdown renderer for assistant messages
 * Supports GitHub Flavored Markdown with syntax highlighting
 */
export function MarkdownContent() {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      components={{
        code: ({ className, children, ...props }) => (
          <code
            className={cn("rounded bg-muted px-1 py-0.5", className)}
            {...props}
          >
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="overflow-x-auto rounded-lg bg-muted p-4">
            {children}
          </pre>
        ),
        a: ({ href, children, ...props }) => (
          <a
            href={href}
            className="text-primary underline underline-offset-2 hover:text-primary/80"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          >
            {children}
          </a>
        ),
        ul: ({ children, ...props }) => (
          <ul className="ml-4 list-disc space-y-1" {...props}>
            {children}
          </ul>
        ),
        ol: ({ children, ...props }) => (
          <ol className="ml-4 list-decimal space-y-1" {...props}>
            {children}
          </ol>
        ),
        h1: ({ children, ...props }) => (
          <h1 className="text-2xl font-bold mt-4 mb-2" {...props}>
            {children}
          </h1>
        ),
        h2: ({ children, ...props }) => (
          <h2 className="text-xl font-bold mt-3 mb-2" {...props}>
            {children}
          </h2>
        ),
        h3: ({ children, ...props }) => (
          <h3 className="text-lg font-bold mt-2 mb-1" {...props}>
            {children}
          </h3>
        ),
      }}
    />
  );
}
