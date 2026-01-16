import { useEffect } from "react";
import { useParams } from "react-router";
import { TimelineItem } from "~/components/timeline/timeline-item";
import { useDocumentQuery } from "~/hooks/use-document-query";

/**
 * Static meta for initial page load (client-side will update with actual title)
 */
export function meta() {
  return [
    { title: "Document - Vibe Investing" },
    {
      name: "description",
      content: "View investment document details",
    },
  ];
}

/**
 * Embed-optimized document view for iframe embedding
 * - No sidebar or header
 * - Always expanded
 * - No share button
 * - Minimal container styling
 */
export default function EmbedDocumentDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: documentData, isLoading, error } = useDocumentQuery(id!);

  // Update document title when data loads
  useEffect(() => {
    if (documentData) {
      const docTitle =
        documentData.payload.title ||
        documentData.payload.content.slice(0, 100);
      document.title = `${docTitle} - Vibe Investing`;
    }
  }, [documentData]);

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !documentData) {
    return (
      <div className="p-4">
        <div className="text-center space-y-4 p-6 border rounded-lg">
          <h2 className="text-2xl font-bold text-destructive">
            {error?.message === "Document not found"
              ? "Document Not Found"
              : "Error Loading Document"}
          </h2>
          <p className="text-muted-foreground">
            {error?.message ||
              "Unable to load the document. It may have been deleted."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <TimelineItem
        item={{ id: documentData.id, payload: documentData.payload }}
        defaultExpanded={true}
        hideShareButton={true}
      />
    </div>
  );
}
