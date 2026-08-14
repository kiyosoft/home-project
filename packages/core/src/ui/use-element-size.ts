import { useCallback, useRef, useState } from "react";

export interface ElementSize {
  width: number;
  height: number;
}

/**
 * Widgets are resized freely on the dashboard grid, so controls decide what to
 * show from their real box rather than the viewport.
 *
 * Measures through a ref callback rather than a mount effect, because a widget
 * waiting on its entity renders a placeholder first and only attaches the box
 * it wants measured on a later render.
 */
export function useElementSize<T extends HTMLElement>(): [
  (node: T | null) => void,
  ElementSize,
] {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });
  const observer = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: T | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!node || typeof ResizeObserver === "undefined") return;

    const next = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box) return;
      setSize((prev) =>
        prev.width === box.width && prev.height === box.height
          ? prev
          : { width: box.width, height: box.height },
      );
    });
    next.observe(node);
    observer.current = next;
  }, []);

  return [ref, size];
}
