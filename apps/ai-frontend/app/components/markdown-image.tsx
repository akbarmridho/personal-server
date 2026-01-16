"use client";

import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import { useTheme } from "~/hooks/use-theme";
import { cn } from "~/lib/utils";

interface MarkdownImageProps {
  src?: string;
  alt?: string;
}

export function MarkdownImage({ src, alt }: MarkdownImageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { effectiveTheme } = useTheme();

  if (!src) return null;

  // Check if the image is a PNG (case-insensitive)
  const isPng = src.toLowerCase().match(/\.png(\?|$)/);

  // Add white background for PNGs in dark mode
  const shouldAddWhiteBg = isPng && effectiveTheme === "dark";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="block border-0 bg-transparent p-0 m-0 cursor-pointer"
      >
        <img
          src={src}
          alt={alt || ""}
          className={cn(
            "max-w-full h-auto max-h-96 rounded-lg border border-border my-4 hover:opacity-90 transition-opacity",
            shouldAddWhiteBg && "bg-white p-2",
          )}
          loading="lazy"
        />
      </button>

      <Lightbox
        open={isOpen}
        close={() => setIsOpen(false)}
        slides={[{ src, alt }]}
        plugins={[Zoom]}
        zoom={{
          maxZoomPixelRatio: 3,
          zoomInMultiplier: 2,
          doubleTapDelay: 300,
          doubleClickDelay: 500,
          doubleClickMaxStops: 2,
          keyboardMoveDistance: 50,
          wheelZoomDistanceFactor: 100,
          pinchZoomDistanceFactor: 100,
          scrollToZoom: true,
        }}
        carousel={{
          finite: true,
        }}
        render={{
          buttonPrev: () => null,
          buttonNext: () => null,
        }}
        on={{
          click: () => setIsOpen(false),
        }}
      />
    </>
  );
}
