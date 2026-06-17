"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ResizeAxis = "x" | "y";

interface UsePanelResizeOptions {
  axis: ResizeAxis;
  onResize: (delta: number) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
}

export const usePanelResize = ({
  axis,
  onResize,
  onResizeStart,
  onResizeEnd,
}: UsePanelResizeOptions) => {
  const [isResizing, setIsResizing] = useState(false);
  const pointerStartRef = useRef(0);

  const stopResize = useCallback(() => {
    setIsResizing(false);
    document.body.style.removeProperty("cursor");
    document.body.style.removeProperty("user-select");
    onResizeEnd?.();
  }, [onResizeEnd]);

  const handlePointerMove = useCallback(
    (event: MouseEvent) => {
      const current = axis === "x" ? event.clientX : event.clientY;
      const delta = current - pointerStartRef.current;
      pointerStartRef.current = current;
      onResize(delta);
    },
    [axis, onResize],
  );

  useEffect(() => {
    if (!isResizing) {
      return;
    }

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", stopResize);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", stopResize);
    };
  }, [handlePointerMove, isResizing, stopResize]);

  const startResize = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      pointerStartRef.current = axis === "x" ? event.clientX : event.clientY;
      setIsResizing(true);
      document.body.style.cursor = axis === "x" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
      onResizeStart?.();
    },
    [axis, onResizeStart],
  );

  return {
    isResizing,
    startResize,
  };
};
