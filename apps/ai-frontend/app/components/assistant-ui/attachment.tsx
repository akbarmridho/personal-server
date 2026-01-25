import {
  AttachmentPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
} from "@assistant-ui/react";
import {
  CircleXIcon,
  FileIcon,
  FileTextIcon,
  PaperclipIcon,
} from "lucide-react";
import type { FC } from "react";
import { memo } from "react";
import { TooltipIconButton } from "~/components/assistant-ui/tooltip-icon-button";

export function ComposerAddAttachment() {
  return (
    <ComposerPrimitive.AddAttachment asChild>
      <TooltipIconButton tooltip="Attach file" side="top">
        <PaperclipIcon />
      </TooltipIconButton>
    </ComposerPrimitive.AddAttachment>
  );
}

export function ComposerAttachments() {
  return (
    <div className="flex flex-wrap gap-2 px-3 pt-2">
      <AttachmentPrimitive.unstable_Thumb asChild>
        <AttachmentThumb />
      </AttachmentPrimitive.unstable_Thumb>
    </div>
  );
}

export function UserMessageAttachments() {
  return (
    <div className="col-span-full col-start-2 flex flex-wrap gap-2">
      <MessagePrimitive.Attachments
        components={{ Attachment: AttachmentThumb }}
      />
    </div>
  );
}

// The component receives attachment props from assistant-ui
const AttachmentThumbImpl: FC<any> = (props) => {
  const attachment = props.attachment || props;
  const isImage = attachment.type?.startsWith("image/");
  const isPDF = attachment.type === "application/pdf";
  const isText = attachment.type?.startsWith("text/");

  return (
    <div className="relative inline-flex max-w-48 overflow-hidden rounded-lg border">
      {isImage ? (
        <img
          src={attachment.content?.[0]?.image}
          alt={attachment.name ?? "Attachment"}
          className="size-24 object-cover"
        />
      ) : (
        <div className="flex size-24 flex-col items-center justify-center gap-1 bg-muted">
          {isPDF ? (
            <FileTextIcon className="size-6 text-muted-foreground" />
          ) : isText ? (
            <FileTextIcon className="size-6 text-muted-foreground" />
          ) : (
            <FileIcon className="size-6 text-muted-foreground" />
          )}
          <p className="text-muted-foreground text-xs">
            {attachment.type?.split("/")[1] || "file"}
          </p>
        </div>
      )}

      <AttachmentPrimitive.Remove asChild>
        <button
          type="button"
          className="absolute right-1 top-1 size-6 rounded-full bg-background/80 p-1 transition-colors hover:bg-background"
          aria-label="Remove attachment"
        >
          <CircleXIcon className="size-full" />
        </button>
      </AttachmentPrimitive.Remove>
    </div>
  );
};

const AttachmentThumb = memo(AttachmentThumbImpl);
