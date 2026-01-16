import { ArrowLeft, Edit, Save, Trash2, WrapText, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ScrollToTopButton } from "~/components/scroll-to-top-button";
import { TimelineItem } from "~/components/timeline/timeline-item";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import { useProfile } from "~/contexts/profile-context";
import {
  useDeleteDocument,
  useDocumentQuery,
  useUpdateDocument,
} from "~/hooks/use-document-query";
import {
  useMarkAsRead,
  useMarkAsUnread,
  useReadArticles,
} from "~/hooks/use-read-articles";
import type { InvestmentDocument } from "~/lib/api/types";

/**
 * Generate a title from content when title is missing
 */
function generateTitle(content: string): string {
  const firstSentence = content
    .match(/^.+?[.!?](?:\s|$)/)?.[0]
    ?.trim()
    .replace(/[.!?]$/, "");

  const first8Words = content.split(/\s+/).slice(0, 8).join(" ");

  // Use first 8 words if first sentence is too short (<= 3 words) or too long (> 15 words)
  if (firstSentence) {
    const wordCount = firstSentence.split(/\s+/).length;
    if (wordCount > 3 && wordCount <= 12) {
      return firstSentence;
    }
  }

  return first8Words || content.slice(0, 100);
}

/**
 * Static meta for initial page load (client-side will update with actual title)
 */
export function meta() {
  return [
    { title: "Document - Vibe Investing" },
    {
      name: "description",
      content: "View and edit investment document details",
    },
  ];
}

/**
 * Handle export for layout header title
 */
export const handle = {
  headerTitle: "Document",
};

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const handleBack = () => {
    // If we have history, go back (cleaner, preserves filters and scroll)
    // Otherwise fallback to main timeline
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/timeline/all");
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [wrap, setWrap] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: documentData, isLoading, error } = useDocumentQuery(id!);
  const deleteMutation = useDeleteDocument();
  const updateMutation = useUpdateDocument();

  // Golden article read tracking
  const { profile } = useProfile();
  const { data: readIds = [] } = useReadArticles(profile);
  const markAsRead = useMarkAsRead();
  const markAsUnread = useMarkAsUnread();

  // Determine if this is a golden article and its read status
  const isGoldenArticle =
    documentData?.payload.source?.platform === "golden-article" ||
    (typeof documentData?.payload.source === "object" &&
      Object.values(documentData.payload.source).some(
        (val) => typeof val === "string" && val.includes("golden-article"),
      ));
  const isRead = isGoldenArticle && id ? readIds.includes(id) : false;

  // Update document title when data loads
  useEffect(() => {
    if (documentData) {
      const docTitle =
        documentData.payload.title ||
        generateTitle(documentData.payload.content);
      document.title = `${docTitle} - Vibe Investing`;
    }
  }, [documentData]);

  // Handle entering edit mode
  const handleEdit = () => {
    if (documentData) {
      // Remove id field and sort properties with custom order
      const { id: _id, ...payload } = documentData.payload;

      // Define logical field ordering
      const fieldOrder = [
        "title",
        "type",
        "content",
        "document_date",
        "source",
        "urls",
        "symbols",
        "subsectors",
        "subindustries",
        "indices",
      ];

      const sortedPayload = fieldOrder.reduce(
        (acc, key) => {
          if (key in payload) {
            acc[key] = payload[key as keyof typeof payload];
          }
          return acc;
        },
        {} as Record<string, unknown>,
      );

      setEditedContent(JSON.stringify(sortedPayload, null, 2));
      setJsonError("");
      setIsEditing(true);
    }
  };

  // Handle canceling edit
  const handleCancel = () => {
    setIsEditing(false);
    setEditedContent("");
    setJsonError("");
  };

  // Handle saving changes
  const handleSave = () => {
    try {
      const parsed = JSON.parse(editedContent) as InvestmentDocument;

      // Validate required fields
      if (
        !parsed.type ||
        !parsed.content ||
        !parsed.document_date ||
        !parsed.source
      ) {
        setJsonError(
          "Missing required fields: type, content, document_date, source",
        );
        return;
      }

      // Remove the id field if present (we use the URL param)
      const { id: _id, ...payload } = parsed;

      // Call update mutation
      updateMutation.mutate(
        { id: id!, payload },
        {
          onSuccess: () => {
            setIsEditing(false);
            setEditedContent("");
            setJsonError("");
          },
          onError: (err) => {
            setJsonError(`Update failed: ${err.message}`);
          },
        },
      );
    } catch (err) {
      setJsonError(`Invalid JSON: ${(err as Error).message}`);
    }
  };

  // Handle delete confirmation
  const handleDelete = () => {
    deleteMutation.mutate(id!);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container max-w-5xl py-8">
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
      <div className="container max-w-5xl py-8">
        <Card className="p-6">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-destructive">
              {error?.message === "Document not found"
                ? "Document Not Found"
                : "Error Loading Document"}
            </h2>
            <p className="text-muted-foreground">
              {error?.message ||
                "Unable to load the document. It may have been deleted."}
            </p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Timeline
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const doc = documentData.payload;

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between gap-4">
        <Button onClick={handleBack} variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Timeline
        </Button>

        {/* Action buttons */}
        {!isEditing && (
          <div className="flex gap-2">
            <Button onClick={handleEdit} variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              onClick={() => setShowDeleteDialog(true)}
              variant="outline"
              size="sm"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        )}

        {isEditing && (
          <div className="flex gap-2">
            <Button
              onClick={handleCancel}
              variant="outline"
              size="sm"
              disabled={updateMutation.isPending}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              size="sm"
              variant={"outline"}
              disabled={updateMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </div>

      {/* Content/Editor */}
      {!isEditing ? (
        // View mode: Use TimelineItem component
        <TimelineItem
          item={{ id: documentData.id, payload: doc }}
          defaultExpanded={true}
          isRead={isRead}
          onMarkRead={
            isGoldenArticle && profile
              ? (documentId) =>
                  markAsRead.mutate({ profileId: profile, documentId })
              : undefined
          }
          onMarkUnread={
            isGoldenArticle && profile
              ? (documentId) =>
                  markAsUnread.mutate({ profileId: profile, documentId })
              : undefined
          }
          isGoldenArticle={isGoldenArticle}
        />
      ) : (
        // Edit mode: JSON editor
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Edit Document JSON</h2>
              <Button variant="ghost" size="sm" onClick={() => setWrap(!wrap)}>
                <WrapText className="w-4 h-4 mr-2" />
                {wrap ? "No Wrap" : "Wrap"}
              </Button>
            </div>
            <Textarea
              value={editedContent}
              onChange={(e) => {
                setEditedContent(e.target.value);
                setJsonError(""); // Clear error when typing
              }}
              className="font-mono text-sm min-h-[500px] resize-y"
              style={{ whiteSpace: wrap ? "pre-wrap" : "pre" }}
              placeholder="Enter JSON document data..."
            />
            {jsonError && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {jsonError}
              </div>
            )}
            {updateMutation.isError && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                Update failed: {updateMutation.error.message}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot
              be undone.
              {doc.title && (
                <span className="block mt-2 font-medium text-foreground">
                  "{doc.title}"
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Scroll to top button */}
      <ScrollToTopButton />
    </div>
  );
}
