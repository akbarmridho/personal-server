import { ArrowLeft, Edit, Save, Trash2, WrapText, X } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
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
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import {
  useDeleteDocument,
  useDocumentQuery,
  useUpdateDocument,
} from "~/hooks/use-document-query";
import type { InvestmentDocument } from "~/lib/api/types";
import { formatDate } from "~/lib/utils/date";

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [wrap, setWrap] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: document, isLoading, error } = useDocumentQuery(id!);
  const deleteMutation = useDeleteDocument();
  const updateMutation = useUpdateDocument();

  // Handle entering edit mode
  const handleEdit = () => {
    if (document) {
      setEditedContent(JSON.stringify(document.payload, null, 2));
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
  if (error || !document) {
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
            <Button asChild variant="outline">
              <Link to="/timeline/all">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Timeline
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const doc = document.payload;

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      {/* Header with actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link to={`/timeline/all${window.location.search}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
            </Button>
            <Badge variant="outline" className="uppercase">
              {doc.type}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {formatDate(doc.document_date)}
            </span>
          </div>
          <h1 className="text-3xl font-bold leading-tight">
            {doc.title || "Document Details"}
          </h1>
        </div>

        {/* Action buttons */}
        {!isEditing && (
          <div className="flex gap-2">
            <Button onClick={handleEdit} variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              onClick={() => setShowDeleteDialog(true)}
              variant="destructive"
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
              disabled={updateMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </div>

      {/* Metadata badges */}
      {(doc.symbols?.length ||
        doc.subsectors?.length ||
        doc.subindustries?.length) && (
        <div className="flex flex-wrap gap-2">
          {doc.symbols?.map((symbol) => (
            <Badge key={symbol} variant="secondary">
              {symbol}
            </Badge>
          ))}
          {doc.subsectors?.map((subsector) => (
            <Badge key={subsector} variant="outline">
              {subsector}
            </Badge>
          ))}
          {doc.subindustries?.map((subindustry) => (
            <Badge key={subindustry} variant="outline">
              {subindustry}
            </Badge>
          ))}
        </div>
      )}

      {/* Content/Editor */}
      <Card className="p-6">
        {!isEditing ? (
          // View mode: Display JSON with syntax highlighting
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Document Data</h2>
              <span className="text-sm text-muted-foreground">
                ID: {document.id}
              </span>
            </div>
            <pre className="p-4 rounded-md bg-muted overflow-x-auto text-sm font-mono">
              {JSON.stringify(doc, null, 2)}
            </pre>
          </div>
        ) : (
          // Edit mode: JSON editor
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
        )}
      </Card>

      {/* URLs section */}
      {doc.urls && doc.urls.length > 0 && !isEditing && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-3">Related URLs</h2>
          <ul className="space-y-2">
            {doc.urls.map((url, idx) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm break-all"
                >
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Source section */}
      {!isEditing && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-3">Source Information</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {Object.entries(doc.source).map(([key, value]) => (
              <div key={key}>
                <dt className="font-medium text-muted-foreground capitalize">
                  {key}
                </dt>
                <dd className="text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
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
    </div>
  );
}
