import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "~/lib/utils";
import { MarkdownImage } from "./markdown-image";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Markdown content renderer with GitHub Flavored Markdown support
 */
export function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  const components: Components = {
    // Headings (H1 renders as H2 to not exceed timeline title size)
    h1: ({ children, ...props }) => (
      <h1
        className="text-lg font-bold mt-6 mb-3 text-foreground border-b border-border pb-2 text-balance leading-tight"
        {...props}
      >
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2
        className="text-lg font-bold mt-6 mb-3 text-foreground border-b border-border pb-2 text-balance leading-tight"
        {...props}
      >
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3
        className="text-base font-semibold mt-5 mb-2 text-foreground text-balance leading-snug"
        {...props}
      >
        {children}
      </h3>
    ),
    h4: ({ children, ...props }) => (
      <h4
        className="text-base font-semibold mt-4 mb-2 text-foreground text-balance"
        {...props}
      >
        {children}
      </h4>
    ),
    h5: ({ children, ...props }) => (
      <h5
        className="text-sm font-semibold mt-4 mb-2 text-foreground text-balance"
        {...props}
      >
        {children}
      </h5>
    ),
    h6: ({ children, ...props }) => (
      <h6
        className="text-sm font-semibold mt-3 mb-2 text-muted-foreground text-balance"
        {...props}
      >
        {children}
      </h6>
    ),

    // Paragraphs
    p: ({ children, ...props }) => (
      <p
        className="mb-3 leading-[1.7] text-foreground text-pretty font-normal"
        {...props}
      >
        {children}
      </p>
    ),

    // Lists
    ul: ({ children, ...props }) => (
      <ul className="list-disc list-outside ml-6 mb-4 space-y-2" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="list-decimal list-outside ml-6 mb-4 space-y-2" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li className="leading-[1.6] text-foreground mb-1" {...props}>
        {children}
      </li>
    ),

    // Links
    a: ({ href, children, ...props }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline hover:text-primary/80 font-medium"
        {...props}
      >
        {children}
      </a>
    ),

    // Code blocks
    code: ({ children, className, ...props }) => {
      const isInline = !className;
      return isInline ? (
        <code
          className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground border border-border"
          {...props}
        >
          {children}
        </code>
      ) : (
        <code
          className={`block bg-muted p-4 rounded-lg overflow-x-auto font-mono text-sm border border-border ${className}`}
          {...props}
        >
          {children}
        </code>
      );
    },
    pre: ({ children, ...props }) => (
      <pre className="mb-4 overflow-x-auto" {...props}>
        {children}
      </pre>
    ),

    // Blockquotes
    blockquote: ({ children, ...props }) => (
      <blockquote
        className="border-l-4 border-primary pl-4 my-4 italic text-muted-foreground"
        {...props}
      >
        {children}
      </blockquote>
    ),

    // Tables
    table: ({ children, ...props }) => (
      <div className="overflow-x-auto mb-4">
        <table
          className="min-w-full border-collapse border border-border"
          {...props}
        >
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }) => (
      <thead className="bg-muted" {...props}>
        {children}
      </thead>
    ),
    tbody: ({ children, ...props }) => <tbody {...props}>{children}</tbody>,
    tr: ({ children, ...props }) => (
      <tr className="border-b border-border hover:bg-muted/50" {...props}>
        {children}
      </tr>
    ),
    th: ({ children, ...props }) => (
      <th
        className="px-4 py-4 text-left font-semibold text-foreground border border-border bg-muted/30"
        {...props}
      >
        {children}
      </th>
    ),
    td: ({ children, ...props }) => {
      const isNumeric =
        typeof children === "string" &&
        /^[0-9$%+\-.,%]+$/.test(children.trim());

      return (
        <td
          className={cn(
            "px-4 py-4 text-foreground border border-border",
            isNumeric ? "text-right font-mono text-sm" : "text-left",
          )}
          {...props}
        >
          {children}
        </td>
      );
    },

    // Horizontal rule
    hr: ({ ...props }) => (
      <hr className="my-8 border-t border-border" {...props} />
    ),

    // Emphasis
    strong: ({ children, ...props }) => {
      // Check if children is "Why Now?" to apply extra emphasis
      const isWhyNow =
        typeof children === "string" &&
        (children.includes("Why Now?") || children.includes("Why now?"));

      return (
        <strong
          className={cn(
            "font-bold text-foreground",
            isWhyNow && "text-primary brightness-90",
          )}
          {...props}
        >
          {children}
        </strong>
      );
    },
    em: ({ children, ...props }) => (
      <em className="italic text-foreground/90 font-medium" {...props}>
        {children}
      </em>
    ),

    // Images
    img: ({ src, alt }) => <MarkdownImage src={src} alt={alt} />,
  };

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
