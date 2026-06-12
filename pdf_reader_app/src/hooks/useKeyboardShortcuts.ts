// src/hooks/useKeyboardShortcuts.ts

import { useEffect } from "react";

import { useViewerStore } from "../stores/viewerStore";

import { usePdfStore } from "../stores/pdfStore";

export function useKeyboardShortcuts() {
  const { nextPage, prevPage, zoomIn, zoomOut } = useViewerStore();

  const { totalPages } = usePdfStore();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) {
        return;
      }

      if (e.key === "ArrowRight") {
        nextPage(totalPages);
      } else if (e.key === "ArrowLeft") {
        prevPage();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+")) {
        e.preventDefault();

        zoomIn();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "-") {
        e.preventDefault();

        zoomOut();
      }
    };

    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [nextPage, prevPage, zoomIn, zoomOut, totalPages]);
}
