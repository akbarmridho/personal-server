"use client";

import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

interface MarkdownImageProps {
  src?: string;
  alt?: string;
}

export function MarkdownImage({ src, alt }: MarkdownImageProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!src) return null;

  return (
    <>
      <img
        src={src}
        alt={alt || ""}
        className="max-w-full h-auto max-h-96 rounded-lg border border-border my-4 cursor-pointer hover:opacity-90 transition-opacity"
        loading="lazy"
        onClick={() => setIsOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
        role="button"
        tabIndex={0}
      />

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
      />
    </>
  );
}
